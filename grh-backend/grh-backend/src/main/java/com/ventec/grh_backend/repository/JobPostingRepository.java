package com.ventec.grh_backend.repository;

import com.ventec.grh_backend.domain.JobPosting;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface JobPostingRepository extends JpaRepository<JobPosting, UUID> {

    List<JobPosting> findByStatusOrderByCreatedAtDesc(String status);

    List<JobPosting> findByCreatedByIdOrderByCreatedAtDesc(UUID createdById);

    Page<JobPosting> findByStatus(String status, Pageable pageable);

    Page<JobPosting> findByStatusIn(List<String> statuses, Pageable pageable);

    long countByStatus(String status);
}
