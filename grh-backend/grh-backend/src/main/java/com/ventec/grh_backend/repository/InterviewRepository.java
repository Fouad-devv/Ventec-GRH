package com.ventec.grh_backend.repository;

import com.ventec.grh_backend.domain.Interview;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public interface InterviewRepository extends JpaRepository<Interview, UUID> {

    List<Interview> findByApplicationId(UUID applicationId);

    List<Interview> findAllByOrderByScheduledAtDesc();

    List<Interview> findByStatusAndScheduledAtBetween(String status, OffsetDateTime from, OffsetDateTime to);
}
