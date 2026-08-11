package com.ventec.grh_backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class AiServiceClient {

    private final WebClient aiWebClient;

    // Fire-and-forget: FastAPI calls back /api/callback/filter/{filterJobId} with results
    public void requestFilter(UUID filterJobId, UUID jobPostingId,
                              String jobDescription, String requirements,
                              Integer minAge, Integer maxAge, Integer minExperience,
                              String freeFilterPrompt, String extractedJobData,
                              List<UUID> candidateIds) {
        Map<String, Object> payload = new java.util.HashMap<>();
        payload.put("filter_job_id", filterJobId.toString());
        payload.put("job_posting_id", jobPostingId.toString());
        payload.put("job_description", jobDescription != null ? jobDescription : "");
        payload.put("requirements", requirements != null ? requirements : "");
        payload.put("candidate_ids", candidateIds.stream().map(UUID::toString).toList());
        if (minAge != null) payload.put("min_age", minAge);
        if (maxAge != null) payload.put("max_age", maxAge);
        if (minExperience != null) payload.put("min_experience", minExperience);
        if (freeFilterPrompt != null) payload.put("free_filter_prompt", freeFilterPrompt);
        if (extractedJobData != null) payload.put("extracted_job_data", extractedJobData);
        aiWebClient.post()
                .uri("/filter")
                .bodyValue(payload)
                .retrieve()
                .bodyToMono(Void.class)
                .doOnError(e -> log.error("AI filter request failed for filterJob {}: {}", filterJobId, e.getMessage()))
                .subscribe();
    }

    public Mono<Map> extractCv(String cvText) {
        return aiWebClient.post()
                .uri("/extract-cv")
                .bodyValue(Map.of("text", cvText))
                .retrieve()
                .bodyToMono(Map.class);
    }

    public Mono<Map> extractCvFull(MultipartFile file) {
        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        try {
            builder.part("file", new ByteArrayResource(file.getBytes()) {
                @Override
                public String getFilename() {
                    return file.getOriginalFilename() != null ? file.getOriginalFilename() : "cv.pdf";
                }
            }).contentType(MediaType.APPLICATION_OCTET_STREAM);
        } catch (Exception e) {
            return Mono.error(new RuntimeException("Failed to read CV file", e));
        }
        return aiWebClient.post()
                .uri("/extract-cv-full")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(BodyInserters.fromMultipartData(builder.build()))
                .retrieve()
                .bodyToMono(Map.class);
    }

    public Mono<Map> extractCvFullFromBytes(byte[] fileBytes, String filename) {
        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        final String name = filename != null ? filename : "cv.pdf";
        builder.part("file", new ByteArrayResource(fileBytes) {
            @Override
            public String getFilename() { return name; }
        }).contentType(MediaType.APPLICATION_OCTET_STREAM);
        return aiWebClient.post()
                .uri("/extract-cv-full")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(BodyInserters.fromMultipartData(builder.build()))
                .retrieve()
                .bodyToMono(Map.class);
    }

    public Mono<Map> extractCvFile(MultipartFile file) {
        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        try {
            builder.part("file", new ByteArrayResource(file.getBytes()) {
                @Override
                public String getFilename() {
                    return file.getOriginalFilename() != null ? file.getOriginalFilename() : "cv.pdf";
                }
            }).contentType(MediaType.APPLICATION_OCTET_STREAM);
        } catch (Exception e) {
            return Mono.error(new RuntimeException("Failed to read CV file", e));
        }
        return aiWebClient.post()
                .uri("/extract-cv-file")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(BodyInserters.fromMultipartData(builder.build()))
                .retrieve()
                .bodyToMono(Map.class);
    }

    public Mono<Map> generateInterviewQuestions(String jobTitle, String jobDescription,
                                                 String requirements, String candidateSkills,
                                                 String candidatePosition, Integer candidateExperienceYears) {
        Map<String, Object> payload = new java.util.HashMap<>();
        payload.put("job_title", jobTitle != null ? jobTitle : "");
        if (jobDescription != null) payload.put("job_description", jobDescription);
        if (requirements != null) payload.put("requirements", requirements);
        if (candidateSkills != null) payload.put("candidate_skills", candidateSkills);
        if (candidatePosition != null) payload.put("candidate_position", candidatePosition);
        if (candidateExperienceYears != null) payload.put("candidate_experience_years", candidateExperienceYears);
        return aiWebClient.post()
                .uri("/generate-interview-questions")
                .bodyValue(payload)
                .retrieve()
                .bodyToMono(Map.class);
    }

    public Mono<Map> generateChecklist(String jobTitle, String contractType,
                                        String department, String candidateName,
                                        String candidateProfile) {
        Map<String, Object> payload = new java.util.HashMap<>();
        payload.put("job_title", jobTitle != null ? jobTitle : "");
        if (contractType != null)      payload.put("contract_type", contractType);
        if (department != null)        payload.put("department", department);
        if (candidateName != null)     payload.put("candidate_name", candidateName);
        if (candidateProfile != null)  payload.put("candidate_profile", candidateProfile);
        return aiWebClient.post()
                .uri("/generate-checklist")
                .bodyValue(payload)
                .retrieve()
                .bodyToMono(Map.class);
    }

    public Mono<Map> generateFicheFonction(String title, String department,
                                            String contractType, String filiale,
                                            String description, String requirements) {
        Map<String, Object> payload = new java.util.HashMap<>();
        payload.put("title", title != null ? title : "");
        if (department != null)    payload.put("department", department);
        if (contractType != null)  payload.put("contract_type", contractType);
        if (filiale != null)       payload.put("filiale", filiale);
        if (description != null)   payload.put("description", description);
        if (requirements != null)  payload.put("requirements", requirements);
        return aiWebClient.post()
                .uri("/generate-fiche-fonction")
                .bodyValue(payload)
                .retrieve()
                .bodyToMono(Map.class);
    }

    public Mono<Map> extractJobPosting(byte[] fileBytes, String filename) {
        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        final String name = filename != null ? filename : "fiche.pdf";
        builder.part("file", new ByteArrayResource(fileBytes) {
            @Override
            public String getFilename() { return name; }
        }).contentType(MediaType.APPLICATION_OCTET_STREAM);
        return aiWebClient.post()
                .uri("/extract-job-posting")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(BodyInserters.fromMultipartData(builder.build()))
                .retrieve()
                .bodyToMono(Map.class);
    }

    public Mono<Map> generateDescription(String title, String department,
                                          String contractType, String location,
                                          Integer minExperience) {
        Map<String, Object> payload = new java.util.HashMap<>();
        payload.put("title", title != null ? title : "");
        if (department != null) payload.put("department", department);
        if (contractType != null) payload.put("contract_type", contractType);
        if (location != null) payload.put("location", location);
        if (minExperience != null) payload.put("min_experience", minExperience);
        return aiWebClient.post()
                .uri("/generate-description")
                .bodyValue(payload)
                .retrieve()
                .bodyToMono(Map.class);
    }

    public Mono<Map> matchPosting(String subject, List<Map<String, Object>> postings) {
        Map<String, Object> payload = new java.util.HashMap<>();
        payload.put("subject", subject);
        payload.put("postings", postings);
        return aiWebClient.post()
                .uri("/match-posting")
                .bodyValue(payload)
                .retrieve()
                .bodyToMono(Map.class);
    }
}
