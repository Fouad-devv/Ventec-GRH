package com.ventec.grh_backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ventec.grh_backend.domain.Application;
import com.ventec.grh_backend.domain.Candidate;
import com.ventec.grh_backend.domain.Interview;
import com.ventec.grh_backend.domain.User;
import com.ventec.grh_backend.DTO.request.ScheduleInterviewRequest;
import com.ventec.grh_backend.DTO.request.UpdateInterviewRequest;
import com.ventec.grh_backend.DTO.response.InterviewResponse;
import com.ventec.grh_backend.exception.NotFoundException;
import com.ventec.grh_backend.repository.ApplicationRepository;
import com.ventec.grh_backend.repository.InterviewRepository;
import com.ventec.grh_backend.repository.UserRepository;
import com.ventec.grh_backend.service.AiServiceClient;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class InterviewService {

    private final InterviewRepository interviewRepository;
    private final ApplicationRepository applicationRepository;
    private final UserRepository userRepository;
    private final MailService mailService;
    private final AiServiceClient aiServiceClient;
    private final ObjectMapper objectMapper;

    private byte[] logoBytes;

    @PostConstruct
    void initLogo() {
        try {
            logoBytes = new ClassPathResource("images/ventec-logo.jpeg").getInputStream().readAllBytes();
        } catch (Exception e) {
            log.warn("Could not load Ventec logo: {}", e.getMessage());
        }
    }

    public InterviewResponse scheduleInterview(ScheduleInterviewRequest req, String keycloakId) {
        Application app = applicationRepository.findById(req.applicationId())
                .orElseThrow(() -> new NotFoundException("Application not found: " + req.applicationId()));
        User createdBy = userRepository.findByKeycloakId(keycloakId).orElse(null);

        String interviewerIdsJson = null;
        if (req.interviewerIds() != null) {
            try {
                interviewerIdsJson = objectMapper.writeValueAsString(req.interviewerIds());
            } catch (Exception e) {
                log.warn("Failed to serialize interviewer IDs: {}", e.getMessage());
            }
        }

        Interview interview = Interview.builder()
                .application(app)
                .scheduledAt(req.scheduledAt())
                .durationMinutes(req.durationMinutes() != null ? req.durationMinutes() : 60)
                .type(req.type())
                .locationOrLink(req.locationOrLink())
                .interviewerIds(interviewerIdsJson)
                .notes(req.notes())
                .responsableNom(req.responsableNom())
                .responsableEmail(req.responsableEmail())
                .status("SCHEDULED")
                .createdBy(createdBy)
                .build();

        interview = interviewRepository.save(interview);

        // Clear the notification stamp so the "Convoquer" button can send the convocation
        app.setInterviewNotifiedAt(null);
        applicationRepository.save(app);

        return toResponse(interview);
    }

    public InterviewResponse updateInterview(UUID id, UpdateInterviewRequest req) {
        Interview interview = interviewRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Interview not found: " + id));

        boolean scheduleChanged = false;
        if (req.scheduledAt() != null)     { interview.setScheduledAt(req.scheduledAt());         scheduleChanged = true; }
        if (req.durationMinutes() != null) { interview.setDurationMinutes(req.durationMinutes()); scheduleChanged = true; }
        if (req.type() != null)            { interview.setType(req.type());                       scheduleChanged = true; }
        if (req.locationOrLink() != null)  { interview.setLocationOrLink(req.locationOrLink());   scheduleChanged = true; }
        if (req.status() != null)         interview.setStatus(req.status());
        if (req.notes() != null)           interview.setNotes(req.notes());
        if (req.responsableNom() != null)   interview.setResponsableNom(req.responsableNom());
        if (req.responsableEmail() != null) interview.setResponsableEmail(req.responsableEmail());
        if (req.interviewerIds() != null) {
            try {
                interview.setInterviewerIds(objectMapper.writeValueAsString(req.interviewerIds()));
            } catch (Exception e) {
                log.warn("Failed to serialize interviewer IDs: {}", e.getMessage());
            }
        }

        InterviewResponse response = toResponse(interviewRepository.save(interview));

        // When scheduling details change, clear the notification stamp so the recruiter
        // must re-send the convocation with the updated information
        if (scheduleChanged) {
            Application app = interview.getApplication();
            if (app != null) {
                app.setInterviewNotifiedAt(null);
                applicationRepository.save(app);
            }
        }

        return response;
    }

    @Transactional(readOnly = true)
    public InterviewResponse getInterview(UUID id) {
        return interviewRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new NotFoundException("Interview not found: " + id));
    }

    @Transactional(readOnly = true)
    public List<InterviewResponse> getInterviewsByApplication(UUID applicationId) {
        return interviewRepository.findByApplicationId(applicationId)
                .stream().map(this::toResponse).toList();
    }

    public InterviewResponse generateAndStoreQuestions(UUID id) {
        Interview interview = interviewRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Interview not found: " + id));
        Application app = interview.getApplication();
        Candidate candidate = app != null ? app.getCandidate() : null;

        String jobTitle = app != null && app.getJobPosting() != null ? app.getJobPosting().getTitle() : "";
        String jobDesc  = app != null && app.getJobPosting() != null ? app.getJobPosting().getDescription() : null;
        String reqs     = app != null && app.getJobPosting() != null ? app.getJobPosting().getRequirements() : null;
        String skills   = candidate != null ? candidate.getSkills() : null;
        String position = candidate != null ? candidate.getCurrentPosition() : null;
        Integer expYears = candidate != null ? candidate.getExperienceYears() : null;

        Map result = aiServiceClient.generateInterviewQuestions(
                jobTitle, jobDesc, reqs, skills, position, expYears).block();

        if (result != null && result.containsKey("questions")) {
            try {
                String questionsJson = objectMapper.writeValueAsString(result.get("questions"));
                interview.setQuestions(questionsJson);
                interviewRepository.save(interview);
            } catch (Exception e) {
                log.warn("Failed to store questions JSON: {}", e.getMessage());
            }
        }
        return toResponse(interview);
    }

    public void sendConvocationEmail(String candidateEmail, String firstName, String lastName,
                                     String postingTitle, Interview interview) {
        String html = buildInterviewEmailHtml(firstName, lastName, postingTitle, interview);
        if (logoBytes != null) {
            mailService.sendHtmlWithInline(candidateEmail,
                    "Convocation à un entretien — " + postingTitle,
                    html, "ventec-logo", logoBytes, "image/jpeg");
        } else {
            mailService.sendHtml(candidateEmail,
                    "Convocation à un entretien — " + postingTitle, html);
        }
    }

    public InterviewResponse cancelInterview(UUID id) {
        Interview interview = interviewRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Interview not found: " + id));
        interview.setStatus("CANCELLED");
        return toResponse(interviewRepository.save(interview));
    }

    private String buildInterviewEmailHtml(String firstName, String lastName, String postingTitle, Interview interview) {
        String typeLabel = switch (interview.getType() != null ? interview.getType() : "") {
            case "VIDEO"   -> "Visioconférence";
            case "PHONE"   -> "Téléphone";
            case "ON_SITE" -> "Présentiel";
            default        -> interview.getType() != null ? interview.getType() : "—";
        };
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("EEEE dd MMMM yyyy 'à' HH'h'mm", java.util.Locale.FRENCH);
        String dateStr = interview.getScheduledAt() != null
                ? interview.getScheduledAt().atZoneSameInstant(ZoneId.systemDefault()).format(fmt)
                : "—";
        String location = interview.getLocationOrLink() != null && !interview.getLocationOrLink().isBlank()
                ? interview.getLocationOrLink() : "À préciser";
        boolean isLink = location.startsWith("http");

        String locationRow = isLink
                ? "<tr><td style='padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:14px;width:40%%'>Lien de connexion</td><td style='padding:10px 0;border-bottom:1px solid #e2e8f0;'><a href='%s' style='color:#4f46e5;font-weight:600;'>Rejoindre l'entretien</a></td></tr>".formatted(location)
                : "<tr><td style='padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:14px;width:40%%'>Lieu</td><td style='padding:10px 0;border-bottom:1px solid #e2e8f0;font-weight:600;color:#1e293b;'>%s</td></tr>".formatted(location);

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
                      <td style="background:linear-gradient(135deg,#1e40af,#4f46e5);padding:28px 40px;">
                        %s
                        <p style="margin:4px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Ressources Humaines</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:36px 40px;">
                        <p style="margin:0 0 16px;font-size:15px;color:#1e293b;">Bonjour <strong>%s %s</strong>,</p>
                        <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6;">
                          Suite à l'examen de votre candidature pour le poste de
                          <strong style="color:#1e293b;">%s</strong>, nous avons le plaisir de vous convoquer à un entretien.
                        </p>

                        <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
                          <h3 style="margin:0 0 16px;font-size:15px;color:#1e293b;">Détails de l'entretien</h3>
                          <table width="100%%" cellpadding="0" cellspacing="0">
                            <tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:14px;width:40%%">Date &amp; heure</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-weight:600;color:#1e293b;">%s</td></tr>
                            <tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:14px;">Durée</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-weight:600;color:#1e293b;">%d minutes</td></tr>
                            <tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:14px;">Format</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-weight:600;color:#1e293b;">%s</td></tr>
                            %s
                            <tr><td style="padding:10px 0;color:#64748b;font-size:14px;">Localisation du siège</td><td style="padding:10px 0;"><a href="https://maps.app.goo.gl/VoZT6bFXngyZgyXP9" style="color:#4f46e5;font-weight:600;">Voir sur Google Maps</a></td></tr>
                          </table>
                        </div>

                        <p style="margin:0 0 28px;font-size:15px;color:#475569;line-height:1.6;">
                          Merci de confirmer votre disponibilité en répondant à cet email.
                          En cas d'empêchement, veuillez nous contacter dans les meilleurs délais.
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
            """.formatted(logoHtml, firstName, lastName, postingTitle,
                dateStr, interview.getDurationMinutes(), typeLabel, locationRow);
    }

    public InterviewResponse toResponse(Interview i) {
        return new InterviewResponse(
                i.getId(),
                i.getApplication() != null ? i.getApplication().getId() : null,
                i.getScheduledAt(),
                i.getDurationMinutes(),
                i.getType(),
                i.getLocationOrLink(),
                i.getInterviewerIds(),
                i.getStatus(),
                i.getNotes(),
                i.getQuestions(),
                i.getCreatedAt(),
                i.getResponsableNom(),
                i.getResponsableEmail()
        );
    }
}
