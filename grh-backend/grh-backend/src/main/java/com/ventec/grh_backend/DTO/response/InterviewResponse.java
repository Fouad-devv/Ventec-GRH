package com.ventec.grh_backend.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public record InterviewResponse(
        UUID id,
        UUID applicationId,
        OffsetDateTime scheduledAt,
        Integer durationMinutes,
        String type,
        String locationOrLink,
        String interviewerIds,
        String status,
        String notes,
        OffsetDateTime createdAt
) {}
