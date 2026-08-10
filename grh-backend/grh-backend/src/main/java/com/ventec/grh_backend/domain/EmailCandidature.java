package com.ventec.grh_backend.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "email_candidatures")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class EmailCandidature {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "sender_email", nullable = false)
    private String senderEmail;

    @Column(name = "sender_name")
    private String senderName;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String subject;

    /** MATCHED | DUPLICATE | NO_MATCH | NO_PDF */
    @Column(nullable = false)
    private String status;

    /** AI match confidence [0.0 – 1.0]; null for NO_PDF entries */
    @Column(precision = 4, scale = 2)
    private BigDecimal confidence;

    @Column(name = "matched_posting_id")
    private UUID matchedPostingId;

    @Column(name = "matched_posting_title")
    private String matchedPostingTitle;

    @Column(name = "candidate_id")
    private UUID candidateId;

    @Column(name = "candidate_name")
    private String candidateName;

    @Column(name = "received_at", nullable = false, updatable = false)
    private OffsetDateTime receivedAt;

    /** RFC 2822 Message-ID — globally unique per email, used to deduplicate across restarts. */
    @Column(name = "message_id", unique = true)
    private String messageId;

    @PrePersist
    void prePersist() {
        if (receivedAt == null) receivedAt = OffsetDateTime.now();
    }
}
