package com.ventec.grh_backend.repository;

import com.ventec.grh_backend.domain.FilterJob;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FilterJobRepository extends JpaRepository<FilterJob, UUID> {

    List<FilterJob> findByJobPostingIdOrderByRequestedAtDesc(UUID jobPostingId);

    Optional<FilterJob> findTopByJobPostingIdOrderByRequestedAtDesc(UUID jobPostingId);
}
