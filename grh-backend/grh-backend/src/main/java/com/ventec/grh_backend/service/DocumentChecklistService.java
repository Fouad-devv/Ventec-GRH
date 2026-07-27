package com.ventec.grh_backend.service;

import com.ventec.grh_backend.domain.Candidate;
import com.ventec.grh_backend.domain.DocumentChecklist;
import com.ventec.grh_backend.domain.JobPosting;
import com.ventec.grh_backend.dto.request.UpdateDocumentChecklistRequest;
import com.ventec.grh_backend.dto.response.DocumentChecklistResponse;
import com.ventec.grh_backend.exception.NotFoundException;
import com.ventec.grh_backend.repository.CandidateRepository;
import com.ventec.grh_backend.repository.DocumentChecklistRepository;
import com.ventec.grh_backend.repository.JobPostingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class DocumentChecklistService {

    private final DocumentChecklistRepository checklistRepository;
    private final CandidateRepository candidateRepository;
    private final JobPostingRepository jobPostingRepository;

    public DocumentChecklistResponse getOrCreate(UUID candidateId, UUID jobPostingId) {
        return checklistRepository.findByCandidateIdAndJobPostingId(candidateId, jobPostingId)
                .map(this::toResponse)
                .orElseGet(() -> {
                    Candidate candidate = candidateRepository.findById(candidateId)
                            .orElseThrow(() -> new NotFoundException("Candidate not found: " + candidateId));
                    JobPosting posting = jobPostingRepository.findById(jobPostingId)
                            .orElseThrow(() -> new NotFoundException("Job posting not found: " + jobPostingId));
                    DocumentChecklist checklist = DocumentChecklist.builder()
                            .candidate(candidate)
                            .jobPosting(posting)
                            .documents("[]")
                            .build();
                    return toResponse(checklistRepository.save(checklist));
                });
    }

    public DocumentChecklistResponse updateDocuments(UUID candidateId, UUID jobPostingId,
                                                      UpdateDocumentChecklistRequest req) {
        DocumentChecklist checklist = checklistRepository
                .findByCandidateIdAndJobPostingId(candidateId, jobPostingId)
                .orElseGet(() -> {
                    Candidate candidate = candidateRepository.findById(candidateId)
                            .orElseThrow(() -> new NotFoundException("Candidate not found: " + candidateId));
                    JobPosting posting = jobPostingRepository.findById(jobPostingId)
                            .orElseThrow(() -> new NotFoundException("Job posting not found: " + jobPostingId));
                    return DocumentChecklist.builder()
                            .candidate(candidate)
                            .jobPosting(posting)
                            .documents("[]")
                            .build();
                });
        checklist.setDocuments(req.documents());
        return toResponse(checklistRepository.save(checklist));
    }

    @Transactional(readOnly = true)
    public List<DocumentChecklistResponse> getByCandidate(UUID candidateId) {
        return checklistRepository.findByCandidateId(candidateId)
                .stream().map(this::toResponse).toList();
    }

    public DocumentChecklistResponse toResponse(DocumentChecklist c) {
        return new DocumentChecklistResponse(
                c.getId(),
                c.getCandidate() != null ? c.getCandidate().getId() : null,
                c.getJobPosting() != null ? c.getJobPosting().getId() : null,
                c.getDocuments(),
                c.getCreatedAt(),
                c.getUpdatedAt()
        );
    }
}
