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
        String status,
        LocalDate deadline
) {}
