package com.ventec.grh_backend.controller;

import com.ventec.grh_backend.DTO.response.FilterJobResponse;
import com.ventec.grh_backend.service.FilterService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Tag(name = "Filtrage IA")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/filter")
@RequiredArgsConstructor
public class FilterController {

    private final FilterService filterService;

    @Operation(summary = "Lancer le filtrage IA", description = "Démarre le scoring asynchrone des candidats non encore évalués pour une offre. Retourne un FilterJob avec statut RUNNING.")
    @PostMapping("/{jobPostingId}")
    @PreAuthorize("hasRole('RH') or hasRole('ADMIN')")
    public ResponseEntity<FilterJobResponse> requestFilter(
            @Parameter(description = "ID de l'offre à filtrer") @PathVariable UUID jobPostingId,
            Authentication auth) {
        return ResponseEntity.ok(filterService.requestFilter(jobPostingId, auth.getName()));
    }

    @Operation(summary = "Statut d'un job de filtrage", description = "Permet de poller l'avancement d'un FilterJob (PENDING → RUNNING → DONE/ERROR)")
    @GetMapping("/{filterJobId}")
    @PreAuthorize("hasRole('RH') or hasRole('ADMIN')")
    public ResponseEntity<FilterJobResponse> getFilterJob(@Parameter(description = "ID du FilterJob") @PathVariable UUID filterJobId) {
        return ResponseEntity.ok(filterService.getFilterJob(filterJobId));
    }

    @Operation(summary = "Historique des filtrages d'une offre", description = "Liste tous les FilterJobs lancés pour une offre, du plus récent au plus ancien")
    @GetMapping("/posting/{jobPostingId}")
    @PreAuthorize("hasRole('RH') or hasRole('ADMIN')")
    public ResponseEntity<List<FilterJobResponse>> getFilterJobsForPosting(@Parameter(description = "ID de l'offre") @PathVariable UUID jobPostingId) {
        return ResponseEntity.ok(filterService.getFilterJobsForPosting(jobPostingId));
    }
}
