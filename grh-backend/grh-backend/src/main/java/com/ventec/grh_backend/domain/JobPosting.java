package com.ventec.grh_backend.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "job_postings")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class JobPosting {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String title;

    private String department;
    private String location;

    @Column(name = "contract_type")
    private String contractType;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String requirements;

    @Column(name = "min_experience")
    private Integer minExperience;

    @Column(name = "skills_weights", columnDefinition = "jsonb")
    private String skillsWeights;

    @Column(nullable = false)
    private String status = "DRAFT";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    private LocalDate deadline;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    void prePersist() {
        createdAt = updatedAt = OffsetDateTime.now();
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
