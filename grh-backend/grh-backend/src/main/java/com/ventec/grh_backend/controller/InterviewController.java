package com.ventec.grh_backend.controller;

import com.ventec.grh_backend.DTO.request.ScheduleInterviewRequest;
import com.ventec.grh_backend.DTO.request.UpdateInterviewRequest;
import com.ventec.grh_backend.DTO.response.InterviewResponse;
import com.ventec.grh_backend.service.ExportService;
import com.ventec.grh_backend.service.InterviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Tag(name = "Entretiens")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/interviews")
@RequiredArgsConstructor
@PreAuthorize("hasRole('RH') or hasRole('ADMIN')")
public class InterviewController {

    private final InterviewService interviewService;
    private final ExportService exportService;

    @Operation(summary = "Liste tous les entretiens", description = "Retourne tous les entretiens triés par date décroissante")
    @GetMapping
    public ResponseEntity<List<InterviewResponse>> getAll() {
        return ResponseEntity.ok(interviewService.getAllInterviews());
    }

    @Operation(summary = "Planifier un entretien", description = "Crée un entretien pour une candidature avec date, heure et interviewers")
    @PostMapping
    public ResponseEntity<InterviewResponse> schedule(
            @Valid @RequestBody ScheduleInterviewRequest req,
            Authentication auth) {
        return ResponseEntity.ok(interviewService.scheduleInterview(req, auth.getName()));
    }

    @Operation(summary = "Détail d'un entretien")
    @GetMapping("/{id}")
    public ResponseEntity<InterviewResponse> get(@Parameter(description = "ID de l'entretien") @PathVariable UUID id) {
        return ResponseEntity.ok(interviewService.getInterview(id));
    }

    @Operation(summary = "Entretiens d'une candidature")
    @GetMapping("/application/{applicationId}")
    public ResponseEntity<List<InterviewResponse>> getByApplication(@Parameter(description = "ID de la candidature") @PathVariable UUID applicationId) {
        return ResponseEntity.ok(interviewService.getInterviewsByApplication(applicationId));
    }

    @Operation(summary = "Modifier un entretien")
    @PutMapping("/{id}")
    public ResponseEntity<InterviewResponse> update(
            @Parameter(description = "ID de l'entretien") @PathVariable UUID id,
            @RequestBody UpdateInterviewRequest req) {
        return ResponseEntity.ok(interviewService.updateInterview(id, req));
    }

    @Operation(summary = "Annuler un entretien")
    @PutMapping("/{id}/cancel")
    public ResponseEntity<InterviewResponse> cancel(@Parameter(description = "ID de l'entretien") @PathVariable UUID id) {
        return ResponseEntity.ok(interviewService.cancelInterview(id));
    }

    @Operation(summary = "Générer les questions d'entretien par IA", description = "Génère automatiquement des questions d'entretien adaptées au poste et au profil du candidat")
    @PostMapping("/{id}/questions/generate")
    public ResponseEntity<InterviewResponse> generateQuestions(@Parameter(description = "ID de l'entretien") @PathVariable UUID id) {
        return ResponseEntity.ok(interviewService.generateAndStoreQuestions(id));
    }

    @Operation(summary = "Exporter le guide d'entretien (PDF)")
    @ApiResponse(responseCode = "200", description = "PDF généré avec questions et éléments de l'entretien")
    @GetMapping("/{id}/export/pdf")
    public ResponseEntity<byte[]> exportPdf(@Parameter(description = "ID de l'entretien") @PathVariable UUID id) {
        byte[] content = exportService.exportInterviewToPdf(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"entretien-" + id + ".pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(content);
    }
}
