package com.ventec.grh_backend.service;

import com.ventec.grh_backend.domain.Application;
import com.ventec.grh_backend.domain.User;
import com.ventec.grh_backend.DTO.request.UpdateApplicationStatusRequest;
import com.ventec.grh_backend.DTO.response.ApplicationResponse;
import com.ventec.grh_backend.exception.NotFoundException;
import com.ventec.grh_backend.repository.ApplicationRepository;
import com.ventec.grh_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class ApplicationService {

    private final ApplicationRepository applicationRepository;
    private final UserRepository userRepository;

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
        app.setStatus(req.status());
        if (req.notes() != null) app.setNotes(req.notes());
        User updater = userRepository.findByKeycloakId(keycloakId).orElse(null);
        app.setUpdatedBy(updater);
        return toResponse(applicationRepository.save(app));
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
