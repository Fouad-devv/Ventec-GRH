package com.ventec.grh_backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ventec.grh_backend.domain.Application;
import com.ventec.grh_backend.domain.Interview;
import com.ventec.grh_backend.domain.User;
import com.ventec.grh_backend.dto.request.ScheduleInterviewRequest;
import com.ventec.grh_backend.dto.request.UpdateInterviewRequest;
import com.ventec.grh_backend.dto.response.InterviewResponse;
import com.ventec.grh_backend.exception.NotFoundException;
import com.ventec.grh_backend.repository.ApplicationRepository;
import com.ventec.grh_backend.repository.InterviewRepository;
import com.ventec.grh_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
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
    private final ObjectMapper objectMapper;

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
                .status("SCHEDULED")
                .createdBy(createdBy)
                .build();

        interview = interviewRepository.save(interview);

        String candidateEmail = app.getCandidate().getEmail();
        if (candidateEmail != null) {
            String subject = "Convocation à un entretien - " + app.getJobPosting().getTitle();
            String body = String.format(
                    "Bonjour %s %s,\n\nVous êtes convoqué(e) à un entretien pour le poste \"%s\".\n\nDate : %s\nDurée : %d minutes\nLieu/Lien : %s\n\nCordialement,\nVentec RH",
                    app.getCandidate().getFirstName(), app.getCandidate().getLastName(),
                    app.getJobPosting().getTitle(),
                    req.scheduledAt().toString(),
                    interview.getDurationMinutes(),
                    req.locationOrLink() != null ? req.locationOrLink() : "À préciser"
            );
            mailService.sendSimple(candidateEmail, subject, body);
        }

        return toResponse(interview);
    }

    public InterviewResponse updateInterview(UUID id, UpdateInterviewRequest req) {
        Interview interview = interviewRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Interview not found: " + id));
        if (req.scheduledAt() != null) interview.setScheduledAt(req.scheduledAt());
        if (req.durationMinutes() != null) interview.setDurationMinutes(req.durationMinutes());
        if (req.type() != null) interview.setType(req.type());
        if (req.locationOrLink() != null) interview.setLocationOrLink(req.locationOrLink());
        if (req.status() != null) interview.setStatus(req.status());
        if (req.notes() != null) interview.setNotes(req.notes());
        if (req.interviewerIds() != null) {
            try {
                interview.setInterviewerIds(objectMapper.writeValueAsString(req.interviewerIds()));
            } catch (Exception e) {
                log.warn("Failed to serialize interviewer IDs: {}", e.getMessage());
            }
        }
        return toResponse(interviewRepository.save(interview));
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

    public InterviewResponse cancelInterview(UUID id) {
        Interview interview = interviewRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Interview not found: " + id));
        interview.setStatus("CANCELLED");
        return toResponse(interviewRepository.save(interview));
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
                i.getCreatedAt()
        );
    }
}
