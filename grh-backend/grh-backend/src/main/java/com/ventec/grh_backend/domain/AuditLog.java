package com.ventec.grh_backend.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "audit_logs")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 100)
    private String action;

    @Column(name = "entity_type", length = 50)
    private String entityType;

    @Column(name = "entity_id")
    private String entityId;

    @Column(name = "performed_by")
    private String performedBy;

    @Column(name = "performed_by_name")
    private String performedByName;

    @Column(columnDefinition = "TEXT")
    private String details;

    @Column(nullable = false)
    private OffsetDateTime timestamp;
}
