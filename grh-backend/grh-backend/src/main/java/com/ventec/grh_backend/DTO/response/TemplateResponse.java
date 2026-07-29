package com.ventec.grh_backend.DTO.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public record TemplateResponse(
        UUID id,
        String name,
        String type,
        String subject,
        String content,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
