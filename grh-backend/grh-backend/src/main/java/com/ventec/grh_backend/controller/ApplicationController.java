package com.ventec.grh_backend.controller;

import com.ventec.grh_backend.DTO.request.UpdateApplicationStatusRequest;
import com.ventec.grh_backend.DTO.response.ApplicationResponse;
import com.ventec.grh_backend.service.ApplicationService;
import com.ventec.grh_backend.service.ExportService;
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
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Tag(name = "Candidatures")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/applications")
@RequiredArgsConstructor
@PreAuthorize("hasRole('RH') or hasRole('ADMIN')")
public class ApplicationController {

    private final ApplicationService applicationService;
    private final ExportService exportService;

    @Operation(summary = "Détail d'une candidature",
               description = "Retourne la candidature complète : statut actuel, score IA (0–100), résumé IA de l'évaluation, date de candidature et historique des changements de statut")
    @GetMapping("/{id}")
    public ResponseEntity<ApplicationResponse> get(@Parameter(description = "ID de la candidature") @PathVariable UUID id) {
        return ResponseEntity.ok(applicationService.getApplication(id));
    }

    @Operation(summary = "Candidatures par offre", description = "Liste toutes les candidatures d'une offre avec scores IA")
    @GetMapping("/posting/{jobPostingId}")
    public ResponseEntity<List<ApplicationResponse>> getByPosting(@Parameter(description = "ID de l'offre") @PathVariable UUID jobPostingId) {
        return ResponseEntity.ok(applicationService.getApplicationsByPosting(jobPostingId));
    }

    @Operation(summary = "Candidatures par candidat", description = "Liste toutes les candidatures d'un candidat")
    @GetMapping("/candidate/{candidateId}")
    public ResponseEntity<List<ApplicationResponse>> getByCandidate(@Parameter(description = "ID du candidat") @PathVariable UUID candidateId) {
        return ResponseEntity.ok(applicationService.getApplicationsByCandidate(candidateId));
    }

    @Operation(summary = "Changer le statut d'une candidature", description = "Statuts possibles : PENDING, SCREENING, SHORTLISTED, INTERVIEW, OFFERED, HIRED, REJECTED")
    @PutMapping("/{id}/status")
    public ResponseEntity<ApplicationResponse> updateStatus(
            @Parameter(description = "ID de la candidature") @PathVariable UUID id,
            @Valid @RequestBody UpdateApplicationStatusRequest req,
            Authentication auth) {
        return ResponseEntity.ok(applicationService.updateStatus(id, req, auth.getName()));
    }

    @Operation(summary = "Supprimer une candidature",
               description = "Supprime uniquement la candidature sans toucher au profil du candidat. Action irréversible")
    @ApiResponse(responseCode = "204", description = "Candidature supprimée")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('RH') or hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@Parameter(description = "ID de la candidature") @PathVariable UUID id) {
        applicationService.deleteApplication(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Envoyer emails de refus", description = "Envoie un email de refus à tous les candidats REJECTED de l'offre")
    @PostMapping("/posting/{jobPostingId}/send-rejection-emails")
    @PreAuthorize("hasRole('RH') or hasRole('ADMIN')")
    public ResponseEntity<Map<String, Integer>> sendRejectionEmails(
            @Parameter(description = "ID de l'offre") @PathVariable UUID jobPostingId, Authentication auth) {
        return ResponseEntity.ok(applicationService.sendRejectionEmails(jobPostingId, jwtSub(auth)));
    }

    @Operation(summary = "Envoyer convocations d'entretien", description = "Envoie les convocations par email aux candidats SHORTLISTED")
    @PostMapping("/posting/{jobPostingId}/send-interview-notifications")
    @PreAuthorize("hasRole('RH') or hasRole('ADMIN')")
    public ResponseEntity<Map<String, Integer>> sendInterviewNotifications(
            @Parameter(description = "ID de l'offre") @PathVariable UUID jobPostingId, Authentication auth) {
        return ResponseEntity.ok(applicationService.sendInterviewNotifications(jobPostingId, jwtSub(auth)));
    }

    private String jwtSub(Authentication auth) {
        return auth instanceof JwtAuthenticationToken jwtAuth
                ? jwtAuth.getToken().getSubject()
                : auth.getName();
    }

    @Operation(summary = "Exporter la liste de documents (DOCX)", description = "Génère la liste des documents requis pour le candidat au format Word")
    @GetMapping("/{id}/documents-list")
    public ResponseEntity<byte[]> exportDocumentsList(@Parameter(description = "ID de la candidature") @PathVariable UUID id) {
        byte[] content = exportService.exportDocumentsListDocxByApplication(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"liste-documents-" + id + ".docx\"")
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"))
                .body(content);
    }

    @Operation(summary = "Exporter la liste de documents (PDF)",
               description = "Génère au format PDF la liste des documents à fournir pour la candidature (basée sur la checklist remplie par le RH)")
    @GetMapping("/{id}/documents-list-pdf")
    public ResponseEntity<byte[]> exportDocumentsListPdf(@Parameter(description = "ID de la candidature") @PathVariable UUID id) {
        byte[] content = exportService.exportDocumentsListPdfByApplication(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"liste-documents-" + id + ".pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(content);
    }
}
