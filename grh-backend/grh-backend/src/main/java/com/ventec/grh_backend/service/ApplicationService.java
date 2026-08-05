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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
        ApplicationResponse saved = toResponse(applicationRepository.save(app));

        // Auto-generate document checklist when candidate is hired
        if ("HIRED".equals(req.status()) && !"HIRED".equals(previousStatus)) {
            triggerChecklistGeneration(app);
        }

        // Notify manager when candidate is shortlisted
        if ("SHORTLISTED".equals(req.status()) && !"SHORTLISTED".equals(previousStatus)) {
            notifyManagerShortlist(app);
        }

        return saved;
    }

    private void triggerChecklistGeneration(Application app) {
        try {
            var posting   = app.getJobPosting();
            var candidate = app.getCandidate();
            String candidateName = candidate.getFirstName() + " " + candidate.getLastName();

            Map result = aiServiceClient.generateChecklist(
                    posting.getTitle(), posting.getContractType(),
                    posting.getDepartment(), candidateName
            ).block();

            if (result == null || !result.containsKey("documents")) return;

            // FastAPI now returns [{name, copies, observation}] — add tracking fields
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> rawDocs = (List<Map<String, Object>>) result.get("documents");
            List<Map<String, Object>> checklistItems = rawDocs.stream()
                    .map(doc -> {
                        Map<String, Object> m = new java.util.HashMap<>(doc);
                        m.putIfAbsent("required", true);
                        m.putIfAbsent("received", false);
                        return m;
                    })
                    .toList();
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

    public Map<String, Integer> sendRejectionEmails(UUID jobPostingId, String keycloakId) {
        List<Application> toNotify = applicationRepository.findUnnotifiedRejectedByPostingId(jobPostingId);
        int sent = 0;
        String postingTitle = null;
        for (Application app : toNotify) {
            var candidate = app.getCandidate();
            if (candidate.getEmail() == null || candidate.getEmail().isBlank()) continue;
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
        return Map.of("sent", sent);
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

    public Map<String, Integer> sendInterviewNotifications(UUID jobPostingId, String keycloakId) {
        List<Application> toNotify = applicationRepository.findUnnotifiedInterviewByPostingId(jobPostingId);
        int sent = 0;
        int noInterview = 0;
        String postingTitle = null;
        for (Application app : toNotify) {
            var candidate = app.getCandidate();
            if (candidate.getEmail() == null || candidate.getEmail().isBlank()) continue;
            Interview interview = interviewRepository.findByApplicationId(app.getId())
                    .stream()
                    .filter(i -> !"CANCELLED".equals(i.getStatus()))
                    .findFirst().orElse(null);
            if (interview == null) {
                noInterview++;
                continue;
            }
            postingTitle = app.getJobPosting().getTitle();
            String firstName = candidate.getFirstName() != null ? candidate.getFirstName() : "";
            String lastName  = candidate.getLastName()  != null ? candidate.getLastName()  : "";
            interviewService.sendConvocationEmail(candidate.getEmail(), firstName, lastName, postingTitle, interview);
            app.setInterviewNotifiedAt(java.time.OffsetDateTime.now());
            applicationRepository.save(app);
            sent++;
        }
        if (sent > 0) {
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
        return Map.of("sent", sent, "noInterview", noInterview);
    }

    public ApplicationResponse toResponse(Application a) {
        UUID scheduledInterviewId = interviewRepository.findByApplicationId(a.getId())
                .stream()
                .filter(i -> !"CANCELLED".equals(i.getStatus()))
                .findFirst()
                .map(i -> i.getId())
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
                scheduledInterviewId
        );
    }
}
