package com.ventec.grh_backend.controller;

import com.ventec.grh_backend.domain.AuditLog;
import com.ventec.grh_backend.DTO.response.AuditLogResponse;
import com.ventec.grh_backend.repository.AuditLogRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/admin/audit-logs")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AuditLogController {

    private final AuditLogRepository auditLogRepository;

    @GetMapping
    public Page<AuditLogResponse> getAuditLogs(
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) String performedBy,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime to,
            Pageable pageable) {

        Specification<AuditLog> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (action != null && !action.isBlank())
                predicates.add(cb.equal(root.get("action"), action));
            if (entityType != null && !entityType.isBlank())
                predicates.add(cb.equal(root.get("entityType"), entityType));
            if (performedBy != null && !performedBy.isBlank())
                predicates.add(cb.like(cb.lower(root.get("performedBy")),
                        "%" + performedBy.toLowerCase() + "%"));
            if (from != null)
                predicates.add(cb.greaterThanOrEqualTo(root.get("timestamp"), from));
            if (to != null)
                predicates.add(cb.lessThanOrEqualTo(root.get("timestamp"), to));
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return auditLogRepository.findAll(spec, pageable)
                .map(a -> new AuditLogResponse(
                        a.getId(), a.getAction(), a.getEntityType(), a.getEntityId(),
                        a.getPerformedBy(), a.getPerformedByName(), a.getDetails(), a.getTimestamp()
                ));
    }

    @GetMapping("/meta")
    public MetaResponse getMeta() {
        return new MetaResponse(
                auditLogRepository.findDistinctActions(),
                auditLogRepository.findDistinctPerformedBy()
        );
    }

    public record MetaResponse(List<String> actions, List<String> users) {}
}
