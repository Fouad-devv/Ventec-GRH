package com.ventec.grh_backend.DTO.response;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record EmailCandidatureResponse(
        UUID id,
        String senderEmail,
        String senderName,
        String subject,
        String status,
        BigDecimal confidence,
        UUID matchedPostingId,
        String matchedPostingTitle,
        UUID candidateId,
        String candidateName,
        OffsetDateTime receivedAt
) {}
