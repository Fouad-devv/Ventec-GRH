package com.ventec.grh_backend.controller;

import com.ventec.grh_backend.DTO.request.UpdateDocumentChecklistRequest;
import com.ventec.grh_backend.DTO.response.DocumentChecklistResponse;
import com.ventec.grh_backend.service.DocumentChecklistService;
import com.ventec.grh_backend.service.ExportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Tag(name = "Checklist documents")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/checklists")
@RequiredArgsConstructor
@PreAuthorize("hasRole('RH') or hasRole('ADMIN')")
public class DocumentChecklistController {

    private final DocumentChecklistService checklistService;
    private final ExportService exportService;

    @Operation(summary = "Obtenir ou créer la checklist", description = "Retourne la checklist de documents d'un candidat pour une offre, la crée si elle n'existe pas")
    @GetMapping("/candidate/{candidateId}/posting/{jobPostingId}")
    public ResponseEntity<DocumentChecklistResponse> getOrCreate(
            @Parameter(description = "ID du candidat") @PathVariable UUID candidateId,
            @Parameter(description = "ID de l'offre") @PathVariable UUID jobPostingId) {
        return ResponseEntity.ok(checklistService.getOrCreate(candidateId, jobPostingId));
    }

    @Operation(summary = "Mettre à jour la checklist", description = "Coche ou décoche les documents fournis par le candidat")
    @PutMapping("/candidate/{candidateId}/posting/{jobPostingId}")
    public ResponseEntity<DocumentChecklistResponse> update(
            @Parameter(description = "ID du candidat") @PathVariable UUID candidateId,
            @Parameter(description = "ID de l'offre") @PathVariable UUID jobPostingId,
            @Valid @RequestBody UpdateDocumentChecklistRequest req) {
        return ResponseEntity.ok(checklistService.updateDocuments(candidateId, jobPostingId, req));
    }

    @Operation(summary = "Toutes les checklists d'un candidat",
               description = "Retourne la liste de toutes les checklists de documents du candidat, une par offre à laquelle il a postulé")
    @GetMapping("/candidate/{candidateId}")
    public ResponseEntity<List<DocumentChecklistResponse>> getByCandidate(@Parameter(description = "ID du candidat") @PathVariable UUID candidateId) {
        return ResponseEntity.ok(checklistService.getByCandidate(candidateId));
    }

    @Operation(summary = "Exporter la checklist (DOCX)",
               description = "Génère au format Word la liste des documents à fournir pour cette candidature, avec les cases cochées/décochées selon l'état actuel de la checklist")
    @GetMapping("/candidate/{candidateId}/posting/{jobPostingId}/export/docx")
    public ResponseEntity<byte[]> exportDocx(
            @Parameter(description = "ID du candidat") @PathVariable UUID candidateId,
            @Parameter(description = "ID de l'offre") @PathVariable UUID jobPostingId) {
        byte[] content = exportService.exportDocumentsListDocx(candidateId, jobPostingId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"documents-" + candidateId + ".docx\"")
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"))
                .body(content);
    }

    @Operation(summary = "Exporter la checklist (PDF)",
               description = "Génère au format PDF la liste des documents à fournir pour cette candidature")
    @GetMapping("/candidate/{candidateId}/posting/{jobPostingId}/export/pdf")
    public ResponseEntity<byte[]> exportPdf(
            @Parameter(description = "ID du candidat") @PathVariable UUID candidateId,
            @Parameter(description = "ID de l'offre") @PathVariable UUID jobPostingId) {
        byte[] content = exportService.exportDocumentsListPdf(candidateId, jobPostingId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"documents-" + candidateId + ".pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(content);
    }
}
