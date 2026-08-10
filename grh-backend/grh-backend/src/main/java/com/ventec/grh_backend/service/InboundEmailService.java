package com.ventec.grh_backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ventec.grh_backend.domain.Application;
import com.ventec.grh_backend.domain.Candidate;
import com.ventec.grh_backend.domain.EmailCandidature;
import com.ventec.grh_backend.domain.JobPosting;
import com.ventec.grh_backend.repository.ApplicationRepository;
import com.ventec.grh_backend.repository.CandidateRepository;
import com.ventec.grh_backend.repository.EmailCandidatureRepository;
import com.ventec.grh_backend.repository.JobPostingRepository;
import jakarta.mail.*;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMultipart;
import jakarta.mail.search.FlagTerm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.*;

/**
 * Polls the configured Gmail inbox via IMAP and automatically creates
 * candidate + application records from inbound job-application emails.
 *
 * Activation: set EMAIL_POLL_ENABLED=true in .env (disabled by default).
 *
 * For every processed email a record is saved in the email_candidatures table
 * (status: MATCHED | DUPLICATE | NO_MATCH | NO_PDF) so HR can track what the
 * system received and acted on.
 */
@Service
@ConditionalOnProperty(name = "email.poll.enabled", havingValue = "true")
@RequiredArgsConstructor
@Slf4j
public class InboundEmailService {

    @Value("${imap.host}")
    private String imapHost;

    @Value("${imap.port}")
    private int imapPort;

    @Value("${imap.user}")
    private String imapUser;

    @Value("${imap.password}")
    private String imapPassword;

    private static final double CONFIDENCE_THRESHOLD = 0.65;

    private final JobPostingRepository       jobPostingRepository;
    private final CandidateRepository        candidateRepository;
    private final ApplicationRepository      applicationRepository;
    private final EmailCandidatureRepository emailCandidatureRepository;
    private final StorageService             storageService;
    private final AiServiceClient            aiServiceClient;
    private final FilterService              filterService;
    private final ObjectMapper               objectMapper;

    // ── Scheduled polling ────────────────────────────────────────────────────

    @Scheduled(fixedDelayString = "${email.poll.interval-ms:300000}")
    public void pollInbox() {
        if (imapUser == null || imapUser.isBlank()) {
            log.warn("[InboundEmail] IMAP_USER not configured — skipping poll");
            return;
        }

        List<JobPosting> postings = jobPostingRepository
                .findByStatus("PUBLISHED", Pageable.unpaged())
                .getContent();

        if (postings.isEmpty()) {
            log.debug("[InboundEmail] No published postings — skipping poll");
            return;
        }

        Properties props = new Properties();
        props.put("mail.store.protocol", "imaps");
        props.put("mail.imaps.ssl.enable", "true");
        props.put("mail.imaps.connectiontimeout", "15000");
        props.put("mail.imaps.timeout", "15000");

        Session session = Session.getInstance(props);
        try {
            Store store = session.getStore("imaps");
            store.connect(imapHost, imapPort, imapUser, imapPassword);
            try {
                Folder inbox = store.getFolder("INBOX");
                inbox.open(Folder.READ_WRITE);
                try {
                    Message[] messages = inbox.search(
                            new FlagTerm(new Flags(Flags.Flag.SEEN), false));
                    log.info("[InboundEmail] {} unseen message(s) to process", messages.length);
                    for (Message message : messages) {
                        try {
                            processMessage(message, postings);
                        } catch (Exception e) {
                            log.warn("[InboundEmail] Error on message: {}", e.getMessage());
                        }
                    }
                } finally {
                    inbox.close(false);
                }
            } finally {
                store.close();
            }
        } catch (Exception e) {
            log.error("[InboundEmail] IMAP connection failed: {}", e.getMessage());
        }
    }

    // ── Per-message pipeline ──────────────────────────────────────────────────

    private static final List<String> NOREPLY_PATTERNS = List.of(
            "noreply", "no-reply", "no_reply", "donotreply",
            "mailer-daemon", "postmaster", "bounce@", "bounce+",
            "@facebookmail.com", "@instagram.com", "@mail.instagram.com",
            "@tiktok.com", "@reddit.com", "@canva.com", "@engage.canva.com",
            "@email.epidemicsound.com", "@mail.aliexpress.com"
    );

    private boolean isJobApplicationEmail(String senderEmail) {
        String emailLc = senderEmail.toLowerCase();
        for (String pattern : NOREPLY_PATTERNS) {
            if (emailLc.contains(pattern)) return false;
        }
        return true;
    }

