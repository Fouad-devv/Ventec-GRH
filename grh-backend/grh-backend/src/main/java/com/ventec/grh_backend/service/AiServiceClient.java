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
                              List<UUID> candidateIds) {
        Map<String, Object> payload = Map.of(
                "filter_job_id", filterJobId.toString(),
                "job_posting_id", jobPostingId.toString(),
                "job_description", jobDescription != null ? jobDescription : "",
                "requirements", requirements != null ? requirements : "",
                "candidate_ids", candidateIds.stream().map(UUID::toString).toList()
        );
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
}
