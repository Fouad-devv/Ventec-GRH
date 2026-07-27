package com.ventec.grh_backend.controller;

import com.ventec.grh_backend.DTO.request.UpdateApplicationStatusRequest;
import com.ventec.grh_backend.DTO.response.ApplicationResponse;
import com.ventec.grh_backend.service.ApplicationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/applications")
@RequiredArgsConstructor
@PreAuthorize("hasRole('RH') or hasRole('MANAGER') or hasRole('ADMIN')")
public class ApplicationController {

    private final ApplicationService applicationService;

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
}
