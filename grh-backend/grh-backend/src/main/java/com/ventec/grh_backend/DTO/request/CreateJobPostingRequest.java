package com.ventec.grh_backend.DTO.request;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;

public record CreateJobPostingRequest(
        @NotBlank String title,
        String department,
        String location,
        String contractType,
        String description,
        String requirements,
        Integer minExperience,
        Integer minAge,
        Integer maxAge,
        String freeFilterPrompt,
        LocalDate deadline
) {}
