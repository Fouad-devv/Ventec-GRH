package com.ventec.grh_backend.DTO.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public record FilterJobResponse(
        UUID id,
        UUID jobPostingId,
        String status,
        UUID requestedById,
        OffsetDateTime requestedAt,
        OffsetDateTime completedAt,
        String result,
        String errorMessage
) {}
