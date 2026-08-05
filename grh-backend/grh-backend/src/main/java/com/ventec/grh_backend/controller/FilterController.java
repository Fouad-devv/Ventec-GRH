package com.ventec.grh_backend.controller;

import com.ventec.grh_backend.DTO.response.FilterJobResponse;
import com.ventec.grh_backend.service.FilterService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/filter")
@RequiredArgsConstructor
public class FilterController {

    private final FilterService filterService;

    @PostMapping("/{jobPostingId}")
    @PreAuthorize("hasRole('RH') or hasRole('ADMIN')")
    public ResponseEntity<FilterJobResponse> requestFilter(
            @PathVariable UUID jobPostingId,
            Authentication auth) {
        return ResponseEntity.ok(filterService.requestFilter(jobPostingId, auth.getName()));
    }

    @GetMapping("/{filterJobId}")
    @PreAuthorize("hasRole('RH') or hasRole('ADMIN')")
    public ResponseEntity<FilterJobResponse> getFilterJob(@PathVariable UUID filterJobId) {
        return ResponseEntity.ok(filterService.getFilterJob(filterJobId));
    }

    @GetMapping("/posting/{jobPostingId}")
    @PreAuthorize("hasRole('RH') or hasRole('ADMIN')")
    public ResponseEntity<List<FilterJobResponse>> getFilterJobsForPosting(@PathVariable UUID jobPostingId) {
        return ResponseEntity.ok(filterService.getFilterJobsForPosting(jobPostingId));
    }
}
