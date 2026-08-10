package com.ventec.grh_backend.service;

import com.ventec.grh_backend.DTO.request.ChangePasswordRequest;
import com.ventec.grh_backend.exception.BadRequestException;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.representations.idm.CredentialRepresentation;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

@Service
public class AccountService {

    private final Keycloak keycloakAdmin;

    @Value("${keycloak.realm}")
    private String keycloakRealm;

    public AccountService(Keycloak keycloakAdmin) {
        this.keycloakAdmin = keycloakAdmin;
    }

    public void changePassword(Jwt jwt, ChangePasswordRequest request) {
        if (!request.newPassword().equals(request.confirmPassword())) {
            throw new BadRequestException("Les mots de passe ne correspondent pas.");
        }

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
}
