package com.ventec.grh_backend.repository;

import com.ventec.grh_backend.domain.DocumentChecklist;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DocumentChecklistRepository extends JpaRepository<DocumentChecklist, UUID> {

    Optional<DocumentChecklist> findByCandidateIdAndJobPostingId(UUID candidateId, UUID jobPostingId);

    List<DocumentChecklist> findByCandidateId(UUID candidateId);
}
