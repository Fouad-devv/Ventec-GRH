package com.ventec.grh_backend.DTO.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public record AuditLogResponse(
        UUID id,
        String action,
        String entityType,
        String entityId,
        String performedBy,
        String performedByName,
        String details,
        OffsetDateTime timestamp
) {}
