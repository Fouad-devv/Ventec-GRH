package com.ventec.grh_backend.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public record UserResponse(
        UUID id,
        String keycloakId,
        String email,
        String firstName,
        String lastName,
        String role,
        String department,
        Boolean active,
        OffsetDateTime createdAt
) {}
