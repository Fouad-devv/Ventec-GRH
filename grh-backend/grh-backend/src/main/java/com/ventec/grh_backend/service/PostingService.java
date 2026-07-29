package com.ventec.grh_backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ventec.grh_backend.domain.Application;
import com.ventec.grh_backend.domain.Candidate;
import com.ventec.grh_backend.domain.JobPosting;
import com.ventec.grh_backend.domain.User;
import com.ventec.grh_backend.DTO.request.CreateJobPostingRequest;
import com.ventec.grh_backend.DTO.request.UpdateJobPostingRequest;
import com.ventec.grh_backend.DTO.response.ApplicationResponse;
import com.ventec.grh_backend.DTO.response.JobPostingResponse;
import com.ventec.grh_backend.DTO.response.PostingHistoryResponse;
import com.ventec.grh_backend.exception.NotFoundException;
import com.ventec.grh_backend.repository.ApplicationRepository;
import com.ventec.grh_backend.repository.CandidateRepository;
import com.ventec.grh_backend.repository.JobPostingRepository;
import com.ventec.grh_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class PostingService {

    private final JobPostingRepository jobPostingRepository;
    private final UserRepository userRepository;
    private final ApplicationRepository applicationRepository;
    private final CandidateRepository candidateRepository;
    private final AiServiceClient aiServiceClient;
    private final ExportService exportService;
    private final StorageService storageService;
    private final UserContextService userContextService;
    private final ObjectMapper objectMapper;

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
                .minAge(req.minAge())
                .maxAge(req.maxAge())
                .freeFilterPrompt(req.freeFilterPrompt())
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
        if (req.minAge() != null) posting.setMinAge(req.minAge());
        if (req.maxAge() != null) posting.setMaxAge(req.maxAge());
        if (req.freeFilterPrompt() != null) posting.setFreeFilterPrompt(req.freeFilterPrompt());
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
        // Extract structured job data from the uploaded document via AI
        try {
            Map<?, ?> extracted = aiServiceClient.extractJobPosting(file).block();
            if (extracted != null) {
                posting.setExtractedJobData(objectMapper.writeValueAsString(extracted));
                // Populate description/requirements from extracted data if not yet set
                if ((posting.getDescription() == null || posting.getDescription().isBlank())
                        && extracted.get("description") instanceof String desc) {
                    posting.setDescription(desc);
                }
                if ((posting.getRequirements() == null || posting.getRequirements().isBlank())
                        && extracted.get("requirements") instanceof String req) {
                    posting.setRequirements(req);
                }
            }
        } catch (Exception e) {
            log.warn("AI extraction from fiche de poste failed for {}: {}", id, e.getMessage());
        }
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

    public List<ApplicationResponse> importCvs(UUID postingId, List<MultipartFile> files) {
        JobPosting posting = jobPostingRepository.findById(postingId)
                .orElseThrow(() -> new NotFoundException("Job posting not found: " + postingId));

        List<ApplicationResponse> results = new ArrayList<>();
        for (MultipartFile file : files) {
            try {
                String cvPath = storageService.store(file, "cvs");

                Map<?, ?> data = null;
                try {
                    data = aiServiceClient.extractCvFull(file).block();
                } catch (Exception e) {
                    log.warn("AI extraction failed for {}: {}", file.getOriginalFilename(), e.getMessage());
                }

                String firstName = data != null ? (String) data.get("first_name") : null;
                String lastName  = data != null ? (String) data.get("last_name")  : null;
                if (firstName == null || firstName.isBlank()) firstName = "Candidat";
                if (lastName  == null || lastName.isBlank()) {
                    String fname = file.getOriginalFilename();
                    lastName = fname != null ? fname.replaceFirst("[.][^.]+$", "") : "Inconnu";
                }

                String skillsJson = null;
                if (data != null && data.get("skills") instanceof List<?> skillsList) {
                    skillsJson = objectMapper.writeValueAsString(skillsList);
                }
                Integer experienceYears = null;
                if (data != null && data.get("experience_years") instanceof Number n) {
                    experienceYears = n.intValue();
                }

                final Map<?, ?> d = data;
                Candidate candidate = Candidate.builder()
                        .firstName(firstName)
                        .lastName(lastName)
                        .email(d != null ? (String) d.get("email") : null)
                        .phone(d != null ? (String) d.get("phone") : null)
                        .location(d != null ? (String) d.get("location") : null)
                        .cvPath(cvPath)
                        .cvExtractedText(d != null ? (String) d.get("cv_text") : null)
                        .skills(skillsJson)
                        .experienceYears(experienceYears)
                        .education(d != null ? (String) d.get("education") : null)
                        .currentPosition(d != null ? (String) d.get("current_position") : null)
                        .build();
                candidate = candidateRepository.save(candidate);

                final Candidate savedCandidate = candidate;
                Application app = applicationRepository
                        .findByCandidateIdAndJobPostingId(savedCandidate.getId(), postingId)
                        .orElseGet(() -> applicationRepository.save(Application.builder()
                                .candidate(savedCandidate)
                                .jobPosting(posting)
                                .status("NEW")
                                .build()));

                results.add(new ApplicationResponse(
                        app.getId(),
                        savedCandidate.getId(),
                        savedCandidate.getFirstName(),
                        savedCandidate.getLastName(),
                        savedCandidate.getEmail(),
                        posting.getId(),
                        posting.getTitle(),
                        app.getStatus(),
                        app.getAiScore(),
                        app.getAiSummary(),
                        app.getNotes(),
                        app.getAppliedAt(),
                        app.getUpdatedAt()
                ));
            } catch (Exception e) {
                log.error("Failed to import CV {}: {}", file.getOriginalFilename(), e.getMessage());
            }
        }
        return results;
    }

    public JobPostingResponse toResponse(JobPosting p) {
        User creator = p.getCreatedBy();
        return new JobPostingResponse(
                p.getId(), p.getTitle(), p.getDepartment(), p.getLocation(),
                p.getContractType(), p.getDescription(), p.getRequirements(),
                p.getMinExperience(), p.getMinAge(), p.getMaxAge(),
                p.getFreeFilterPrompt(), p.getExtractedJobData(),
                p.getSkillsWeights(), p.getStatus(),
                creator != null ? creator.getId() : null,
                creator != null ? creator.getFirstName() + " " + creator.getLastName() : null,
                p.getDeadline(), p.getCreatedAt(), p.getUpdatedAt(),
                p.getFicheFonctionPath()
        );
    }
}
