package com.ventec.grh_backend.controller;

import com.ventec.grh_backend.domain.Candidate;
import com.ventec.grh_backend.repository.CandidateRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@Tag(name = "Données IA")
@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
public class AiCandidateController {

    private final CandidateRepository candidateRepository;

    @Operation(summary = "Données anonymisées d'un candidat", description = "Retourne uniquement les données non personnelles d'un candidat (compétences, expérience, texte CV, formation) pour le scoring IA. Pas d'authentification utilisateur requise.")
    @GetMapping("/candidates/{id}")
    public ResponseEntity<Map<String, Object>> getCandidateForAi(@Parameter(description = "ID du candidat") @PathVariable UUID id) {
        Candidate c = candidateRepository.findById(id).orElse(null);
        if (c == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(Map.of(
                "cvExtractedText",   c.getCvExtractedText()   != null ? c.getCvExtractedText()   : "",
                "experienceYears",   c.getExperienceYears()   != null ? c.getExperienceYears()   : 0,
                "skills",            c.getSkills()            != null ? c.getSkills()            : "",
                "education",         c.getEducation()         != null ? c.getEducation()         : "",
                "currentPosition",   c.getCurrentPosition()   != null ? c.getCurrentPosition()   : ""
        ));
    }
}
