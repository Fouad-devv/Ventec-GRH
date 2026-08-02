package com.ventec.grh_backend.repository;

import com.ventec.grh_backend.domain.Application;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ApplicationRepository extends JpaRepository<Application, UUID> {

    List<Application> findByCandidateId(UUID candidateId);

    List<Application> findByJobPostingIdOrderByAiScoreDesc(UUID jobPostingId);

    Optional<Application> findByCandidateIdAndJobPostingId(UUID candidateId, UUID jobPostingId);

    long countByJobPostingId(UUID jobPostingId);

    long countByJobPostingIdAndStatus(UUID jobPostingId, String status);

    long countByStatus(String status);

    List<Application> findByJobPostingIdAndStatusOrderByAiScoreDesc(UUID jobPostingId, String status);

    @Query("SELECT AVG(a.aiScore) FROM Application a WHERE a.jobPosting.id = :postingId AND a.aiScore IS NOT NULL")
    Double avgAiScoreByJobPostingId(@Param("postingId") UUID postingId);

    @Query("SELECT a.candidate.id FROM Application a WHERE a.jobPosting.id = :postingId")
    List<UUID> findCandidateIdsByJobPostingId(@Param("postingId") UUID postingId);

    @Query("SELECT a.candidate.id, a.jobPosting.title FROM Application a WHERE a.candidate.id IN :candidateIds")
    List<Object[]> findJobPostingTitlesByCandidateIds(@Param("candidateIds") List<UUID> candidateIds);

    @Query("SELECT a.candidate.id, a.aiScore, a.status FROM Application a WHERE a.candidate.id IN :candidateIds AND a.jobPosting.id = :postingId")
    List<Object[]> findScoresByCandidateIdsAndPostingId(@Param("candidateIds") List<UUID> candidateIds, @Param("postingId") UUID postingId);

    @Query("SELECT a.jobPosting.title FROM Application a WHERE a.candidate.id = :candidateId")
    List<String> findJobPostingTitlesByCandidateId(@Param("candidateId") UUID candidateId);
}
