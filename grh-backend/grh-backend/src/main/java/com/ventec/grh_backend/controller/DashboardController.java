package com.ventec.grh_backend.controller;

import com.ventec.grh_backend.DTO.response.DashboardStatsResponse;
import com.ventec.grh_backend.DTO.response.YearBreakdownResponse;
import com.ventec.grh_backend.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Tableau de bord")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/dashboard")
@RequiredArgsConstructor
@PreAuthorize("hasRole('RH') or hasRole('ADMIN')")
public class DashboardController {

    private final DashboardService dashboardService;

    @Operation(summary = "Statistiques RH globales", description = "Retourne les KPIs : offres actives, candidats, entretiens à venir, taux de conversion, pipeline par statut, etc.")
    @GetMapping("/stats")
    public ResponseEntity<DashboardStatsResponse> getStats() {
        return ResponseEntity.ok(dashboardService.getStats());
    }

    @GetMapping("/year-breakdown")
    public ResponseEntity<YearBreakdownResponse> getYearBreakdown(@RequestParam int year) {
        return ResponseEntity.ok(dashboardService.getYearBreakdown(year));
    }
}
