package com.ventec.grh_backend.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
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

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private final ConcurrentHashMap<String, Bucket> aiBuckets = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Bucket> defaultBuckets = new ConcurrentHashMap<>();

    // AI scoring: 100 requests/minute per user
    private Bucket newAiBucket() {
        return Bucket.builder()
                .addLimit(Bandwidth.builder().capacity(100).refillGreedily(100, Duration.ofMinutes(1)).build())
                .build();
    }

    // Regular endpoints: 1 000 requests/minute — comfortable for active HR use
    private Bucket newDefaultBucket() {
        return Bucket.builder()
                .addLimit(Bandwidth.builder().capacity(1000).refillGreedily(1000, Duration.ofMinutes(1)).build())
                .build();
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        String method = request.getMethod();
        return "OPTIONS".equalsIgnoreCase(method)
                || path.startsWith("/api/callback/")
                || path.startsWith("/actuator/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String key = resolveKey(request);
        String path = request.getRequestURI();

        boolean isAiPath = path.startsWith("/api/filter") || path.startsWith("/api/ai");
        Bucket bucket = isAiPath
                ? aiBuckets.computeIfAbsent(key, k -> newAiBucket())
                : defaultBuckets.computeIfAbsent(key, k -> newDefaultBucket());

        if (bucket.tryConsume(1)) {
            chain.doFilter(request, response);
        } else {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding(StandardCharsets.UTF_8.name());
            response.getWriter().write("{\"error\":\"Trop de requêtes. Veuillez patienter avant de réessayer.\"}");
        }
    }

    private String resolveKey(HttpServletRequest request) {
        String auth = request.getHeader("Authorization");
        if (auth != null && auth.startsWith("Bearer ")) {
            try {
                String token = auth.substring(7);
                String[] parts = token.split("\\.");
                if (parts.length >= 2) {
                    String payload = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
                    int subStart = payload.indexOf("\"sub\":\"");
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
        String ip = request.getHeader("X-Forwarded-For");
        return "ip:" + (ip != null ? ip.split(",")[0].trim() : request.getRemoteAddr());
    }
}
