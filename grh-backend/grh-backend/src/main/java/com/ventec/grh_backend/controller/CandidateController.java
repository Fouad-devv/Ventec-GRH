package com.ventec.grh_backend.controller;

import com.ventec.grh_backend.DTO.response.CandidateResponse;
import com.ventec.grh_backend.service.CandidateService;
import com.ventec.grh_backend.service.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/candidates")
@RequiredArgsConstructor
@PreAuthorize("hasRole('RH') or hasRole('MANAGER') or hasRole('ADMIN')")
public class CandidateController {

    private final CandidateService candidateService;
    private final StorageService storageService;

    @GetMapping
    public ResponseEntity<Page<CandidateResponse>> getAll(Pageable pageable) {
        return ResponseEntity.ok(candidateService.getAllCandidates(pageable));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CandidateResponse> create(
            @RequestPart(required = false) MultipartFile cv,
            @RequestParam String firstName,
            @RequestParam String lastName,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String phone,
            @RequestParam(required = false) String linkedinUrl,
            @RequestParam(required = false) String location) {
        return ResponseEntity.ok(
                candidateService.createCandidate(cv, firstName, lastName, email, phone, linkedinUrl, location));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CandidateResponse> get(@PathVariable UUID id) {
        return ResponseEntity.ok(candidateService.getCandidate(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CandidateResponse> update(
            @PathVariable UUID id,
            @RequestParam(required = false) String firstName,
            @RequestParam(required = false) String lastName,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String phone,
            @RequestParam(required = false) String linkedinUrl,
            @RequestParam(required = false) String location) {
        return ResponseEntity.ok(
                candidateService.updateCandidate(id, firstName, lastName, email, phone, linkedinUrl, location));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        candidateService.deleteCandidate(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/cv")
    public ResponseEntity<Resource> downloadCv(@PathVariable UUID id) {
        CandidateResponse candidate = candidateService.getCandidate(id);
        Resource resource = storageService.loadAsResource(candidate.cvPath());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + resource.getFilename() + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(resource);
    }
}
