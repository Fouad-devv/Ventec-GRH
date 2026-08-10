package com.ventec.grh_backend.repository;

import com.ventec.grh_backend.domain.EmailCandidature;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface EmailCandidatureRepository extends JpaRepository<EmailCandidature, UUID> {

    List<EmailCandidature> findAllByOrderByReceivedAtDesc();
}
