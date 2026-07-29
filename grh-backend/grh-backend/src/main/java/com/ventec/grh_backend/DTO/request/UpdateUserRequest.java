package com.ventec.grh_backend.DTO.request;

import jakarta.validation.constraints.NotBlank;

public record UpdateUserRequest(
        String firstName,
        String lastName,
        @NotBlank String role,
        String department
) {}
