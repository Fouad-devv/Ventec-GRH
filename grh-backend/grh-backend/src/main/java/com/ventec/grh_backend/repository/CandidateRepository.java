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

    @Query(
        value = "SELECT DISTINCT c FROM Application a JOIN a.candidate c WHERE a.jobPosting.id = :postingId " +
                "AND (LOWER(c.firstName) LIKE LOWER(CONCAT('%', :search, '%')) " +
                "OR LOWER(c.lastName) LIKE LOWER(CONCAT('%', :search, '%')) " +
                "OR LOWER(c.email) LIKE LOWER(CONCAT('%', :search, '%')))",
        countQuery = "SELECT COUNT(DISTINCT c) FROM Application a JOIN a.candidate c WHERE a.jobPosting.id = :postingId " +
                "AND (LOWER(c.firstName) LIKE LOWER(CONCAT('%', :search, '%')) " +
                "OR LOWER(c.lastName) LIKE LOWER(CONCAT('%', :search, '%')) " +
                "OR LOWER(c.email) LIKE LOWER(CONCAT('%', :search, '%')))"
    )
    Page<Candidate> findByJobPostingIdAndSearch(@Param("postingId") UUID postingId, @Param("search") String search, Pageable pageable);

    @Query(
        value = "SELECT c FROM Candidate c WHERE LOWER(c.firstName) LIKE LOWER(CONCAT('%', :search, '%')) " +
                "OR LOWER(c.lastName) LIKE LOWER(CONCAT('%', :search, '%')) " +
                "OR LOWER(c.email) LIKE LOWER(CONCAT('%', :search, '%'))",
        countQuery = "SELECT COUNT(c) FROM Candidate c WHERE LOWER(c.firstName) LIKE LOWER(CONCAT('%', :search, '%')) " +
                "OR LOWER(c.lastName) LIKE LOWER(CONCAT('%', :search, '%')) " +
                "OR LOWER(c.email) LIKE LOWER(CONCAT('%', :search, '%'))"
    )
    Page<Candidate> findBySearch(@Param("search") String search, Pageable pageable);
}
