package com.ventec.grh_backend.repository;

import com.ventec.grh_backend.domain.Candidate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface CandidateRepository extends JpaRepository<Candidate, UUID> {

    Optional<Candidate> findByEmail(String email);

    boolean existsByEmail(String email);

    Page<Candidate> findAll(Pageable pageable);

    @Query(
        value = "SELECT DISTINCT c FROM Application a JOIN a.candidate c WHERE a.jobPosting.id = :postingId",
        countQuery = "SELECT COUNT(DISTINCT c) FROM Application a JOIN a.candidate c WHERE a.jobPosting.id = :postingId"
    )
    Page<Candidate> findByJobPostingId(@Param("postingId") UUID postingId, Pageable pageable);
}
