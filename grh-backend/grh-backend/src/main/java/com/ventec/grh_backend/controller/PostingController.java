package com.ventec.grh_backend.controller;

import com.ventec.grh_backend.DTO.request.CreateJobPostingRequest;
import com.ventec.grh_backend.DTO.request.GenerateDescriptionRequest;
import com.ventec.grh_backend.DTO.request.UpdateJobPostingRequest;
import com.ventec.grh_backend.DTO.response.ApplicationResponse;
import com.ventec.grh_backend.DTO.response.GenerateDescriptionResponse;
import com.ventec.grh_backend.DTO.response.ImportCvResult;
import com.ventec.grh_backend.DTO.response.JobPostingResponse;
import com.ventec.grh_backend.DTO.response.PostingHistoryResponse;
import com.ventec.grh_backend.service.AiServiceClient;
import com.ventec.grh_backend.service.ExportService;
import com.ventec.grh_backend.service.PostingService;
import com.ventec.grh_backend.service.StorageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.core.io.Resource;
import jakarta.validation.Valid;
import java.nio.file.Paths;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Tag(name = "Offres d'emploi")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/postings")
@RequiredArgsConstructor
public class PostingController {

    private final PostingService postingService;
    private final AiServiceClient aiServiceClient;
    private final ExportService exportService;
    private final StorageService storageService;

    @Operation(summary = "Historique des offres", description = "Liste toutes les offres avec leur historique de statut")
    @GetMapping("/history")
    public ResponseEntity<List<PostingHistoryResponse>> getHistory() {
        return ResponseEntity.ok(postingService.getHistory());
    }

    @Operation(summary = "Lister les offres", description = "Retourne une page d'offres, filtrable par statut (DRAFT, OPEN, CLOSED)")
    @GetMapping
    public ResponseEntity<Page<JobPostingResponse>> getAll(
            @Parameter(description = "Filtrer par statut : DRAFT, OPEN, CLOSED") @RequestParam(required = false) String status,
            Pageable pageable) {
        return ResponseEntity.ok(postingService.getAllPostings(status, pageable));
    }

    @Operation(summary = "Créer une offre", description = "Crée une nouvelle offre de recrutement (DRAFT par défaut)")
    @ApiResponse(responseCode = "200", description = "Offre créée")
    @PostMapping
    @PreAuthorize("hasRole('RH') or hasRole('ADMIN')")
    public ResponseEntity<JobPostingResponse> create(
            @Valid @RequestBody CreateJobPostingRequest req,
            Authentication auth) {
        return ResponseEntity.ok(postingService.createPosting(req, auth));
    }

    @Operation(summary = "Détail d'une offre",
               description = "Retourne le détail complet : titre, description du poste, exigences, contraintes d'âge, statut, fiche de fonction attachée et prompt libre IA utilisé pour le filtrage")
    @ApiResponse(responseCode = "404", description = "Offre introuvable")
    @GetMapping("/{id}")
    public ResponseEntity<JobPostingResponse> get(@Parameter(description = "ID de l'offre") @PathVariable UUID id) {
        return ResponseEntity.ok(postingService.getPosting(id));
    }

    @Operation(summary = "Modifier une offre",
               description = "Met à jour les champs de l'offre (titre, description, exigences, âge min/max, prompt IA libre, etc.). Seuls les champs fournis dans le body sont modifiés")
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('RH') or hasRole('ADMIN')")
    public ResponseEntity<JobPostingResponse> update(
            @Parameter(description = "ID de l'offre") @PathVariable UUID id,
            @RequestBody UpdateJobPostingRequest req) {
        return ResponseEntity.ok(postingService.updatePosting(id, req));
    }

    @Operation(summary = "Publier une offre", description = "Passe le statut de DRAFT à OPEN")
    @PutMapping("/{id}/publish")
    @PreAuthorize("hasRole('RH') or hasRole('ADMIN')")
    public ResponseEntity<JobPostingResponse> publish(@Parameter(description = "ID de l'offre") @PathVariable UUID id) {
        return ResponseEntity.ok(postingService.publishPosting(id));
    }

    @Operation(summary = "Clôturer une offre", description = "Passe le statut à CLOSED")
    @PutMapping("/{id}/close")
    @PreAuthorize("hasRole('RH') or hasRole('ADMIN')")
    public ResponseEntity<JobPostingResponse> close(@Parameter(description = "ID de l'offre") @PathVariable UUID id) {
        return ResponseEntity.ok(postingService.closePosting(id));
    }

