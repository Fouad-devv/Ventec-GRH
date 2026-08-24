package com.ventec.grh_backend.controller;

import com.ventec.grh_backend.DTO.response.CandidateResponse;
import com.ventec.grh_backend.DTO.response.ExtractCvResponse;
import com.ventec.grh_backend.service.AiServiceClient;
import com.ventec.grh_backend.service.CandidateService;
import com.ventec.grh_backend.service.StorageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
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

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Tag(name = "Candidats")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/candidates")
@RequiredArgsConstructor
@PreAuthorize("hasRole('RH') or hasRole('ADMIN')")
public class CandidateController {

    private final CandidateService candidateService;
    private final StorageService storageService;
    private final AiServiceClient aiServiceClient;

    @Operation(summary = "Lister les candidats", description = "Retourne une page de candidats, filtrable par offre ou recherche texte")
    @GetMapping
    public ResponseEntity<Page<CandidateResponse>> getAll(
            @Parameter(description = "Filtrer par ID d'offre") @RequestParam(required = false) UUID postingId,
            @Parameter(description = "Recherche par nom / email") @RequestParam(required = false) String search,
            Pageable pageable) {
        return ResponseEntity.ok(candidateService.getAllCandidates(postingId, search, pageable));
    }

    @Operation(summary = "Créer un candidat", description = "Crée un candidat manuellement avec CV optionnel")
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

    @Operation(summary = "Détail d'un candidat",
               description = "Retourne le profil complet : informations personnelles (nom, email, téléphone, LinkedIn, localisation), compétences extraites, années d'expérience, formation, poste actuel et chemin du CV")
    @ApiResponse(responseCode = "404", description = "Candidat introuvable")
    @GetMapping("/{id}")
    public ResponseEntity<CandidateResponse> get(@Parameter(description = "ID du candidat") @PathVariable UUID id) {
        return ResponseEntity.ok(candidateService.getCandidate(id));
    }

    @Operation(summary = "Modifier un candidat",
               description = "Met à jour les informations personnelles du candidat (nom, email, téléphone, LinkedIn, localisation). Seuls les champs fournis sont mis à jour, les autres restent inchangés")
    @PutMapping("/{id}")
    public ResponseEntity<CandidateResponse> update(
            @Parameter(description = "ID du candidat") @PathVariable UUID id,
            @RequestParam(required = false) String firstName,
            @RequestParam(required = false) String lastName,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String phone,
            @RequestParam(required = false) String linkedinUrl,
            @RequestParam(required = false) String location) {
        return ResponseEntity.ok(
                candidateService.updateCandidate(id, firstName, lastName, email, phone, linkedinUrl, location));
    }

    @Operation(summary = "Mettre à jour le statut de contact d'un candidat")
    @PatchMapping("/{id}/contacted")
    public ResponseEntity<CandidateResponse> updateContacted(
            @Parameter(description = "ID du candidat") @PathVariable UUID id,
            @RequestBody Map<String, Boolean> body) {
        boolean contacted = Boolean.TRUE.equals(body.get("contacted"));
        return ResponseEntity.ok(candidateService.updateContacted(id, contacted));
    }

    @Operation(summary = "Supprimer un candidat",
               description = "Supprime définitivement le candidat ainsi que son CV stocké et toutes ses candidatures. Action irréversible")
    @ApiResponse(responseCode = "204", description = "Candidat supprimé")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('RH') or hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@Parameter(description = "ID du candidat") @PathVariable UUID id) {
        candidateService.deleteCandidate(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Extraire les données d'un CV (IA)", description = "Envoie un fichier CV au service IA et retourne compétences, expérience, formation extraites")
    @PostMapping(value = "/extract-cv", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ExtractCvResponse> extractCv(@RequestPart MultipartFile file) {
        Map<?, ?> result = aiServiceClient.extractCvFile(file).block();
        if (result == null) {
            return ResponseEntity.ok(new ExtractCvResponse(List.of(), null, null, null, null));
        }
        @SuppressWarnings("unchecked")
        List<String> skills = result.get("skills") instanceof List<?> l
                ? (List<String>) l : List.of();
        Integer expYears = result.get("experience_years") instanceof Number n
                ? n.intValue() : null;
        return ResponseEntity.ok(new ExtractCvResponse(
                skills,
                expYears,
                (String) result.get("education"),
                (String) result.get("current_position"),
                (String) result.get("location")
        ));
    }

    @Operation(summary = "Télécharger le CV d'un candidat",
               description = "Retourne le fichier CV original du candidat (PDF). Déclenche un téléchargement via l'en-tête Content-Disposition")
    @ApiResponse(responseCode = "200", description = "Fichier CV en téléchargement")
    @GetMapping("/{id}/cv")
    public ResponseEntity<Resource> downloadCv(@Parameter(description = "ID du candidat") @PathVariable UUID id) {
        CandidateResponse candidate = candidateService.getCandidate(id);
        Resource resource = storageService.loadAsResource(candidate.cvPath());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + resource.getFilename() + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(resource);
    }
}
