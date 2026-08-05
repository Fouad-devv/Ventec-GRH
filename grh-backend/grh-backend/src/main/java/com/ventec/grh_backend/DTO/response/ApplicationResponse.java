package com.ventec.grh_backend.DTO.response;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record ApplicationResponse(
        UUID id,
        UUID candidateId,
        String candidateFirstName,
        String candidateLastName,
        String candidateEmail,
        UUID jobPostingId,
        String jobPostingTitle,
        String status,
        BigDecimal aiScore,
        String aiSummary,
        String notes,
        OffsetDateTime appliedAt,
        OffsetDateTime updatedAt,
        OffsetDateTime rejectionEmailSentAt
) {}
