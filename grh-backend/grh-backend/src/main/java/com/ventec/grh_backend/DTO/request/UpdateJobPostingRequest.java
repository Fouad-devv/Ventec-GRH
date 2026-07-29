package com.ventec.grh_backend.DTO.request;

import java.time.LocalDate;

public record UpdateJobPostingRequest(
        String title,
        String department,
        String location,
        String contractType,
        String description,
        String requirements,
        Integer minExperience,
        Integer minAge,
        Integer maxAge,
        String freeFilterPrompt,
        String skillsWeights,
        String status,
        LocalDate deadline
) {}
