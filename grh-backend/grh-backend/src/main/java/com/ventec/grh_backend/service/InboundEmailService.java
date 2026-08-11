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

    /**
     * Last IMAP UID we have seen. -1 = not yet initialized.
     * On the very first poll we advance the cursor to the current inbox max without
     * processing anything, so historical inbox messages are never touched.
     * On every subsequent poll only UID > lastUID (genuinely new) messages are fetched.
     */
    private volatile long lastUID = -1;

    private static final double CONFIDENCE_THRESHOLD = 0.65;

    private final JobPostingRepository       jobPostingRepository;
    private final CandidateRepository        candidateRepository;
    private final ApplicationRepository      applicationRepository;
    private final EmailCandidatureRepository emailCandidatureRepository;
    private final StorageService             storageService;
    private final AiServiceClient            aiServiceClient;
    private final FilterService              filterService;
    private final ObjectMapper               objectMapper;

    // ── IMAP polling ──────────────────────────────────────────────────────────

    @Scheduled(fixedDelayString = "${email.poll.interval-ms:30000}")
    public void pollInbox() {
        Store store = null;
        Folder inbox = null;
        try {
            Properties props = new Properties();
            props.put("mail.store.protocol", "imaps");
            props.put("mail.imaps.ssl.enable", "true");
            props.put("mail.imaps.connectiontimeout", "15000");
            props.put("mail.imaps.timeout", "15000");

            Session session = Session.getInstance(props);
            store = session.getStore("imaps");
            store.connect(imapHost, imapPort, imapUser, imapPassword);

            inbox = store.getFolder("INBOX");
            inbox.open(Folder.READ_ONLY);

            UIDFolder uidFolder = (UIDFolder) inbox;

            // First poll ever: initialize the cursor to the current inbox max and exit.
            // This skips all historical messages — only emails arriving after service
            // start will be processed.
            if (lastUID == -1) {
                Message[] all = inbox.getMessages();
                if (all.length > 0) {
                    lastUID = uidFolder.getUID(all[all.length - 1]);
                } else {
                    lastUID = 0;
                }
                log.info("[InboundEmail] UID cursor initialized at {} — {} historical message(s) skipped",
                        lastUID, all.length > 0 ? inbox.getMessageCount() : 0);
                return;
            }

            // Normal poll: fetch only messages whose UID is strictly greater than the cursor.
            Message[] newMessages = uidFolder.getMessagesByUID(lastUID + 1, UIDFolder.LASTUID);

            if (newMessages.length == 0) return;

            log.info("[InboundEmail] {} new message(s) (UID > {})", newMessages.length, lastUID);

            List<JobPosting> postings = jobPostingRepository
                    .findByStatus("PUBLISHED", Pageable.unpaged()).getContent();

            long maxUID = lastUID;
            for (Message message : newMessages) {
                long uid = uidFolder.getUID(message);
                maxUID = Math.max(maxUID, uid);
                try { processMessage(message, postings); }
                catch (Exception e) { log.warn("[InboundEmail] Error on message UID {}: {}", uid, e.getMessage()); }
            }

            // Advance cursor only after a successful poll
            lastUID = maxUID;

        } catch (Exception e) {
            log.warn("[InboundEmail] Poll error: {}", e.getMessage());
        } finally {
            if (inbox != null) { try { inbox.close(false); } catch (Exception ignored) {} }
            if (store  != null) { try { store.close();     } catch (Exception ignored) {} }
        }
    }

    // ── Per-message pipeline ──────────────────────────────────────────────────

    private static final List<String> NOREPLY_PATTERNS = List.of(
            "noreply", "no-reply", "no_reply", "donotreply",
            "mailer-daemon", "postmaster", "bounce@", "bounce+",
            // marketing / transactional subdomains — e.g. info@updates.invideo.io
            "@updates.", "@newsletter.", "@newsletters.", "@news.",
            "@email.", "@emails.", "@mail.", "@notifications.", "@notify.", "@alerts.",
            "@offers.", "@promo.", "@marketing.", "@campaign.", "@engage.",
            // known marketing domains
            "@facebookmail.com", "@instagram.com", "@mail.instagram.com",
            "@tiktok.com", "@reddit.com", "@canva.com", "@engage.canva.com",
            "@email.epidemicsound.com", "@mail.aliexpress.com", "@invideo.io"
    );

    private boolean isJobApplicationEmail(String senderEmail) {
        String emailLc = senderEmail.toLowerCase();
        for (String pattern : NOREPLY_PATTERNS) {
            if (emailLc.contains(pattern)) return false;
        }
        return true;
    }

    private void processMessage(Message message, List<JobPosting> postings) throws Exception {
        // Cheap dedup check before any AI work
        String[] msgIdHeader = message.getHeader("Message-ID");
        String messageId = (msgIdHeader != null && msgIdHeader.length > 0)
                ? msgIdHeader[0].trim() : null;

        if (messageId != null && emailCandidatureRepository.existsByMessageId(messageId)) {
            log.debug("[InboundEmail] Already processed Message-ID {} — skipping", messageId);
            return;
        }

        OffsetDateTime receivedAt = message.getReceivedDate() != null
                ? message.getReceivedDate().toInstant().atZone(ZoneId.systemDefault()).toOffsetDateTime()
                : OffsetDateTime.now();

        Address[] fromAddrs = message.getFrom();
        if (fromAddrs == null || fromAddrs.length == 0) return;
        InternetAddress from = (InternetAddress) fromAddrs[0];
        String senderEmail = from.getAddress();
        if (senderEmail == null || senderEmail.isBlank()) return;
        String senderName = from.getPersonal();

        String subject = message.getSubject();
        if (subject == null || subject.isBlank()) {
            saveRecord(senderEmail, senderName, "(sans objet)", "NO_SUBJECT", null,
                    null, null, null, null, receivedAt, messageId);
            return;
        }

        if (!isJobApplicationEmail(senderEmail)) {
            log.debug("[InboundEmail] Skipped automated email from <{}> '{}'", senderEmail, subject);
            return;
        }

        byte[] pdfBytes = extractFirstPdf(message);
        if (pdfBytes == null || pdfBytes.length == 0) {
            log.info("[InboundEmail] No PDF from <{}> '{}' — saved as NO_PDF", senderEmail, subject);
            saveRecord(senderEmail, senderName, subject, "NO_PDF", null,
                    null, null, null, null, receivedAt, messageId);
            return;
        }

        if (postings.isEmpty()) {
            log.debug("[InboundEmail] No published postings — skipping");
            return;
        }

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

        Map<?, ?> matchResult;
        try {
            matchResult = aiServiceClient.matchPosting(subject, postingInfos).block();
        } catch (Exception e) {
            log.warn("[InboundEmail] AI match error for '{}': {}", subject, e.getMessage());
            saveRecord(senderEmail, senderName, subject, "NO_MATCH", 0.0,
                    null, null, null, null, receivedAt, messageId);
            return;
        }

        if (matchResult == null) {
            saveRecord(senderEmail, senderName, subject, "NO_MATCH", 0.0,
                    null, null, null, null, receivedAt, messageId);
            return;
        }

        Object postingIdRaw  = matchResult.get("posting_id");
        Object confidenceRaw = matchResult.get("confidence");
        double confidence    = confidenceRaw instanceof Number n ? n.doubleValue() : 0.0;

        if (postingIdRaw == null || confidence < CONFIDENCE_THRESHOLD) {
            log.info("[InboundEmail] No confident match for '{}' (confidence={})", subject,
                    String.format("%.2f", confidence));
            saveRecord(senderEmail, senderName, subject, "NO_MATCH", confidence,
                    null, null, null, null, receivedAt, messageId);
            return;
        }

        UUID matchedId;
        try {
            matchedId = UUID.fromString(postingIdRaw.toString());
        } catch (Exception e) {
            log.warn("[InboundEmail] Invalid posting_id '{}' from AI", postingIdRaw);
            saveRecord(senderEmail, senderName, subject, "NO_MATCH", confidence,
                    null, null, null, null, receivedAt, messageId);
            return;
        }

        JobPosting posting = postings.stream()
                .filter(p -> p.getId().equals(matchedId))
                .findFirst().orElse(null);
        if (posting == null) return;

        log.info("[InboundEmail] Matched '{}' to '{}' (confidence={})",
                subject, posting.getTitle(), String.format("%.2f", confidence));

        String firstName = "Candidat";
        String lastName  = "Inconnu";
        if (senderName != null && !senderName.isBlank()) {
            String[] parts = senderName.trim().split("\\s+", 2);
            firstName = capitalize(parts[0]);
            if (parts.length > 1) lastName = capitalize(parts[1]);
        }

        String safeName   = senderEmail.replaceAll("[^a-zA-Z0-9._-]", "_");
        String cvFileName = "email_" + safeName + "_" + System.currentTimeMillis() + ".pdf";
        String cvPath     = storageService.storeBytes(pdfBytes, cvFileName, "cvs");

        String  skillsJson      = null;
        Integer experienceYears = null;
        String  education       = null;
        String  currentPosition = null;
        String  location        = null;
        String  cvExtractedText = null;
        String  cvEmail         = null;
        try {
            Map<?, ?> extracted = aiServiceClient.extractCvFullFromBytes(pdfBytes, cvFileName).block();
            if (extracted != null) {
                if (extracted.get("first_name") instanceof String fn && !fn.isBlank()) firstName = fn;
                if (extracted.get("last_name")  instanceof String ln && !ln.isBlank()) lastName  = ln;
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

        if (experienceYears != null && experienceYears > 0) {
            String posLc     = currentPosition != null ? currentPosition.toLowerCase() : "";
            String eduLc     = education       != null ? education.toLowerCase()       : "";
            String cvSnippet = cvExtractedText != null ? cvExtractedText.toLowerCase() : "";
            boolean looksLikeStudent =
                posLc.contains("stagiaire") || posLc.contains("stage") ||
                posLc.contains("etudiant")  || posLc.contains("student") ||
                posLc.contains("en formation") || posLc.contains("apprenti") ||
                (eduLc.contains("en cours") && cvSnippet.contains("stage")
                    && !cvSnippet.contains("cdi") && !cvSnippet.contains("cdd"));
            if (looksLikeStudent) {
                log.info("[InboundEmail] Student pattern detected — resetting experienceYears to 0");
                experienceYears = 0;
            }
        }

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

        Candidate candidate = candidateRepository.findByEmail(candidateEmail).orElseGet(() ->
                candidateRepository.save(Candidate.builder()
                        .firstName(fFirstName).lastName(fLastName).email(candidateEmail)
                        .cvPath(fCvPath).cvExtractedText(fCvExtractedText).skills(fSkills)
                        .experienceYears(fExp).education(fEdu).currentPosition(fPos).location(fLoc)
                        .build())
        );

        boolean dirty = false;
        if (candidate.getCvPath() == null) { candidate.setCvPath(fCvPath); dirty = true; }
        if (fCvExtractedText != null && !fCvExtractedText.equals(candidate.getCvExtractedText())) {
            candidate.setCvExtractedText(fCvExtractedText);
            candidate.setCvPath(fCvPath);
            if (fExp    != null) candidate.setExperienceYears(fExp);
            if (fSkills != null) candidate.setSkills(fSkills);
            if (fEdu    != null) candidate.setEducation(fEdu);
            if (fPos    != null) candidate.setCurrentPosition(fPos);
            if (fLoc    != null) candidate.setLocation(fLoc);
            dirty = true;
        }
        if (dirty) candidateRepository.save(candidate);

        String fullName = candidate.getFirstName() + " " + candidate.getLastName();

        if (applicationRepository.findByCandidateIdAndJobPostingId(
                candidate.getId(), posting.getId()).isPresent()) {
            log.info("[InboundEmail] Duplicate application from <{}> for '{}' — skipped",
                    candidateEmail, posting.getTitle());
            saveRecord(senderEmail, fullName, subject, "DUPLICATE", confidence,
                    posting.getId(), posting.getTitle(),
                    candidate.getId(), fullName, receivedAt, messageId);
            return;
        }

        applicationRepository.save(Application.builder()
                .candidate(candidate).jobPosting(posting).status("NEW").build());

        try {
            filterService.requestFilter(posting.getId(), null);
        } catch (Exception e) {
            log.warn("[InboundEmail] Filter trigger failed for posting {}: {}",
                    posting.getId(), e.getMessage());
        }

        saveRecord(senderEmail, fullName, subject, "MATCHED", confidence,
                posting.getId(), posting.getTitle(),
                candidate.getId(), fullName, receivedAt, messageId);

        log.info("[InboundEmail] Application created: {} <{}> to '{}' (confidence={})",
                fullName, senderEmail, posting.getTitle(), String.format("%.2f", confidence));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void saveRecord(String senderEmail, String senderName, String subject,
                            String status, Double confidence,
                            UUID postingId, String postingTitle,
                            UUID candidateId, String candidateName,
                            OffsetDateTime receivedAt, String messageId) {
        try {
            BigDecimal confDecimal = confidence != null
                    ? BigDecimal.valueOf(confidence).setScale(2, java.math.RoundingMode.HALF_UP)
                    : null;
            emailCandidatureRepository.save(EmailCandidature.builder()
                    .senderEmail(senderEmail).senderName(senderName).subject(subject)
                    .status(status).confidence(confDecimal)
                    .matchedPostingId(postingId).matchedPostingTitle(postingTitle)
                    .candidateId(candidateId).candidateName(candidateName)
                    .receivedAt(receivedAt).messageId(messageId)
                    .build());
        } catch (Exception e) {
            log.warn("[InboundEmail] Failed to save email candidature record: {}", e.getMessage());
        }
    }

    private byte[] extractFirstPdf(Message message) throws Exception {
        Object content = message.getContent();
        if (content instanceof MimeMultipart mp) return extractPdfFromMultipart(mp);
        return null;
    }

    private byte[] extractPdfFromMultipart(MimeMultipart multipart) throws Exception {
        for (int i = 0; i < multipart.getCount(); i++) {
            BodyPart part = multipart.getBodyPart(i);
            String contentType = part.getContentType().toLowerCase();
            String disposition  = part.getDisposition();
            boolean isPdf = contentType.contains("pdf")
                    || (part.getFileName() != null && part.getFileName().toLowerCase().endsWith(".pdf"));
            boolean isAttachment = Part.ATTACHMENT.equalsIgnoreCase(disposition)
                    || Part.INLINE.equalsIgnoreCase(disposition);
            if (isPdf && isAttachment) return part.getInputStream().readAllBytes();
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
