package com.ventec.grh_backend.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public record DocumentChecklistResponse(
        UUID id,
        UUID candidateId,
        UUID jobPostingId,
        String documents,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
