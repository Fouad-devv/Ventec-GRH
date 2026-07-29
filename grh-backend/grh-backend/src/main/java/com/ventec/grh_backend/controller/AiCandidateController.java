package com.ventec.grh_backend.controller;

import com.ventec.grh_backend.domain.Candidate;
import com.ventec.grh_backend.repository.CandidateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

/**
 * Public (no-auth) endpoint used by the FastAPI AI service to fetch anonymized
 * candidate data for scoring. Returns only skills/experience/CV text — no personal info.
 */
@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
public class AiCandidateController {

    private final CandidateRepository candidateRepository;

    @GetMapping("/candidates/{id}")
    public ResponseEntity<Map<String, Object>> getCandidateForAi(@PathVariable UUID id) {
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
