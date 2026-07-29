package com.ventec.grh_backend.service;

import com.ventec.grh_backend.domain.JobPosting;
import com.ventec.grh_backend.domain.User;
import com.ventec.grh_backend.DTO.request.CreateJobPostingRequest;
import com.ventec.grh_backend.DTO.request.UpdateJobPostingRequest;
import com.ventec.grh_backend.DTO.response.JobPostingResponse;
import com.ventec.grh_backend.DTO.response.PostingHistoryResponse;
import com.ventec.grh_backend.exception.NotFoundException;
import com.ventec.grh_backend.repository.ApplicationRepository;
import com.ventec.grh_backend.repository.JobPostingRepository;
import com.ventec.grh_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class PostingService {

    private final JobPostingRepository jobPostingRepository;
    private final UserRepository userRepository;
    private final ApplicationRepository applicationRepository;
    private final ExportService exportService;
    private final StorageService storageService;
    private final UserContextService userContextService;

    public JobPostingResponse createPosting(CreateJobPostingRequest req, Authentication auth) {
        User user = userContextService.resolveUser(auth);
        JobPosting posting = JobPosting.builder()
                .title(req.title())
                .department(req.department())
                .location(req.location())
                .contractType(req.contractType())
                .description(req.description())
                .requirements(req.requirements())
                .minExperience(req.minExperience())
                .deadline(req.deadline())
                .status("DRAFT")
                .createdBy(user)
                .build();
        return toResponse(jobPostingRepository.save(posting));
    }

    public JobPostingResponse updatePosting(UUID id, UpdateJobPostingRequest req) {
        JobPosting posting = jobPostingRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Job posting not found: " + id));
        if (req.title() != null) posting.setTitle(req.title());
        if (req.department() != null) posting.setDepartment(req.department());
        if (req.location() != null) posting.setLocation(req.location());
        if (req.contractType() != null) posting.setContractType(req.contractType());
        if (req.description() != null) posting.setDescription(req.description());
        if (req.requirements() != null) posting.setRequirements(req.requirements());
        if (req.minExperience() != null) posting.setMinExperience(req.minExperience());
        if (req.skillsWeights() != null) posting.setSkillsWeights(req.skillsWeights());
        if (req.status() != null) posting.setStatus(req.status());
        if (req.deadline() != null) posting.setDeadline(req.deadline());
        return toResponse(jobPostingRepository.save(posting));
    }

    public JobPostingResponse publishPosting(UUID id) {
        JobPosting posting = jobPostingRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Job posting not found: " + id));
        posting.setStatus("PUBLISHED");
        return toResponse(jobPostingRepository.save(posting));
    }

    public JobPostingResponse closePosting(UUID id) {
        JobPosting posting = jobPostingRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Job posting not found: " + id));
        posting.setStatus("CLOSED");
        return toResponse(jobPostingRepository.save(posting));
    }

    @Transactional(readOnly = true)
    public JobPostingResponse getPosting(UUID id) {
        return jobPostingRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new NotFoundException("Job posting not found: " + id));
    }

    @Transactional(readOnly = true)
    public Page<JobPostingResponse> getAllPostings(String status, Pageable pageable) {
        if (status != null && !status.isBlank()) {
            return jobPostingRepository.findAll(pageable)
                    .map(this::toResponse);
        }
        return jobPostingRepository.findAll(pageable).map(this::toResponse);
    }

    public void deletePosting(UUID id) {
        if (!jobPostingRepository.existsById(id)) {
            throw new NotFoundException("Job posting not found: " + id);
        }
        jobPostingRepository.deleteById(id);
    }

    public JobPostingResponse duplicatePosting(UUID id, Authentication auth) {
        JobPosting source = jobPostingRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Job posting not found: " + id));
        User user = userContextService.resolveUser(auth);
        JobPosting copy = JobPosting.builder()
                .title("Copie de " + source.getTitle())
                .department(source.getDepartment())
                .location(source.getLocation())
                .contractType(source.getContractType())
                .description(source.getDescription())
                .requirements(source.getRequirements())
                .minExperience(source.getMinExperience())
                .deadline(source.getDeadline())
                .status("DRAFT")
                .createdBy(user)
                .build();
        return toResponse(jobPostingRepository.save(copy));
    }

    @Transactional(readOnly = true)
    public List<PostingHistoryResponse> getHistory() {
        return jobPostingRepository.findByStatusOrderByCreatedAtDesc("CLOSED")
                .stream()
                .map(p -> {
                    long total  = applicationRepository.countByJobPostingId(p.getId());
                    long hired  = applicationRepository.countByJobPostingIdAndStatus(p.getId(), "HIRED");
                    Double avg  = applicationRepository.avgAiScoreByJobPostingId(p.getId());
                    User creator = p.getCreatedBy();
                    return new PostingHistoryResponse(
                            p.getId(), p.getTitle(), p.getDepartment(), p.getLocation(),
                            p.getContractType(), p.getMinExperience(),
                            creator != null ? creator.getId()   : null,
                            creator != null ? creator.getFirstName() + " " + creator.getLastName() : null,
                            p.getDeadline(), p.getCreatedAt(), p.getUpdatedAt(),
                            total, hired, avg
                    );
                })
                .toList();
    }

    public JobPostingResponse uploadFicheFonction(UUID id, MultipartFile file) {
        JobPosting posting = jobPostingRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Job posting not found: " + id));
        storageService.delete(posting.getFicheFonctionPath());
        posting.setFicheFonctionPath(storageService.store(file, "fiches-fonction"));
        return toResponse(jobPostingRepository.save(posting));
    }

    public JobPostingResponse generateAndStoreFicheFonction(UUID id) {
        byte[] docBytes = exportService.exportFicheFonctionDocx(id);
        String path = storageService.storeBytes(docBytes, "fiche-fonction-" + id + ".docx", "fiches-fonction");
        JobPosting posting = jobPostingRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Job posting not found: " + id));
        storageService.delete(posting.getFicheFonctionPath());
        posting.setFicheFonctionPath(path);
        return toResponse(jobPostingRepository.save(posting));
    }

    public JobPostingResponse toResponse(JobPosting p) {
        User creator = p.getCreatedBy();
        return new JobPostingResponse(
                p.getId(), p.getTitle(), p.getDepartment(), p.getLocation(),
                p.getContractType(), p.getDescription(), p.getRequirements(),
                p.getMinExperience(), p.getSkillsWeights(), p.getStatus(),
                creator != null ? creator.getId() : null,
                creator != null ? creator.getFirstName() + " " + creator.getLastName() : null,
                p.getDeadline(), p.getCreatedAt(), p.getUpdatedAt(),
                p.getFicheFonctionPath()
        );
    }
}
