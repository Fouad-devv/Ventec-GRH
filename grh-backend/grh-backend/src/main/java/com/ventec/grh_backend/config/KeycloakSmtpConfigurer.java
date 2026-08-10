package com.ventec.grh_backend.config;

import lombok.extern.slf4j.Slf4j;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.representations.idm.RealmRepresentation;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Component
public class KeycloakSmtpConfigurer implements ApplicationRunner {

    private final Keycloak keycloakAdmin;

    @Value("${keycloak.realm}")
    private String keycloakRealm;

    @Value("${spring.mail.host:}")
    private String smtpHost;

    @Value("${spring.mail.port:587}")
    private String smtpPort;

    @Value("${spring.mail.username:}")
    private String smtpUser;

    @Value("${spring.mail.password:}")
    private String smtpPassword;

    @Value("${mail.from:}")
    private String mailFrom;

    public KeycloakSmtpConfigurer(Keycloak keycloakAdmin) {
        this.keycloakAdmin = keycloakAdmin;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            RealmRepresentation realm = keycloakAdmin.realm(keycloakRealm).toRepresentation();

            // Always apply login theme
            realm.setLoginTheme("ventec-grh");

            // Apply SMTP only if configured
            if (StringUtils.hasText(smtpHost) && StringUtils.hasText(smtpUser)) {
                Map<String, String> smtp = new HashMap<>();
                smtp.put("from", mailFrom);
                smtp.put("fromDisplayName", "Ventec-GRH");
                smtp.put("replyTo", mailFrom);
                smtp.put("replyToDisplayName", "Ventec-GRH");
                smtp.put("envelopeFrom", mailFrom);
                smtp.put("host", smtpHost);
                smtp.put("port", smtpPort);
                smtp.put("ssl", "false");
                smtp.put("starttls", "true");
                smtp.put("auth", "true");
                smtp.put("user", smtpUser);
                smtp.put("password", smtpPassword);
                smtp.put("connectionTimeout", "10000");
                smtp.put("timeout", "10000");
                smtp.put("writeTimeout", "10000");
                realm.setSmtpServer(smtp);
                log.info("[Keycloak] SMTP configured → {}:{} (from: {})", smtpHost, smtpPort, mailFrom);
            } else {
                log.info("[Keycloak] No SMTP config found — skipping SMTP.");
            }

            keycloakAdmin.realm(keycloakRealm).update(realm);
            log.info("[Keycloak] Realm '{}' updated — loginTheme: ventec-grh", keycloakRealm);
        } catch (Exception e) {
            log.warn("[Keycloak] Failed to configure realm: {}", e.getMessage());
        }
    }
}
