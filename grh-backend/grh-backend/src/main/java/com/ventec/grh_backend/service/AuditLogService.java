package com.ventec.grh_backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ventec.grh_backend.domain.AuditLog;
import com.ventec.grh_backend.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(String action, String entityType, String entityId, Map<String, Object> details) {
        try {
            String performedBy = null;
            String performedByName = null;

            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null) {
                performedBy = auth.getName();
                if (auth instanceof JwtAuthenticationToken jwtAuth) {
                    Jwt jwt = jwtAuth.getToken();
                    String firstName = jwt.getClaimAsString("given_name");
                    String lastName  = jwt.getClaimAsString("family_name");
                    if (firstName != null || lastName != null) {
                        performedByName = ((firstName != null ? firstName : "") + " " + (lastName != null ? lastName : "")).trim();
                    }
                }
            }

            String detailsJson = details != null ? objectMapper.writeValueAsString(details) : null;

            AuditLog auditLog = AuditLog.builder()
                    .action(action)
                    .entityType(entityType)
                    .entityId(entityId)
                    .performedBy(performedBy)
                    .performedByName(performedByName)
                    .details(detailsJson)
                    .timestamp(OffsetDateTime.now())
                    .build();

            auditLogRepository.save(auditLog);
        } catch (Exception e) {
            log.warn("Failed to save audit log [{}]: {}", action, e.getMessage());
        }
    }
}
