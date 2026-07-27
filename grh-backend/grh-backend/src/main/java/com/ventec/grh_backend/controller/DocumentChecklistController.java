package com.ventec.grh_backend.controller;

import com.ventec.grh_backend.DTO.request.UpdateDocumentChecklistRequest;
import com.ventec.grh_backend.DTO.response.DocumentChecklistResponse;
import com.ventec.grh_backend.service.DocumentChecklistService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/checklists")
@RequiredArgsConstructor
@PreAuthorize("hasRole('RH') or hasRole('MANAGER') or hasRole('ADMIN')")
public class DocumentChecklistController {

    private final DocumentChecklistService checklistService;

    @GetMapping("/candidate/{candidateId}/posting/{jobPostingId}")
    public ResponseEntity<DocumentChecklistResponse> getOrCreate(
            @PathVariable UUID candidateId,
            @PathVariable UUID jobPostingId) {
        return ResponseEntity.ok(checklistService.getOrCreate(candidateId, jobPostingId));
    }

    @PutMapping("/candidate/{candidateId}/posting/{jobPostingId}")
    public ResponseEntity<DocumentChecklistResponse> update(
            @PathVariable UUID candidateId,
            @PathVariable UUID jobPostingId,
            @Valid @RequestBody UpdateDocumentChecklistRequest req) {
        return ResponseEntity.ok(checklistService.updateDocuments(candidateId, jobPostingId, req));
    }

    @GetMapping("/candidate/{candidateId}")
    public ResponseEntity<List<DocumentChecklistResponse>> getByCandidate(@PathVariable UUID candidateId) {
        return ResponseEntity.ok(checklistService.getByCandidate(candidateId));
    }
}
