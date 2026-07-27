package com.ventec.grh_backend.DTO.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public record CandidateResponse(
        UUID id,
        String firstName,
        String lastName,
        String email,
        String phone,
        String linkedinUrl,
        String cvPath,
        String skills,
        Integer experienceYears,
        String education,
        String currentPosition,
        String location,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
