package com.ventec.grh_backend.repository;

import com.ventec.grh_backend.domain.Application;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ApplicationRepository extends JpaRepository<Application, UUID> {

    List<Application> findByCandidateId(UUID candidateId);

    List<Application> findByJobPostingIdOrderByAiScoreDesc(UUID jobPostingId);

    Optional<Application> findByCandidateIdAndJobPostingId(UUID candidateId, UUID jobPostingId);

    long countByJobPostingId(UUID jobPostingId);

    long countByStatus(String status);

    List<Application> findByJobPostingIdAndStatusOrderByAiScoreDesc(UUID jobPostingId, String status);
}