    private void processMessage(Message message, List<JobPosting> postings) throws Exception {
        String subject = message.getSubject();
        if (subject == null || subject.isBlank()) return;

        // Determine the email's actual received time
        OffsetDateTime receivedAt = message.getReceivedDate() != null
                ? message.getReceivedDate().toInstant().atZone(ZoneId.systemDefault()).toOffsetDateTime()
                : OffsetDateTime.now();

        // Extract sender
        Address[] fromAddrs = message.getFrom();
        if (fromAddrs == null || fromAddrs.length == 0) return;
        InternetAddress from = (InternetAddress) fromAddrs[0];
        String senderEmail = from.getAddress();
        if (senderEmail == null || senderEmail.isBlank()) return;
        String senderName = from.getPersonal();

        // Pre-filter: silently skip emails from known automated/no-reply senders
        if (!isJobApplicationEmail(senderEmail)) {
            log.debug("[InboundEmail] Skipped automated email from <{}> '{}'", senderEmail, subject);
            message.setFlag(Flags.Flag.SEEN, true);
            return;
        }

        // Require a PDF — no CV, no processing
        byte[] pdfBytes = extractFirstPdf(message);
        if (pdfBytes == null || pdfBytes.length == 0) {
            log.info("[InboundEmail] No PDF from <{}> '{}' — saved as NO_PDF", senderEmail, subject);
            saveRecord(senderEmail, senderName, subject, "NO_PDF", null,
                    null, null, null, null, receivedAt);
            message.setFlag(Flags.Flag.SEEN, true);
            return;
        }

        // Build compact posting list for AI matching
        List<Map<String, Object>> postingInfos = postings.stream().map(p -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", p.getId().toString());
            m.put("title", p.getTitle());
            if (p.getDepartment() != null) m.put("department", p.getDepartment());
            if (p.getDescription() != null) {
                String desc = p.getDescription();
                m.put("description", desc.length() > 300 ? desc.substring(0, 300) : desc);
            }
            return m;
        }).toList();

        // AI match: which posting does this subject correspond to?
        Map<?, ?> matchResult;
        try {
            matchResult = aiServiceClient.matchPosting(subject, postingInfos).block();
        } catch (Exception e) {
            log.warn("[InboundEmail] AI match error for '{}': {}", subject, e.getMessage());
            saveRecord(senderEmail, senderName, subject, "NO_MATCH", 0.0,
                    null, null, null, null, receivedAt);
            message.setFlag(Flags.Flag.SEEN, true);
            return;
        }

        if (matchResult == null) {
            saveRecord(senderEmail, senderName, subject, "NO_MATCH", 0.0,
                    null, null, null, null, receivedAt);
            message.setFlag(Flags.Flag.SEEN, true);
            return;
        }

        Object postingIdRaw  = matchResult.get("posting_id");
        Object confidenceRaw = matchResult.get("confidence");
        double confidence    = confidenceRaw instanceof Number n ? n.doubleValue() : 0.0;

        if (postingIdRaw == null || confidence < CONFIDENCE_THRESHOLD) {
            log.info("[InboundEmail] No confident match for '{}' (confidence={})", subject,
                    String.format("%.2f", confidence));
            saveRecord(senderEmail, senderName, subject, "NO_MATCH", confidence,
                    null, null, null, null, receivedAt);
            message.setFlag(Flags.Flag.SEEN, true);
            return;
        }

        UUID matchedId;
        try {
            matchedId = UUID.fromString(postingIdRaw.toString());
        } catch (Exception e) {
            log.warn("[InboundEmail] Invalid posting_id '{}' from AI", postingIdRaw);
            saveRecord(senderEmail, senderName, subject, "NO_MATCH", confidence,
                    null, null, null, null, receivedAt);
            message.setFlag(Flags.Flag.SEEN, true);
            return;
        }

        JobPosting posting = postings.stream()
                .filter(p -> p.getId().equals(matchedId))
                .findFirst().orElse(null);
        if (posting == null) return;

        log.info("[InboundEmail] Matched '{}' → '{}' (confidence={})",
                subject, posting.getTitle(), String.format("%.2f", confidence));

        // Default name from email display name — will be overridden by CV extraction
        String firstName = "Candidat";
        String lastName  = "Inconnu";
        if (senderName != null && !senderName.isBlank()) {
            String[] parts = senderName.trim().split("\\s+", 2);
            firstName = capitalize(parts[0]);
            if (parts.length > 1) lastName = capitalize(parts[1]);
        }

