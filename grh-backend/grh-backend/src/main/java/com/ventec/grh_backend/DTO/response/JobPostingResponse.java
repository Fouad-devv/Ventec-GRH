package com.ventec.grh_backend.DTO.response;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record JobPostingResponse(
        UUID id,
        String title,
        String department,
        String location,
        String contractType,
        String description,
        String requirements,
        Integer minExperience,
        String status,
        UUID createdById,
        String createdByName,
        LocalDate deadline,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
