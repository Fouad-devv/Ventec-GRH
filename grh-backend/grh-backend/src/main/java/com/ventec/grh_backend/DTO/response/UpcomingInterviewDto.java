package com.ventec.grh_backend.DTO.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public record UpcomingInterviewDto(
        UUID interviewId,
        UUID applicationId,
        UUID candidateId,
        String candidateFirstName,
        String candidateLastName,
        String jobPostingTitle,
        OffsetDateTime scheduledAt,
        Integer durationMinutes,
        String type,
        String applicationStatus
) {}
