package com.ventec.grh_backend.controller;

import com.ventec.grh_backend.DTO.request.UpdateApplicationStatusRequest;
import com.ventec.grh_backend.DTO.response.ApplicationResponse;
import com.ventec.grh_backend.service.ApplicationService;
import com.ventec.grh_backend.service.ExportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/applications")
@RequiredArgsConstructor
@PreAuthorize("hasRole('RH') or hasRole('MANAGER') or hasRole('ADMIN')")
public class ApplicationController {

    private final ApplicationService applicationService;
    private final ExportService exportService;

    @GetMapping("/{id}")
    public ResponseEntity<ApplicationResponse> get(@PathVariable UUID id) {
        return ResponseEntity.ok(applicationService.getApplication(id));
    }

    @GetMapping("/posting/{jobPostingId}")
    public ResponseEntity<List<ApplicationResponse>> getByPosting(@PathVariable UUID jobPostingId) {
        return ResponseEntity.ok(applicationService.getApplicationsByPosting(jobPostingId));
    }

    @GetMapping("/candidate/{candidateId}")
    public ResponseEntity<List<ApplicationResponse>> getByCandidate(@PathVariable UUID candidateId) {
        return ResponseEntity.ok(applicationService.getApplicationsByCandidate(candidateId));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<ApplicationResponse> updateStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateApplicationStatusRequest req,
            Authentication auth) {
        return ResponseEntity.ok(applicationService.updateStatus(id, req, auth.getName()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('RH') or hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        applicationService.deleteApplication(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/posting/{jobPostingId}/send-rejection-emails")
    @PreAuthorize("hasRole('RH') or hasRole('ADMIN')")
    public ResponseEntity<Map<String, Integer>> sendRejectionEmails(@PathVariable UUID jobPostingId) {
        return ResponseEntity.ok(applicationService.sendRejectionEmails(jobPostingId));
    }

    @PostMapping("/posting/{jobPostingId}/send-interview-notifications")
    @PreAuthorize("hasRole('RH') or hasRole('ADMIN')")
    public ResponseEntity<Map<String, Integer>> sendInterviewNotifications(@PathVariable UUID jobPostingId) {
        return ResponseEntity.ok(applicationService.sendInterviewNotifications(jobPostingId));
    }

    @GetMapping("/{id}/documents-list")
    public ResponseEntity<byte[]> exportDocumentsList(@PathVariable UUID id) {
        byte[] content = exportService.exportDocumentsListDocxByApplication(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"liste-documents-" + id + ".docx\"")
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"))
                .body(content);
    }

    @GetMapping("/{id}/documents-list-pdf")
    public ResponseEntity<byte[]> exportDocumentsListPdf(@PathVariable UUID id) {
        byte[] content = exportService.exportDocumentsListPdfByApplication(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"liste-documents-" + id + ".pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(content);
    }
}
