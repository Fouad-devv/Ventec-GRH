package com.ventec.grh_backend.DTO.request;

import jakarta.validation.constraints.NotNull;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record ScheduleInterviewRequest(
        @NotNull UUID applicationId,
        @NotNull OffsetDateTime scheduledAt,
        Integer durationMinutes,
        String type,
        String locationOrLink,
        List<UUID> interviewerIds,
        String notes
) {}
