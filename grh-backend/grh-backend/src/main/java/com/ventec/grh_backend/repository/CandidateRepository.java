package com.ventec.grh_backend.repository;

import com.ventec.grh_backend.domain.Candidate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CandidateRepository extends JpaRepository<Candidate, UUID> {

    Optional<Candidate> findByEmail(String email);

    boolean existsByEmail(String email);

    Page<Candidate> findAll(Pageable pageable);
}
