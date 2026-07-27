package com.ventec.grh_backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ventec.grh_backend.domain.Application;
import com.ventec.grh_backend.domain.Candidate;
import com.ventec.grh_backend.domain.FilterJob;
import com.ventec.grh_backend.domain.JobPosting;
import com.ventec.grh_backend.dto.response.FilterJobResponse;
import com.ventec.grh_backend.exception.NotFoundException;
import com.ventec.grh_backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class FilterService {

    private final FilterJobRepository filterJobRepository;
    private final JobPostingRepository jobPostingRepository;
    private final CandidateRepository candidateRepository;
    private final ApplicationRepository applicationRepository;
    private final UserRepository userRepository;
    private final AiServiceClient aiServiceClient;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;

    public FilterJobResponse requestFilter(UUID jobPostingId, String keycloakId) {
        JobPosting posting = jobPostingRepository.findById(jobPostingId)
                .orElseThrow(() -> new NotFoundException("Job posting not found: " + jobPostingId));

        var requestedBy = userRepository.findByKeycloakId(keycloakId).orElse(null);
        List<UUID> candidateIds = candidateRepository.findAll()
                .stream().map(Candidate::getId).toList();

        FilterJob filterJob = FilterJob.builder()
                .jobPosting(posting)
                .status("PENDING")
                .requestedBy(requestedBy)
                .build();
        filterJob = filterJobRepository.save(filterJob);

        filterJob.setStatus("RUNNING");
        filterJob = filterJobRepository.save(filterJob);

        aiServiceClient.requestFilter(
                filterJob.getId(), jobPostingId,
                posting.getDescription(), posting.getRequirements(),
                candidateIds);

        return toResponse(filterJob);
    }

    @Transactional(readOnly = true)
    public FilterJobResponse getFilterJob(UUID filterJobId) {
        return filterJobRepository.findById(filterJobId)
                .map(this::toResponse)
                .orElseThrow(() -> new NotFoundException("FilterJob not found: " + filterJobId));
    }

    @Transactional(readOnly = true)
    public List<FilterJobResponse> getFilterJobsForPosting(UUID jobPostingId) {
        return filterJobRepository.findByJobPostingIdOrderByRequestedAtDesc(jobPostingId)
                .stream().map(this::toResponse).toList();
    }

    public void handleCallback(UUID filterJobId, String status, String result, String errorMessage) {
        FilterJob filterJob = filterJobRepository.findById(filterJobId)
                .orElseThrow(() -> new NotFoundException("FilterJob not found: " + filterJobId));

        filterJob.setStatus(status);
        filterJob.setCompletedAt(OffsetDateTime.now());
        filterJob.setResult(result);
        filterJob.setErrorMessage(errorMessage);
        filterJobRepository.save(filterJob);

        if ("DONE".equals(status) && result != null) {
            try {
                List<Map<String, Object>> results = objectMapper.readValue(
                        result, new TypeReference<>() {});
                UUID jobPostingId = filterJob.getJobPosting().getId();
                for (Map<String, Object> entry : results) {
                    String candidateIdStr = (String) entry.get("candidate_id");
                    if (candidateIdStr == null) continue;
                    UUID candidateId = UUID.fromString(candidateIdStr);
                    Number scoreNum = (Number) entry.get("score");
                    String summary = (String) entry.get("summary");

                    Application app = applicationRepository
                            .findByCandidateIdAndJobPostingId(candidateId, jobPostingId)
                            .orElseGet(() -> {
                                Candidate candidate = candidateRepository.findById(candidateId).orElse(null);
                                JobPosting posting = filterJob.getJobPosting();
                                if (candidate == null) return null;
                                Application newApp = Application.builder()
                                        .candidate(candidate)
                                        .jobPosting(posting)
                                        .status("SCREENING")
                                        .build();
                                return applicationRepository.save(newApp);
                            });

                    if (app != null) {
                        if (scoreNum != null) {
                            app.setAiScore(new BigDecimal(scoreNum.toString()));
                        }
                        app.setAiSummary(summary);
                        app.setStatus("SCREENING");
                        applicationRepository.save(app);
                    }
                }
            } catch (Exception e) {
                log.error("Failed to process filter callback results: {}", e.getMessage());
            }
        }

        if (filterJob.getRequestedBy() != null) {
            String notifBody = "DONE".equals(status)
                    ? "Filtrage IA terminé pour le poste"
                    : "Erreur lors du filtrage IA: " + errorMessage;
            notificationService.createInternal(
                    filterJob.getRequestedBy(),
                    "FILTER_JOB_DONE",
                    "Résultat filtrage IA",
                    notifBody,
                    "FILTER_JOB",
                    filterJobId
            );
        }
    }

    public FilterJobResponse toResponse(FilterJob f) {
        return new FilterJobResponse(
                f.getId(),
                f.getJobPosting() != null ? f.getJobPosting().getId() : null,
                f.getStatus(),
                f.getRequestedBy() != null ? f.getRequestedBy().getId() : null,
                f.getRequestedAt(),
                f.getCompletedAt(),
                f.getResult(),
                f.getErrorMessage()
        );
    }
}
