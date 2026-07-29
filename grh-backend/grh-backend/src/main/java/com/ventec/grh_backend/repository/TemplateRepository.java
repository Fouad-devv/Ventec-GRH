package com.ventec.grh_backend.repository;

import com.ventec.grh_backend.domain.Template;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TemplateRepository extends JpaRepository<Template, UUID> {
    List<Template> findAllByOrderByCreatedAtDesc();
    List<Template> findByTypeOrderByCreatedAtDesc(String type);
}
