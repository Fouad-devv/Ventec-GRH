package com.ventec.grh_backend.DTO.request;

import jakarta.validation.constraints.NotBlank;

public record SyncUserRequest(
        @NotBlank String keycloakId,
        @NotBlank String email,
        String firstName,
        String lastName,
        @NotBlank String role,
        String department
) {}
