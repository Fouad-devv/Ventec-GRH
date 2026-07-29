package com.ventec.grh_backend.controller;

import com.ventec.grh_backend.DTO.request.CreateJobPostingRequest;
import com.ventec.grh_backend.DTO.request.GenerateDescriptionRequest;
import com.ventec.grh_backend.DTO.request.UpdateJobPostingRequest;
import com.ventec.grh_backend.DTO.response.GenerateDescriptionResponse;
import com.ventec.grh_backend.DTO.response.JobPostingResponse;
import com.ventec.grh_backend.DTO.response.PostingHistoryResponse;
import com.ventec.grh_backend.service.AiServiceClient;
import com.ventec.grh_backend.service.ExportService;
import com.ventec.grh_backend.service.PostingService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/postings")
@RequiredArgsConstructor
public class PostingController {

    private final PostingService postingService;
    private final AiServiceClient aiServiceClient;
    private final ExportService exportService;

    @GetMapping("/history")
    public ResponseEntity<List<PostingHistoryResponse>> getHistory() {
        return ResponseEntity.ok(postingService.getHistory());
    }

    @GetMapping
    public ResponseEntity<Page<JobPostingResponse>> getAll(
            @RequestParam(required = false) String status,
            Pageable pageable) {
        return ResponseEntity.ok(postingService.getAllPostings(status, pageable));
    }

    @PostMapping
    @PreAuthorize("hasRole('RH') or hasRole('ADMIN')")
    public ResponseEntity<JobPostingResponse> create(
            @Valid @RequestBody CreateJobPostingRequest req,
            Authentication auth) {
        return ResponseEntity.ok(postingService.createPosting(req, auth.getName()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<JobPostingResponse> get(@PathVariable UUID id) {
        return ResponseEntity.ok(postingService.getPosting(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('RH') or hasRole('ADMIN')")
    public ResponseEntity<JobPostingResponse> update(
            @PathVariable UUID id,
            @RequestBody UpdateJobPostingRequest req) {
        return ResponseEntity.ok(postingService.updatePosting(id, req));
    }

    @PutMapping("/{id}/publish")
    @PreAuthorize("hasRole('RH') or hasRole('ADMIN')")
    public ResponseEntity<JobPostingResponse> publish(@PathVariable UUID id) {
        return ResponseEntity.ok(postingService.publishPosting(id));
    }

    @PutMapping("/{id}/close")
    @PreAuthorize("hasRole('RH') or hasRole('ADMIN')")
    public ResponseEntity<JobPostingResponse> close(@PathVariable UUID id) {
        return ResponseEntity.ok(postingService.closePosting(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        postingService.deletePosting(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/export/docx")
    public ResponseEntity<byte[]> exportDocx(@PathVariable UUID id) {
        byte[] content = exportService.exportPostingToDocx(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"offre-" + id + ".docx\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.wordprocessingml.document"))
                .body(content);
    }

    @PostMapping("/{id}/duplicate")
    @PreAuthorize("hasRole('RH') or hasRole('ADMIN')")
    public ResponseEntity<JobPostingResponse> duplicate(
            @PathVariable UUID id,
            Authentication auth) {
        return ResponseEntity.ok(postingService.duplicatePosting(id, auth.getName()));
    }

    @GetMapping("/{id}/export/fiche-fonction")
    public ResponseEntity<byte[]> exportFicheFonction(@PathVariable UUID id) {
        byte[] content = exportService.exportFicheFonctionDocx(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"fiche-fonction-" + id + ".docx\"")
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"))
                .body(content);
    }

    @PostMapping("/generate-description")
    @PreAuthorize("hasRole('RH') or hasRole('ADMIN')")
    public ResponseEntity<GenerateDescriptionResponse> generateDescription(
            @RequestBody GenerateDescriptionRequest req) {
        Map<?, ?> result = aiServiceClient.generateDescription(
                req.title(), req.department(), req.contractType(),
                req.location(), req.minExperience()
        ).block();
        if (result == null) {
            return ResponseEntity.ok(new GenerateDescriptionResponse("", ""));
        }
        return ResponseEntity.ok(new GenerateDescriptionResponse(
                (String) result.get("description"),
                (String) result.get("requirements")
        ));
    }
}
