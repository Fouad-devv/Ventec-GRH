package com.ventec.grh_backend.controller;

import com.ventec.grh_backend.DTO.response.EmailCandidatureResponse;
import com.ventec.grh_backend.domain.EmailCandidature;
import com.ventec.grh_backend.repository.EmailCandidatureRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/email-candidatures")
@RequiredArgsConstructor
public class EmailCandidatureController {

    private final EmailCandidatureRepository repository;

    @GetMapping
    public ResponseEntity<List<EmailCandidatureResponse>> getAll() {
        List<EmailCandidatureResponse> list = repository.findAllByOrderByReceivedAtDesc()
                .stream()
                .map(this::toResponse)
                .toList();
        return ResponseEntity.ok(list);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        if (!repository.existsById(id)) return ResponseEntity.notFound().build();
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    public ResponseEntity<Void> deleteAll() {
        repository.deleteAll();
        return ResponseEntity.noContent().build();
    }

    private EmailCandidatureResponse toResponse(EmailCandidature e) {
        return new EmailCandidatureResponse(
                e.getId(),
                e.getSenderEmail(),
                e.getSenderName(),
                e.getSubject(),
                e.getStatus(),
                e.getConfidence(),
                e.getMatchedPostingId(),
                e.getMatchedPostingTitle(),
                e.getCandidateId(),
                e.getCandidateName(),
                e.getReceivedAt()
        );
    }
}
