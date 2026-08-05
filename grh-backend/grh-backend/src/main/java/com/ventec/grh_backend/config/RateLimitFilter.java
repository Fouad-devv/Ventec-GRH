package com.ventec.grh_backend.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate limiting strategy:
 *
 *  Authenticated users (JWT) — very permissive, HR must not be blocked:
 *    - Email sending    : 50 / hour   (prevents accidental or malicious email bombing)
 *    - Export / PDF     : 200 / hour  (document generation is CPU-heavy)
 *    - Everything else  : 2 000 / min (effectively unlimited for normal HR use)
 *
 *  Unauthenticated requests (IP only) — strict, no legitimate use case for high volume:
 *    - All requests     : 30 / min
 *
 *  Always exempt: OPTIONS, /api/callback/**, /actuator/**
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private final ConcurrentHashMap<String, Bucket> emailBuckets   = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Bucket> exportBuckets  = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Bucket> defaultBuckets = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Bucket> ipBuckets      = new ConcurrentHashMap<>();

    // ── bucket factories ───────────────────────────────────────────────────

    /** Email sending — 100 per hour, burst 20 */
    private Bucket newEmailBucket() {
        return Bucket.builder()
                .addLimit(Bandwidth.builder().capacity(20)
                        .refillGreedy(20, Duration.ofMinutes(10)).build())
                .addLimit(Bandwidth.builder().capacity(100)
                        .refillGreedy(100, Duration.ofHours(1)).build())
                .build();
    }

    /** Export / PDF / DOCX generation — 200 per hour, burst 20 */
    private Bucket newExportBucket() {
        return Bucket.builder()
                .addLimit(Bandwidth.builder().capacity(20)
                        .refillGreedy(20, Duration.ofMinutes(10)).build())
                .addLimit(Bandwidth.builder().capacity(200)
                        .refillGreedy(200, Duration.ofHours(1)).build())
                .build();
    }

    /** All other authenticated requests — 2 000 per minute (effectively unlimited for HR) */
    private Bucket newDefaultBucket() {
        return Bucket.builder()
                .addLimit(Bandwidth.builder().capacity(2000)
                        .refillGreedy(2000, Duration.ofMinutes(1)).build())
                .build();
    }

    /** Unauthenticated (IP-only) — 30 per minute */
    private Bucket newIpBucket() {
        return Bucket.builder()
                .addLimit(Bandwidth.builder().capacity(30)
                        .refillGreedy(30, Duration.ofMinutes(1)).build())
                .build();
    }

    // ── filter logic ───────────────────────────────────────────────────────

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path   = request.getRequestURI();
        String method = request.getMethod();
        return "OPTIONS".equalsIgnoreCase(method)
                || path.startsWith("/api/callback/")
                || path.startsWith("/actuator/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String key     = resolveKey(request);
        String path    = request.getRequestURI();
        boolean ipOnly = key.startsWith("ip:");

        Bucket bucket  = selectBucket(key, path, ipOnly);

        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (probe.isConsumed()) {
            response.setHeader("X-RateLimit-Remaining", String.valueOf(probe.getRemainingTokens()));
            chain.doFilter(request, response);
        } else {
            long retryAfter = Math.max(1, probe.getNanosToWaitForRefill() / 1_000_000_000);
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding(StandardCharsets.UTF_8.name());
            response.setHeader("Retry-After", String.valueOf(retryAfter));
            response.getWriter().write(
                    "{\"error\":\"Trop de requêtes. Veuillez patienter "
                    + retryAfter + " secondes avant de réessayer.\"}"
            );
        }
    }

    private Bucket selectBucket(String key, String path, boolean ipOnly) {
        if (ipOnly) {
            return ipBuckets.computeIfAbsent(key, k -> newIpBucket());
        }
        if (path.contains("/send-rejection-emails") || path.contains("/send-interview-notifications")) {
            return emailBuckets.computeIfAbsent(key, k -> newEmailBucket());
        }
        if (path.contains("/documents-list") || path.contains("/documents-list-pdf")
                || path.contains("/export") || path.contains("/fiche-fonction")) {
            return exportBuckets.computeIfAbsent(key, k -> newExportBucket());
        }
        return defaultBuckets.computeIfAbsent(key, k -> newDefaultBucket());
    }

    // ── key resolution ─────────────────────────────────────────────────────

    private String resolveKey(HttpServletRequest request) {
        String auth = request.getHeader("Authorization");
        if (auth != null && auth.startsWith("Bearer ")) {
            try {
                String token  = auth.substring(7);
                String[] parts = token.split("\\.");
                if (parts.length >= 2) {
                    String payload = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
                    int subStart   = payload.indexOf("\"sub\":\"");
                    if (subStart >= 0) {
                        subStart += 7;
                        int subEnd = payload.indexOf('"', subStart);
                        if (subEnd > subStart) {
                            return "user:" + payload.substring(subStart, subEnd);
                        }
                    }
                }
            } catch (Exception ignored) {
            }
        }
        String xff = request.getHeader("X-Forwarded-For");
        String ip  = xff != null ? xff.split(",")[0].trim() : request.getRemoteAddr();
        return "ip:" + ip;
    }
}
