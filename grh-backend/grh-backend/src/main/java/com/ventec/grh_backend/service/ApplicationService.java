package com.ventec.grh_backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ventec.grh_backend.domain.Application;
import com.ventec.grh_backend.domain.DocumentChecklist;
import com.ventec.grh_backend.domain.User;
import com.ventec.grh_backend.DTO.request.UpdateApplicationStatusRequest;
import com.ventec.grh_backend.DTO.response.ApplicationResponse;
import com.ventec.grh_backend.exception.NotFoundException;
import com.ventec.grh_backend.repository.ApplicationRepository;
import com.ventec.grh_backend.repository.CandidateRepository;
import com.ventec.grh_backend.repository.DocumentChecklistRepository;
import com.ventec.grh_backend.repository.JobPostingRepository;
import com.ventec.grh_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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

    public ApplicationResponse toResponse(Application a) {
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
                a.getUpdatedAt()
        );
    }
}
