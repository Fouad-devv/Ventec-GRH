package com.ventec.grh_backend.controller;

import com.ventec.grh_backend.dto.request.ScheduleInterviewRequest;
import com.ventec.grh_backend.dto.request.UpdateInterviewRequest;
import com.ventec.grh_backend.dto.response.InterviewResponse;
import com.ventec.grh_backend.service.InterviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/interviews")
@RequiredArgsConstructor
@PreAuthorize("hasRole('RH') or hasRole('MANAGER') or hasRole('ADMIN')")
public class InterviewController {

    private final InterviewService interviewService;

    @PostMapping
    public ResponseEntity<InterviewResponse> schedule(
            @Valid @RequestBody ScheduleInterviewRequest req,
            Authentication auth) {
        return ResponseEntity.ok(interviewService.scheduleInterview(req, auth.getName()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<InterviewResponse> get(@PathVariable UUID id) {
        return ResponseEntity.ok(interviewService.getInterview(id));
    }

    @GetMapping("/application/{applicationId}")
    public ResponseEntity<List<InterviewResponse>> getByApplication(@PathVariable UUID applicationId) {
        return ResponseEntity.ok(interviewService.getInterviewsByApplication(applicationId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<InterviewResponse> update(
            @PathVariable UUID id,
            @RequestBody UpdateInterviewRequest req) {
        return ResponseEntity.ok(interviewService.updateInterview(id, req));
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<InterviewResponse> cancel(@PathVariable UUID id) {
        return ResponseEntity.ok(interviewService.cancelInterview(id));
    }
}
