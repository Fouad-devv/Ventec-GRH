package com.ventec.grh_backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ventec.grh_backend.domain.Application;
import com.ventec.grh_backend.domain.Candidate;
import com.ventec.grh_backend.domain.JobPosting;
import com.ventec.grh_backend.domain.User;
import com.ventec.grh_backend.DTO.request.CreateJobPostingRequest;
import com.ventec.grh_backend.DTO.request.UpdateJobPostingRequest;
import com.ventec.grh_backend.DTO.response.ApplicationResponse;
import com.ventec.grh_backend.DTO.response.ImportCvResult;
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
                .status("PUBLISHED")
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
            return jobPostingRepository.findByStatus(status, pageable)
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

        // Read bytes BEFORE store() — Files.copy() drains getInputStream(), making getBytes() return empty afterwards
        byte[] fileBytes;
        try {
            fileBytes = file.getBytes();
        } catch (Exception e) {
            throw new RuntimeException("Failed to read uploaded file", e);
        }

        storageService.delete(posting.getFicheFonctionPath());
        posting.setFicheFonctionPath(
                storageService.storeBytes(fileBytes, file.getOriginalFilename() != null ? file.getOriginalFilename() : "fiche.pdf", "fiches-fonction")
        );

        // Extract structured job data using the already-read bytes
        try {
            Map<?, ?> extracted = aiServiceClient.extractJobPosting(fileBytes, file.getOriginalFilename()).block();
            if (extracted != null) {
                posting.setExtractedJobData(objectMapper.writeValueAsString(extracted));

                // Auto-fill description/requirements if blank
                if ((posting.getDescription() == null || posting.getDescription().isBlank())
                        && extracted.get("description") instanceof String desc) {
                    posting.setDescription(desc);
                }
                if ((posting.getRequirements() == null || posting.getRequirements().isBlank())
                        && extracted.get("requirements") instanceof String req) {
                    posting.setRequirements(req);
                }

                // Auto-populate skillsWeights from required_skills if the grid is empty
                if ((posting.getSkillsWeights() == null || posting.getSkillsWeights().isBlank())
                        && extracted.get("required_skills") instanceof List<?> skillsList
                        && !skillsList.isEmpty()) {
                    List<Map<String, Object>> weights = skillsList.stream()
                            .filter(s -> s instanceof String && !((String) s).isBlank())
                            .map(s -> {
                                Map<String, Object> w = new java.util.LinkedHashMap<>();
                                w.put("name", (String) s);
                                w.put("weight", 1);
                                return w;
                            })
                            .toList();
                    if (!weights.isEmpty()) {
                        posting.setSkillsWeights(objectMapper.writeValueAsString(weights));
                    }
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

    public List<ImportCvResult> importCvs(UUID postingId, List<MultipartFile> files) {
        JobPosting posting = jobPostingRepository.findById(postingId)
                .orElseThrow(() -> new NotFoundException("Job posting not found: " + postingId));

        List<ImportCvResult> results = new ArrayList<>();
        for (MultipartFile file : files) {
            String fileName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "CV";
            try {
                // Read bytes BEFORE store() — Files.copy() drains getInputStream(),
                // making file.getBytes() return empty for larger files (stored as temp files)
                byte[] fileBytes = file.getBytes();
                String cvPath = storageService.storeBytes(fileBytes, fileName, "cvs");

                Map<?, ?> data = null;
                String aiError = null;
                try {
                    data = aiServiceClient.extractCvFullFromBytes(fileBytes, fileName).block();
                } catch (Exception e) {
                    log.warn("AI extraction failed for {}: {}", fileName, e.getMessage());
                    String msg = e.getMessage() != null ? e.getMessage().toLowerCase() : "";
                    if (msg.contains("429") || msg.contains("rate limit") || msg.contains("too many requests")) {
                        aiError = "Limite de requêtes IA atteinte — extraction échouée après 3 tentatives. Complétez le profil manuellement ou réimportez ce CV dans quelques minutes.";
                    } else if (msg.contains("503") || msg.contains("502") || msg.contains("service unavailable") || msg.contains("connection refused")) {
                        aiError = "Service IA indisponible — les données du CV n'ont pas pu être extraites. Réessayez dans quelques instants.";
                    } else if (msg.contains("500") || msg.contains("internal server error")) {
                        aiError = "Erreur interne du service IA — extraction échouée après 3 tentatives. Réessayez dans quelques instants ou complétez le profil manuellement.";
                    } else if (msg.contains("timeout") || msg.contains("timed out") || msg.contains("connection reset")) {
                        aiError = "Délai d'attente dépassé — le candidat a été importé sans données extraites. Réessayez dans quelques instants.";
                    } else if (msg.contains("422") || msg.contains("texte du cv est vide")) {
                        aiError = "Impossible de lire le contenu de ce PDF — il est peut-être protégé, corrompu ou scanné sans OCR. Essayez un autre format.";
                    } else {
                        aiError = "Extraction IA échouée pour ce CV — le candidat a été importé sans données extraites. Complétez le profil manuellement.";
                    }
                }

                String firstName = data != null ? (String) data.get("first_name") : null;
                String lastName  = data != null ? (String) data.get("last_name")  : null;
                if (firstName == null || firstName.isBlank()) firstName = null;
                if (lastName  == null || lastName.isBlank())  lastName  = null;

                // Fallback: parse filename when LLM couldn't extract names
                // Handles patterns: CV_LASTNAME_Firstname.pdf, Firstname_LASTNAME.pdf, etc.
                if (firstName == null || lastName == null) {
                    String fname = file.getOriginalFilename();
                    if (fname != null) {
                        String base = fname.replaceFirst("[.][^.]+$", ""); // strip extension
                        // Remove common prefixes: CV_, cv_, Cv_
                        if (base.toUpperCase().startsWith("CV_")) base = base.substring(3);
                        String[] parts = base.split("[_\\s]+");
                        if (parts.length >= 2) {
                            if (firstName == null && lastName == null) {
                                // CV_LASTNAME_Firstname → parts[0]=LASTNAME, parts[1]=Firstname
                                lastName  = capitalize(parts[0]);
                                firstName = capitalize(parts[1]);
                            } else if (lastName == null) {
                                // firstName already extracted — filename part[0] is LASTNAME
                                lastName = capitalize(parts[0]);
                            } else {
                                // lastName already extracted — filename last part is Firstname
                                firstName = capitalize(parts[parts.length - 1]);
                            }
                        } else if (parts.length == 1) {
                            if (lastName  == null) lastName  = capitalize(parts[0]);
                            if (firstName == null) firstName = "Candidat";
                        }
                    }
                }
                if (firstName == null || firstName.isBlank()) firstName = "Candidat";
                if (lastName  == null || lastName.isBlank())  lastName  = "Inconnu";

                String skillsJson = null;
                if (data != null && data.get("skills") instanceof List<?> skillsList) {
                    skillsJson = objectMapper.writeValueAsString(skillsList);
                }
                Integer experienceYears = null;
                if (data != null && data.get("experience_years") instanceof Number n) {
                    experienceYears = n.intValue();
                }
                // Guard: if current_position indicates a student/intern, reset to 0
                if (experienceYears != null && experienceYears > 0 && data != null) {
                    String pos = data.get("current_position") instanceof String p ? p.toLowerCase() : "";
                    String edu = data.get("education") instanceof String e ? e.toLowerCase() : "";
                    String cvSnippet = data.get("cv_text") instanceof String t ? t.toLowerCase() : "";
                    boolean looksLikeStudent =
                        pos.contains("stagiaire") || pos.contains("stage") ||
                        pos.contains("étudiant") || pos.contains("student") ||
                        pos.contains("en formation") || pos.contains("apprenti") ||
                        (edu.contains("en cours") && cvSnippet.contains("stage") && !cvSnippet.contains("cdi") && !cvSnippet.contains("cdd"));
                    if (looksLikeStudent) experienceYears = 0;
                }

                final Map<?, ?> d = data;
                final String extractedEmail    = d != null ? (String) d.get("email")            : null;
                final String extractedCvText   = d != null ? (String) d.get("cv_text")          : null;
                final String extractedEdu      = d != null ? (String) d.get("education")         : null;
                final String extractedPosition = d != null ? (String) d.get("current_position") : null;
                final String extractedLocation = d != null ? (String) d.get("location")         : null;
                final String extractedPhone    = d != null ? (String) d.get("phone")            : null;

                // Deduplicate: if a candidate with the same email already exists (e.g. created via
                // inbound email), update their record with the fresh extraction data instead of
                // creating a duplicate. This ensures one candidate record is shared between both
                // import paths, and the extraction result is consistent.
                Candidate existing = (extractedEmail != null && !extractedEmail.isBlank())
                        ? candidateRepository.findByEmail(extractedEmail).orElse(null)
                        : null;

                Candidate candidate;
                if (existing != null) {
                    existing.setFirstName(firstName);
                    existing.setLastName(lastName);
                    existing.setCvPath(cvPath);
                    if (extractedCvText   != null) existing.setCvExtractedText(extractedCvText);
                    if (skillsJson        != null) existing.setSkills(skillsJson);
                    if (experienceYears   != null) existing.setExperienceYears(experienceYears);
                    if (extractedEdu      != null) existing.setEducation(extractedEdu);
                    if (extractedPosition != null) existing.setCurrentPosition(extractedPosition);
                    if (extractedLocation != null) existing.setLocation(extractedLocation);
                    if (extractedPhone    != null) existing.setPhone(extractedPhone);
                    candidate = candidateRepository.save(existing);
                } else {
                    candidate = Candidate.builder()
                            .firstName(firstName)
                            .lastName(lastName)
                            .email(extractedEmail)
                            .phone(extractedPhone)
                            .location(extractedLocation)
                            .cvPath(cvPath)
                            .cvExtractedText(extractedCvText)
                            .skills(skillsJson)
                            .experienceYears(experienceYears)
                            .education(extractedEdu)
                            .currentPosition(extractedPosition)
                            .build();
                    candidate = candidateRepository.save(candidate);
                }

                final Candidate savedCandidate = candidate;
                Application app = applicationRepository
                        .findByCandidateIdAndJobPostingId(savedCandidate.getId(), postingId)
                        .orElseGet(() -> applicationRepository.save(Application.builder()
                                .candidate(savedCandidate)
                                .jobPosting(posting)
                                .status("NEW")
                                .build()));

                ApplicationResponse appResponse = new ApplicationResponse(
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
                        app.getUpdatedAt(),
                        app.getRejectionEmailSentAt(),
                        app.getInterviewNotifiedAt(),
                        null,
                        null,
                        savedCandidate.getExperienceYears(),
                        savedCandidate.isContacted()
                );
                results.add(new ImportCvResult(appResponse, fileName, aiError));
            } catch (Exception e) {
                log.error("Failed to import CV {}: {}", fileName, e.getMessage());
                results.add(new ImportCvResult(null, fileName,
                        "Échec de l'importation du fichier — vérifiez que le fichier est un PDF valide et non corrompu."));
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

    private String capitalize(String s) {
        if (s == null || s.isBlank()) return s;
        String lower = s.toLowerCase();
        return Character.toUpperCase(lower.charAt(0)) + lower.substring(1);
    }
}
