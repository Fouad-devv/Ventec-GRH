package com.ventec.grh_backend.DTO.request;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record UpdateInterviewRequest(
        OffsetDateTime scheduledAt,
        Integer durationMinutes,
        String type,
        String locationOrLink,
        List<UUID> interviewerIds,
        String status,
        String notes
) {}
