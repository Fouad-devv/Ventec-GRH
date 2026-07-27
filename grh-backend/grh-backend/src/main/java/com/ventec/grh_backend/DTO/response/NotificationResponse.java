package com.ventec.grh_backend.DTO.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public record NotificationResponse(
        UUID id,
        UUID userId,
        String type,
        String title,
        String body,
        Boolean read,
        String referenceType,
        UUID referenceId,
        OffsetDateTime createdAt
) {}
