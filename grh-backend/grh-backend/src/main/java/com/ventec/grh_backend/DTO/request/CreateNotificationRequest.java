package com.ventec.grh_backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record CreateNotificationRequest(
        @NotNull UUID userId,
        @NotBlank String type,
        @NotBlank String title,
        String body,
        String referenceType,
        UUID referenceId
) {}