        // Persist CV file with a temp name based on sender (unique per email)
        String safeName   = senderEmail.replaceAll("[^a-zA-Z0-9._-]", "_");
        String cvFileName = "email_" + safeName + "_" + System.currentTimeMillis() + ".pdf";
        String cvPath     = storageService.storeBytes(pdfBytes, cvFileName, "cvs");

        // AI extraction of structured CV data (name, email, skills, etc. all come from the CV)
        String  skillsJson      = null;
        Integer experienceYears = null;
        String  education       = null;
        String  currentPosition = null;
        String  location        = null;
        String  cvExtractedText = null;
        String  cvEmail         = null;   // email address found inside the CV itself
        try {
            Map<?, ?> extracted = aiServiceClient.extractCvFullFromBytes(pdfBytes, cvFileName).block();
            if (extracted != null) {
                // Name always comes from the CV, not the email header
                if (extracted.get("first_name") instanceof String fn && !fn.isBlank()) firstName = fn;
                if (extracted.get("last_name")  instanceof String ln && !ln.isBlank()) lastName  = ln;
                // Email address written in the CV (identifies the actual candidate)
                if (extracted.get("email")        instanceof String em && !em.isBlank()) cvEmail  = em;
                if (extracted.get("skills") instanceof List<?> sl)
                    skillsJson = objectMapper.writeValueAsString(sl);
                if (extracted.get("experience_years") instanceof Number n) experienceYears = n.intValue();
                if (extracted.get("education")        instanceof String e)  education       = e;
                if (extracted.get("current_position") instanceof String cp) currentPosition = cp;
                if (extracted.get("location")         instanceof String loc) location        = loc;
                if (extracted.get("cv_text")          instanceof String ct && !ct.isBlank()) cvExtractedText = ct;
            }
        } catch (Exception e) {
            log.warn("[InboundEmail] CV extraction failed for <{}>: {}", senderEmail, e.getMessage());
        }

        // Guard: mirror the same student-detection logic used in PostingService.importCvs()
        // so that experienceYears is corrected the same way for both paths.
        if (experienceYears != null && experienceYears > 0) {
            String posLc = currentPosition != null ? currentPosition.toLowerCase() : "";
            String eduLc = education      != null ? education.toLowerCase()        : "";
            String cvSnippet = cvExtractedText != null ? cvExtractedText.toLowerCase() : "";
            boolean looksLikeStudent =
                posLc.contains("stagiaire") || posLc.contains("stage") ||
                posLc.contains("étudiant")  || posLc.contains("student") ||
                posLc.contains("en formation") || posLc.contains("apprenti") ||
                (eduLc.contains("en cours") && cvSnippet.contains("stage")
                    && !cvSnippet.contains("cdi") && !cvSnippet.contains("cdd"));
            if (looksLikeStudent) {
                log.info("[InboundEmail] Student pattern detected — resetting experienceYears to 0");
                experienceYears = 0;
            }
        }

        // Identity key: use the email found inside the CV if available,
        // otherwise fall back to the sender's email address.
        // This correctly handles the case where one Gmail account forwards
        // CVs of different people — each gets their own candidate record.
        final String  candidateEmail   = (cvEmail != null) ? cvEmail : senderEmail;
        final String  fFirstName       = firstName;
        final String  fLastName        = lastName;
        final String  fSkills          = skillsJson;
        final Integer fExp             = experienceYears;
        final String  fEdu             = education;
        final String  fPos             = currentPosition;
        final String  fLoc             = location;
        final String  fCvPath          = cvPath;
        final String  fCvExtractedText = cvExtractedText;

        log.info("[InboundEmail] Candidate identity resolved: CV email='{}', sender='{}'",
                cvEmail != null ? cvEmail : "(none — using sender)", senderEmail);

        // Find or create the Candidate by their own email (from CV, not email header)
        Candidate candidate = candidateRepository.findByEmail(candidateEmail).orElseGet(() ->
                candidateRepository.save(Candidate.builder()
                        .firstName(fFirstName)
                        .lastName(fLastName)
                        .email(candidateEmail)
                        .cvPath(fCvPath)
                        .cvExtractedText(fCvExtractedText)
                        .skills(fSkills)
                        .experienceYears(fExp)
                        .education(fEdu)
                        .currentPosition(fPos)
                        .location(fLoc)
                        .build())
        );

