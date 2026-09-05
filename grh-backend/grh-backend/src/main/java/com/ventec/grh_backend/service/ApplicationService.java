package com.ventec.grh_backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ventec.grh_backend.domain.Application;
import com.ventec.grh_backend.domain.DocumentChecklist;
import com.ventec.grh_backend.domain.User;
import com.ventec.grh_backend.DTO.request.UpdateApplicationStatusRequest;
import com.ventec.grh_backend.DTO.response.ApplicationResponse;
import com.ventec.grh_backend.exception.NotFoundException;
import com.ventec.grh_backend.domain.Interview;
import com.ventec.grh_backend.repository.ApplicationRepository;
import com.ventec.grh_backend.repository.CandidateRepository;
import com.ventec.grh_backend.repository.DocumentChecklistRepository;
import com.ventec.grh_backend.repository.InterviewRepository;
import com.ventec.grh_backend.repository.JobPostingRepository;
import com.ventec.grh_backend.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class ApplicationService {

    private final ApplicationRepository applicationRepository;
    private final UserRepository userRepository;
    private final DocumentChecklistRepository checklistRepository;
    private final CandidateRepository candidateRepository;
    private final JobPostingRepository jobPostingRepository;
    private final AiServiceClient aiServiceClient;
    private final MailService mailService;
    private final ObjectMapper objectMapper;
    private final InterviewRepository interviewRepository;
    private final InterviewService interviewService;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;

    private byte[] logoBytes;

    @PostConstruct
    void initLogo() {
        try {
            logoBytes = new ClassPathResource("images/ventec-logo.jpeg").getInputStream().readAllBytes();
        } catch (Exception e) {
            log.warn("Could not load Ventec logo: {}", e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public ApplicationResponse getApplication(UUID id) {
        return applicationRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new NotFoundException("Application not found: " + id));
    }

    @Transactional(readOnly = true)
    public List<ApplicationResponse> getApplicationsByPosting(UUID jobPostingId) {
        return applicationRepository.findByJobPostingIdOrderByAiScoreDesc(jobPostingId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<ApplicationResponse> getApplicationsByCandidate(UUID candidateId) {
        return applicationRepository.findByCandidateId(candidateId)
                .stream().map(this::toResponse).toList();
    }

    public void deleteApplication(UUID id) {
        if (!applicationRepository.existsById(id)) {
            throw new NotFoundException("Application not found: " + id);
        }
        applicationRepository.deleteById(id);
    }

    public ApplicationResponse updateStatus(UUID id, UpdateApplicationStatusRequest req, String keycloakId) {
        Application app = applicationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Application not found: " + id));
        String previousStatus = app.getStatus();
        app.setStatus(req.status());
        if (req.notes() != null) app.setNotes(req.notes());
        User updater = userRepository.findByKeycloakId(keycloakId).orElse(null);
        app.setUpdatedBy(updater);

        // Clear convocation flag BEFORE saving so the returned response already reflects the reset
        boolean movingToNewInterviewPhase =
                "INTERVIEW_TECH".equals(req.status()) && "INTERVIEW_RH".equals(previousStatus);
        if (movingToNewInterviewPhase) {
            app.setInterviewNotifiedAt(null);
        }

        ApplicationResponse saved = toResponse(applicationRepository.save(app));

        auditLogService.log("APPLICATION_STATUS_CHANGED", "APPLICATION", id.toString(),
                java.util.Map.of(
                        "candidateName", app.getCandidate().getFirstName() + " " + app.getCandidate().getLastName(),
                        "candidateId", app.getCandidate().getId().toString(),
                        "jobPostingTitle", app.getJobPosting().getTitle(),
                        "jobPostingId", app.getJobPosting().getId().toString(),
                        "oldStatus", previousStatus,
                        "newStatus", req.status()
                ));

        // Auto-generate document checklist when candidate is hired
        if ("HIRED".equals(req.status()) && !"HIRED".equals(previousStatus)) {
            triggerChecklistGeneration(app);
            // Complete any scheduled interview when candidate is hired
            try {
                interviewRepository.findByApplicationId(app.getId()).stream()
                        .filter(i -> "SCHEDULED".equals(i.getStatus()))
                        .forEach(i -> {
                            i.setStatus("COMPLETED");
                            interviewRepository.save(i);
                        });
            } catch (Exception e) {
                log.warn("Failed to complete interview for hired application {}: {}", id, e.getMessage());
            }
        }

        // Notify manager when candidate is shortlisted
        if ("SHORTLISTED".equals(req.status()) && !"SHORTLISTED".equals(previousStatus)) {
            notifyManagerShortlist(app);
        }

        // Complete the old RH interview when entering INTERVIEW_TECH phase
        if (movingToNewInterviewPhase) {
            try {
                interviewRepository.findByApplicationId(app.getId()).stream()
                        .filter(i -> "SCHEDULED".equals(i.getStatus()))
                        .forEach(i -> {
                            i.setStatus("COMPLETED");
                            interviewRepository.save(i);
                        });
            } catch (Exception e) {
                log.warn("Failed to complete interview on phase transition for application {}: {}", id, e.getMessage());
            }
        }

        // Complete any scheduled interview when candidate is rejected
        if ("REJECTED".equals(req.status()) && !"REJECTED".equals(previousStatus)) {
            try {
                interviewRepository.findByApplicationId(app.getId()).stream()
                        .filter(i -> "SCHEDULED".equals(i.getStatus()))
                        .forEach(i -> {
                            i.setStatus("COMPLETED");
                            interviewRepository.save(i);
                        });
            } catch (Exception e) {
                log.warn("Failed to complete interview for rejected application {}: {}", id, e.getMessage());
            }
        }

        return saved;
    }

    @Async
    public void triggerChecklistGeneration(Application app) {
        try {
            // Re-fetch from DB to avoid Hibernate lazy-proxy returning null fields
            var posting = jobPostingRepository.findById(app.getJobPosting().getId())
                    .orElseThrow(() -> new NotFoundException("JobPosting not found"));
            var candidate = candidateRepository.findById(app.getCandidate().getId())
                    .orElseThrow(() -> new NotFoundException("Candidate not found"));

            String candidateName    = candidate.getFirstName() + " " + candidate.getLastName();
            String candidateProfile = deriveProfile(candidate);

            log.info("Checklist generation — candidate='{}' profile='{}'", candidateName, candidateProfile);

            Map result = aiServiceClient.generateChecklist(
                    posting.getTitle(), posting.getContractType(),
                    posting.getDepartment(), candidateName, candidateProfile
            ).block();

            if (result == null || !result.containsKey("documents")) return;

            // FastAPI returns [{name, copies, observation}] — add tracking fields
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> rawDocs = (List<Map<String, Object>>) result.get("documents");
            List<Map<String, Object>> checklistItems = new ArrayList<>(rawDocs.stream()
                    .filter(doc -> !isExcludedDocument(String.valueOf(doc.getOrDefault("name", ""))))
                    .filter(doc -> !isProfileConflict(String.valueOf(doc.getOrDefault("name", "")), candidateProfile))
                    .map(doc -> {
                        Map<String, Object> m = new java.util.HashMap<>(doc);
                        m.putIfAbsent("required", true);
                        m.putIfAbsent("received", false);
                        return m;
                    })
                    .toList());

            // Fixed rows appended for every candidate regardless of post or profile
            Map<String, Object> bulletinDoc = new java.util.HashMap<>();
            bulletinDoc.put("name", "Remplir le bulletin d'adhésion à l'Assurance et la Fiche Administrative (jour de l'intégration)");
            bulletinDoc.put("required", true);
            bulletinDoc.put("received", false);
            checklistItems.add(bulletinDoc);

            Map<String, Object> contratDoc = new java.util.HashMap<>();
            contratDoc.put("name", "Contrat de travail");
            contratDoc.put("copies", 2);
            contratDoc.put("required", true);
            contratDoc.put("received", false);
            checklistItems.add(contratDoc);

            String documentsJson = objectMapper.writeValueAsString(checklistItems);

            var checklist = checklistRepository
                    .findByCandidateIdAndJobPostingId(candidate.getId(), posting.getId())
                    .orElseGet(() -> DocumentChecklist.builder()
                            .candidate(candidate)
                            .jobPosting(posting)
                            .documents("[]")
                            .build());
            checklist.setDocuments(documentsJson);
            checklistRepository.save(checklist);
        } catch (Exception e) {
            log.warn("Auto-checklist generation failed for application {}: {}", app.getId(), e.getMessage());
        }
    }

    private static final java.util.List<String> EXCLUDED_DOC_PATTERNS = java.util.List.of(
            "bulletin d'adhésion",
            "bulletin adhesion",
            "fiche administrative",
            "contrat de travail"
    );

    private boolean isExcludedDocument(String name) {
        String lower = name.toLowerCase();
        return EXCLUDED_DOC_PATTERNS.stream().anyMatch(lower::contains);
    }

    /**
     * Drops profile-incompatible documents regardless of what the AI returned.
     *   expérimenté → keep "certificat de travail", drop "attestation de stage"
     *   stagiaire / débutant → keep "attestation de stage", drop "certificat de travail"
     */
    private boolean isProfileConflict(String name, String profile) {
        String lower = name.toLowerCase();
        // Match both singular "attestation de stage" and plural "attestations de stage"
        boolean isStageDoc      = lower.contains("attestation") && lower.contains("stage");
        boolean isCertifTravail = lower.contains("certificat de travail");
        if ("expérimenté".equals(profile) && isStageDoc)      return true;
        if (!"expérimenté".equals(profile) && isCertifTravail) return true;
        return false;
    }

    /**
     * Derives the candidate professional profile from CV data.
     *   expérimenté — has real job history (experienceYears > 0)
     *   stagiaire   — only internship experience (experienceYears == 0 but stage keywords in position)
     *   débutant    — fresh graduate, no professional experience at all
     */
    private String deriveProfile(com.ventec.grh_backend.domain.Candidate candidate) {
        Integer exp = candidate.getExperienceYears();
        if (exp != null && exp > 0) return "expérimenté";

        String pos = candidate.getCurrentPosition();
        if (pos != null) {
            String posLc = pos.toLowerCase();
            if (posLc.contains("stage") || posLc.contains("stagiaire") ||
                posLc.contains("intern") || posLc.contains("apprenti")) {
                return "stagiaire";
            }
        }
        return "débutant";
    }

    private void notifyManagerShortlist(Application app) {
        try {
            var posting = app.getJobPosting();
            var creator = posting.getCreatedBy();
            if (creator == null || creator.getEmail() == null) return;

            String candidate = app.getCandidate().getFirstName() + " " + app.getCandidate().getLastName();
            String subject = "Candidat sélectionné : " + posting.getTitle();
            String body = String.format(
                    "Bonjour,\n\nLe candidat %s a été ajouté à la shortlist pour le poste \"%s\".\n\nMerci de consulter le pipeline de recrutement pour la suite du processus.\n\nCordialement,\nVentec GRH",
                    candidate, posting.getTitle()
            );
            mailService.sendSimple(creator.getEmail(), subject, body);
        } catch (Exception e) {
            log.warn("Manager notification failed for application {}: {}", app.getId(), e.getMessage());
        }
    }

    public Map<String, Object> sendRejectionEmails(UUID jobPostingId, String keycloakId) {
        List<Application> toNotify = applicationRepository.findUnnotifiedRejectedByPostingId(jobPostingId);
        int sent = 0;
        List<String> noEmailCandidates = new ArrayList<>();
        String postingTitle = null;
        for (Application app : toNotify) {
            var candidate = app.getCandidate();
            if (candidate.getEmail() == null || candidate.getEmail().isBlank()) {
                noEmailCandidates.add(candidate.getFirstName() + " " + candidate.getLastName());
                continue;
            }
            postingTitle = app.getJobPosting().getTitle();
            String firstName = candidate.getFirstName() != null ? candidate.getFirstName() : "";
            String lastName  = candidate.getLastName()  != null ? candidate.getLastName()  : "";
            String html = buildRejectionEmailHtml(firstName, lastName, postingTitle);
            if (logoBytes != null) {
                mailService.sendHtmlWithInline(candidate.getEmail(),
                        "Réponse à votre candidature — " + postingTitle,
                        html, "ventec-logo", logoBytes, "image/jpeg");
            } else {
                mailService.sendHtml(candidate.getEmail(),
                        "Réponse à votre candidature — " + postingTitle, html);
            }
            app.setRejectionEmailSentAt(java.time.OffsetDateTime.now());
            applicationRepository.save(app);
            sent++;
        }
        if (sent > 0) {
            auditLogService.log("REJECTION_EMAILS_SENT", "JOB_POSTING", jobPostingId.toString(),
                    java.util.Map.of("count", sent, "jobPostingTitle", postingTitle != null ? postingTitle : ""));
            try {
                User actor = userRepository.findByKeycloakId(keycloakId).orElse(null);
                if (actor != null) {
                    String title = sent + " email" + (sent > 1 ? "s" : "") + " de refus envoyé" + (sent > 1 ? "s" : "");
                    notificationService.createInternal(actor, "EMAIL_SENT", title,
                            "Offre : " + postingTitle, "JOB_POSTING", jobPostingId);
                }
            } catch (Exception e) {
                log.warn("Failed to create rejection notification: {}", e.getMessage());
            }
        }
        Map<String, Object> result = new java.util.HashMap<>();
        result.put("sent", sent);
        result.put("noEmail", noEmailCandidates);
        return result;
    }

    private String buildRejectionEmailHtml(String firstName, String lastName, String postingTitle) {
        String logoHtml = logoBytes != null
                ? "<img src=\"cid:ventec-logo\" alt=\"Ventec\" style=\"height:48px;display:block;margin-bottom:8px;\">"
                : "<span style=\"font-size:20px;font-weight:700;color:#ffffff;\">Ventec</span>";
        return """
            <!DOCTYPE html>
            <html lang="fr">
            <head><meta charset="UTF-8"></head>
            <body style="margin:0;padding:0;background-color:#f4f6f9;font-family:Arial,sans-serif;">
              <table width="100%%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:40px 0;">
                <tr><td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                    <tr>
                      <td style="background:linear-gradient(135deg,#1e40af,#4f46e5);padding:32px 40px;">
                        %s
                        <p style="margin:4px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Ressources Humaines</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:36px 40px;">
                        <p style="margin:0 0 16px;font-size:15px;color:#1e293b;">Bonjour <strong>%s %s</strong>,</p>
                        <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
                          Nous avons bien reçu votre candidature pour le poste de
                          <strong style="color:#1e293b;">%s</strong> au sein de <strong style="color:#1e293b;">Ventec</strong>.
                        </p>
                        <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
                          Après examen attentif de votre dossier, nous avons le regret de vous informer que
                          votre candidature n'a pas été retenue pour la suite du processus de sélection.
                        </p>
                        <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
                          Cette décision ne remet pas en cause vos compétences et votre expérience,
                          mais s'est portée sur un profil correspondant plus précisément à nos besoins actuels.
                        </p>
                        <p style="margin:0 0 28px;font-size:15px;color:#475569;line-height:1.6;">
                          Nous vous remercions sincèrement de l'intérêt que vous portez à notre entreprise
                          et vous souhaitons plein succès dans vos prochaines démarches professionnelles.
                        </p>
                        <hr style="border:none;border-top:1px solid #e2e8f0;margin-bottom:24px;">
                        <p style="margin:0;font-size:14px;color:#64748b;">Cordialement,</p>
                        <p style="margin:4px 0 0;font-size:14px;font-weight:700;color:#1e293b;">L'équipe Ressources Humaines — Ventec</p>
                      </td>
                    </tr>
                  </table>
                </td></tr>
              </table>
            </body>
            </html>
            """.formatted(logoHtml, firstName, lastName, postingTitle);
    }

    public Map<String, Object> sendInterviewNotifications(UUID jobPostingId, String keycloakId) {
        List<Application> toNotify = applicationRepository.findUnnotifiedInterviewByPostingId(jobPostingId);
        int sent = 0;
        int noInterview = 0;
        List<String> noEmailCandidates = new ArrayList<>();
        String postingTitle = null;
        for (Application app : toNotify) {
            var candidate = app.getCandidate();
            if (candidate.getEmail() == null || candidate.getEmail().isBlank()) {
                noEmailCandidates.add(candidate.getFirstName() + " " + candidate.getLastName());
                continue;
            }
            Interview interview = interviewRepository.findByApplicationId(app.getId())
                    .stream()
                    .filter(i -> "SCHEDULED".equals(i.getStatus()))
                    .findFirst().orElse(null);
            if (interview == null) {
                noInterview++;
                continue;
            }
            postingTitle = app.getJobPosting().getTitle();
            String firstName = candidate.getFirstName() != null ? candidate.getFirstName() : "";
            String lastName  = candidate.getLastName()  != null ? candidate.getLastName()  : "";
            interviewService.sendConvocationEmail(candidate.getEmail(), firstName, lastName, postingTitle, interview);
            if ("INTERVIEW_TECH".equals(app.getStatus())
                    && interview.getResponsableEmail() != null && !interview.getResponsableEmail().isBlank()) {
                String responsableNom = interview.getResponsableNom() != null ? interview.getResponsableNom() : "Responsable";
                interviewService.sendResponsableEmail(interview.getResponsableEmail(), responsableNom,
                        firstName, lastName, postingTitle, interview, candidate.getCvPath());
            }
            app.setInterviewNotifiedAt(java.time.OffsetDateTime.now());
            applicationRepository.save(app);
            sent++;
        }
        if (sent > 0) {
            auditLogService.log("INTERVIEW_NOTIFICATIONS_SENT", "JOB_POSTING", jobPostingId.toString(),
                    java.util.Map.of("count", sent, "jobPostingTitle", postingTitle != null ? postingTitle : ""));
            try {
                User actor = userRepository.findByKeycloakId(keycloakId).orElse(null);
                if (actor != null) {
                    String title = sent + " convocation" + (sent > 1 ? "s" : "") + " envoyée" + (sent > 1 ? "s" : "");
                    notificationService.createInternal(actor, "EMAIL_SENT", title,
                            "Offre : " + postingTitle, "JOB_POSTING", jobPostingId);
                }
            } catch (Exception e) {
                log.warn("Failed to create interview notification: {}", e.getMessage());
            }
        }
        Map<String, Object> result = new java.util.HashMap<>();
        result.put("sent", sent);
        result.put("noInterview", noInterview);
        result.put("noEmail", noEmailCandidates);
        return result;
    }

    public ApplicationResponse toResponse(Application a) {
        Interview activeInterview = interviewRepository.findByApplicationId(a.getId())
                .stream()
                .filter(i -> "SCHEDULED".equals(i.getStatus()))
                .findFirst()
                .orElse(null);
        return new ApplicationResponse(
                a.getId(),
                a.getCandidate().getId(),
                a.getCandidate().getFirstName(),
                a.getCandidate().getLastName(),
                a.getCandidate().getEmail(),
                a.getJobPosting().getId(),
                a.getJobPosting().getTitle(),
                a.getStatus(),
                a.getAiScore(),
                a.getAiSummary(),
                a.getNotes(),
                a.getAppliedAt(),
                a.getUpdatedAt(),
                a.getRejectionEmailSentAt(),
                a.getInterviewNotifiedAt(),
                activeInterview != null ? activeInterview.getId()     : null,
                activeInterview != null ? activeInterview.getStatus() : null,
                a.getCandidate().getExperienceYears(),
                a.getCandidate().isContacted()
        );
    }
}
