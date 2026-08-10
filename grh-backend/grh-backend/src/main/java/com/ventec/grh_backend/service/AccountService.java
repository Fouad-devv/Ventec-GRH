package com.ventec.grh_backend.service;

import com.ventec.grh_backend.DTO.request.ChangePasswordRequest;
import com.ventec.grh_backend.exception.BadRequestException;
import lombok.extern.slf4j.Slf4j;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.representations.idm.CredentialRepresentation;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

@Slf4j
@Service
public class AccountService {

    private final Keycloak keycloakAdmin;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${keycloak.realm}")
    private String keycloakRealm;

    @Value("${KEYCLOAK_URL}")
    private String keycloakUrl;

    @Value("${KEYCLOAK_CLIENT_ID}")
    private String keycloakClientId;

    public AccountService(Keycloak keycloakAdmin) {
        this.keycloakAdmin = keycloakAdmin;
    }

    public void changePassword(Jwt jwt, ChangePasswordRequest request) {
        if (!request.newPassword().equals(request.confirmPassword())) {
            throw new BadRequestException("Les mots de passe ne correspondent pas.");
        }

        verifyCurrentPassword(jwt.getClaimAsString("preferred_username"), request.currentPassword());

        CredentialRepresentation cred = new CredentialRepresentation();
        cred.setType(CredentialRepresentation.PASSWORD);
        cred.setValue(request.newPassword());
        cred.setTemporary(false);

        try {
            keycloakAdmin.realm(keycloakRealm).users().get(jwt.getSubject()).resetPassword(cred);
        } catch (Exception e) {
            String msg = e.getMessage() != null ? e.getMessage().toLowerCase() : "";
            if (msg.contains("password") || msg.contains("policy")) {
                throw new BadRequestException("Le mot de passe ne respecte pas la politique de sécurité (longueur, complexité…).");
            }
            throw new BadRequestException("Impossible de modifier le mot de passe.");
        }
    }

    private void verifyCurrentPassword(String username, String password) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "password");
        body.add("client_id", keycloakClientId);
        body.add("username", username);
        body.add("password", password);

        String tokenUrl = keycloakUrl + "/realms/" + keycloakRealm + "/protocol/openid-connect/token";

        try {
            restTemplate.postForEntity(tokenUrl, new HttpEntity<>(body, headers), Object.class);
        } catch (HttpClientErrorException e) {
            String raw = e.getResponseBodyAsString().toLowerCase();
            log.warn("[changePassword] Keycloak ROPC error {} for user {}: {}", e.getStatusCode(), username, raw);

            if (raw.contains("invalid_grant") || raw.contains("invalid_user_credentials")
                    || e.getStatusCode() == HttpStatus.UNAUTHORIZED) {
                throw new BadRequestException("Mot de passe actuel incorrect.");
            }
            if (raw.contains("unauthorized_client") || raw.contains("not allowed for direct access")) {
                throw new BadRequestException("Activez 'Direct Access Grants' sur GRH-FRONT dans Keycloak Admin.");
            }
            throw new BadRequestException("Impossible de vérifier le mot de passe actuel.");
        }
    }
}