        // Always refresh CV text and ALL extracted fields so scorer uses the latest CV data.
        // This mirrors PostingService: whenever the raw text changes, we re-sync every field
        // derived from it (experience, skills, education, position, location).
        boolean dirty = false;
        if (candidate.getCvPath() == null) { candidate.setCvPath(fCvPath); dirty = true; }
        if (fCvExtractedText != null && !fCvExtractedText.equals(candidate.getCvExtractedText())) {
            candidate.setCvExtractedText(fCvExtractedText);
            candidate.setCvPath(fCvPath);
            if (fExp  != null) candidate.setExperienceYears(fExp);
            if (fSkills != null) candidate.setSkills(fSkills);
            if (fEdu  != null) candidate.setEducation(fEdu);
            if (fPos  != null) candidate.setCurrentPosition(fPos);
            if (fLoc  != null) candidate.setLocation(fLoc);
            dirty = true;
        }
        if (dirty) candidateRepository.save(candidate);

        String fullName = candidate.getFirstName() + " " + candidate.getLastName();

        // Guard: skip duplicate application for the same candidate + posting pair
        if (applicationRepository.findByCandidateIdAndJobPostingId(
                candidate.getId(), posting.getId()).isPresent()) {
            log.info("[InboundEmail] Duplicate from <{}> for '{}' — skipped",
                    candidateEmail, posting.getTitle());
            saveRecord(senderEmail, fullName, subject, "DUPLICATE", confidence,
                    posting.getId(), posting.getTitle(),
                    candidate.getId(), fullName, receivedAt);
            message.setFlag(Flags.Flag.SEEN, true);
            return;
        }

        // Create application
        applicationRepository.save(Application.builder()
                .candidate(candidate)
                .jobPosting(posting)
                .status("NEW")
                .build());

        // Trigger AI scoring for this posting
        try {
            filterService.requestFilter(posting.getId(), null);
        } catch (Exception e) {
            log.warn("[InboundEmail] Filter trigger failed for posting {}: {}",
                    posting.getId(), e.getMessage());
        }

        // Persist the email candidature record (senderEmail kept for audit trail)
        saveRecord(senderEmail, fullName, subject, "MATCHED", confidence,
                posting.getId(), posting.getTitle(),
                candidate.getId(), fullName, receivedAt);

        // Mark email as read
        message.setFlag(Flags.Flag.SEEN, true);

        log.info("[InboundEmail] Application created: {} <{}> → '{}' (confidence={})",
                fullName, senderEmail, posting.getTitle(), String.format("%.2f", confidence));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void saveRecord(String senderEmail, String senderName, String subject,
                            String status, Double confidence,
                            UUID postingId, String postingTitle,
                            UUID candidateId, String candidateName,
                            OffsetDateTime receivedAt) {
        try {
            BigDecimal confDecimal = confidence != null
                    ? BigDecimal.valueOf(confidence).setScale(2, java.math.RoundingMode.HALF_UP)
                    : null;
            emailCandidatureRepository.save(EmailCandidature.builder()
                    .senderEmail(senderEmail)
                    .senderName(senderName)
                    .subject(subject)
                    .status(status)
                    .confidence(confDecimal)
                    .matchedPostingId(postingId)
                    .matchedPostingTitle(postingTitle)
                    .candidateId(candidateId)
                    .candidateName(candidateName)
                    .receivedAt(receivedAt)
                    .build());
        } catch (Exception e) {
            log.warn("[InboundEmail] Failed to save email candidature record: {}", e.getMessage());
        }
    }

    private byte[] extractFirstPdf(Message message) throws Exception {
        Object content = message.getContent();
        if (content instanceof MimeMultipart mp) {
            return extractPdfFromMultipart(mp);
        }
        return null;
    }

    private byte[] extractPdfFromMultipart(MimeMultipart multipart) throws Exception {
        for (int i = 0; i < multipart.getCount(); i++) {
            BodyPart part = multipart.getBodyPart(i);
            String contentType = part.getContentType().toLowerCase();
            String disposition  = part.getDisposition();

            boolean isPdf = contentType.contains("pdf")
                    || (part.getFileName() != null
                        && part.getFileName().toLowerCase().endsWith(".pdf"));
            boolean isAttachment = Part.ATTACHMENT.equalsIgnoreCase(disposition)
                    || Part.INLINE.equalsIgnoreCase(disposition);

            if (isPdf && isAttachment) {
                return part.getInputStream().readAllBytes();
            }
            if (part.getContent() instanceof MimeMultipart nested) {
                byte[] pdf = extractPdfFromMultipart(nested);
                if (pdf != null) return pdf;
            }
        }
        return null;
    }

    private String capitalize(String s) {
        if (s == null || s.isBlank()) return s;
        return Character.toUpperCase(s.charAt(0)) + s.substring(1).toLowerCase();
    }
}