    @Operation(summary = "Supprimer une offre",
               description = "Supprime définitivement l'offre ainsi que toutes les candidatures et FilterJobs associés. Action irréversible")
    @ApiResponse(responseCode = "204", description = "Offre supprimée")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('RH') or hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@Parameter(description = "ID de l'offre") @PathVariable UUID id) {
        postingService.deletePosting(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Exporter l'offre en DOCX", description = "Télécharge la fiche de poste au format Word")
    @ApiResponse(responseCode = "200", description = "Fichier DOCX généré")
    @GetMapping("/{id}/export/docx")
    public ResponseEntity<byte[]> exportDocx(@Parameter(description = "ID de l'offre") @PathVariable UUID id) {
        byte[] content = exportService.exportPostingToDocx(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"offre-" + id + ".docx\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.wordprocessingml.document"))
                .body(content);
    }

    @Operation(summary = "Dupliquer une offre", description = "Crée une copie DRAFT de l'offre")
    @PostMapping("/{id}/duplicate")
    @PreAuthorize("hasRole('RH') or hasRole('ADMIN')")
    public ResponseEntity<JobPostingResponse> duplicate(
            @Parameter(description = "ID de l'offre") @PathVariable UUID id,
            Authentication auth) {
        return ResponseEntity.ok(postingService.duplicatePosting(id, auth));
    }

    @Operation(summary = "Exporter la fiche de fonction",
               description = "Retourne le fichier importé si disponible, sinon génère un DOCX via l'IA.")
    @GetMapping("/{id}/export/fiche-fonction")
    public ResponseEntity<byte[]> exportFicheFonction(@Parameter(description = "ID de l'offre") @PathVariable UUID id) {
        String path = postingService.getPosting(id).ficheFonctionPath();
        if (path != null) {
            try {
                Resource resource = storageService.loadAsResource(path);
                String rawName = Paths.get(path).getFileName().toString();
                // Strip the UUID prefix added by StorageService (uuid_originalname)
                String filename = rawName.contains("_") ? rawName.substring(rawName.indexOf('_') + 1) : rawName;
                String lower = path.toLowerCase();
                MediaType mediaType = lower.endsWith(".pdf")  ? MediaType.APPLICATION_PDF
                        : lower.endsWith(".docx") ? MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
                        : lower.endsWith(".doc")  ? MediaType.parseMediaType("application/msword")
                        : MediaType.APPLICATION_OCTET_STREAM;
                return ResponseEntity.ok()
                        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                        .contentType(mediaType)
                        .body(resource.getInputStream().readAllBytes());
            } catch (Exception e) {
                throw new RuntimeException("Failed to read stored fiche de fonction", e);
            }
        }
        // No stored file — generate with AI
        byte[] content = exportService.exportFicheFonctionDocx(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"fiche-fonction-" + id + ".docx\"")
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"))
                .body(content);
    }

    @Operation(summary = "Uploader une fiche de fonction (PDF)", description = "Attache un PDF de fiche de fonction à l'offre")
    @PostMapping("/{id}/fiche-fonction")
    @PreAuthorize("hasRole('RH') or hasRole('ADMIN')")
    public ResponseEntity<JobPostingResponse> uploadFicheFonction(
            @Parameter(description = "ID de l'offre") @PathVariable UUID id,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(postingService.uploadFicheFonction(id, file));
    }

    @Operation(summary = "Générer la fiche de fonction par IA", description = "Génère automatiquement la fiche de fonction via l'IA et la stocke")
    @PostMapping("/{id}/generate-fiche-fonction")
    @PreAuthorize("hasRole('RH') or hasRole('ADMIN')")
    public ResponseEntity<JobPostingResponse> generateFicheFonction(@Parameter(description = "ID de l'offre") @PathVariable UUID id) {
        return ResponseEntity.ok(postingService.generateAndStoreFicheFonction(id));
    }

    @Operation(summary = "Importer des CVs", description = "Importe plusieurs CVs PDF et crée les candidatures associées à l'offre")
    @PostMapping("/{id}/import-cvs")
    @PreAuthorize("hasRole('RH') or hasRole('ADMIN')")
    public ResponseEntity<List<ImportCvResult>> importCvs(
            @Parameter(description = "ID de l'offre") @PathVariable UUID id,
            @RequestParam("files") List<MultipartFile> files) {
        return ResponseEntity.ok(postingService.importCvs(id, files));
    }

    @Operation(summary = "Générer description & exigences par IA", description = "Génère automatiquement la description et les exigences du poste via l'IA")
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
