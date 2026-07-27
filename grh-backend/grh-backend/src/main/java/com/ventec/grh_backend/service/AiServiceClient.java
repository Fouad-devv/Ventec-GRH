package com.ventec.grh_backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
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
}
