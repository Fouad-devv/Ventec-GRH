package com.ventec.grh_backend.service;

import com.ventec.grh_backend.domain.User;
import com.ventec.grh_backend.DTO.request.CreateUserRequest;
import com.ventec.grh_backend.DTO.request.SyncUserRequest;
import com.ventec.grh_backend.DTO.request.UpdateUserRequest;
import com.ventec.grh_backend.DTO.response.UserResponse;
import com.ventec.grh_backend.exception.BadRequestException;
import com.ventec.grh_backend.exception.NotFoundException;
import com.ventec.grh_backend.repository.UserRepository;
import jakarta.ws.rs.core.Response;
import lombok.RequiredArgsConstructor;
import org.keycloak.admin.client.CreatedResponseUtil;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.representations.idm.CredentialRepresentation;
import org.keycloak.representations.idm.RoleRepresentation;
import org.keycloak.representations.idm.UserRepresentation;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class AdminService {

    private final UserRepository userRepository;
    private final Keycloak keycloakAdmin;
    private final MailService mailService;

    @Value("${keycloak.realm}")
    private String keycloakRealm;

    @Value("${app.login-url:http://localhost:5173}")
    private String loginUrl;

    public AdminService(UserRepository userRepository, Keycloak keycloakAdmin, MailService mailService) {
        this.userRepository = userRepository;
        this.keycloakAdmin = keycloakAdmin;
        this.mailService = mailService;
    }

    public UserResponse createUser(CreateUserRequest req) {
        String generatedPassword = generatePassword();

        CredentialRepresentation cred = new CredentialRepresentation();
        cred.setType(CredentialRepresentation.PASSWORD);
        cred.setValue(generatedPassword);
        cred.setTemporary(true);

        UserRepresentation userRep = new UserRepresentation();
        userRep.setUsername(req.email());
        userRep.setEmail(req.email());
        userRep.setFirstName(req.firstName());
        userRep.setLastName(req.lastName());
        userRep.setEnabled(true);
        userRep.setCredentials(List.of(cred));

        try (Response response = keycloakAdmin.realm(keycloakRealm).users().create(userRep)) {
            if (response.getStatus() == 409) {
                throw new BadRequestException("Un utilisateur avec cet email existe déjà.");
            }
            if (response.getStatus() != 201) {
                String body = response.hasEntity() ? response.readEntity(String.class) : "";
                if (body.toLowerCase().contains("password")) {
                    throw new BadRequestException("Le mot de passe ne respecte pas la politique de sécurité (longueur, complexité…).");
                }
                throw new BadRequestException("Erreur Keycloak (" + response.getStatus() + "): " + body);
            }
            String keycloakId = CreatedResponseUtil.getCreatedId(response);
            assignRealmRole(keycloakId, req.role());
            UserResponse created = syncUser(new SyncUserRequest(keycloakId, req.email(), req.firstName(), req.lastName(), req.role(), req.department()));
            mailService.sendHtml(req.email(), "Bienvenue sur Ventec GRH — vos identifiants", buildWelcomeEmail(req.firstName(), req.lastName(), req.email(), generatedPassword));
            return created;
        }
    }

    private String buildWelcomeEmail(String firstName, String lastName, String email, String password) {
        return """
            <div style="font-family:Arial,sans-serif;max-width:540px;margin:auto;background:#f8fafc;padding:32px;border-radius:12px;">
              <h2 style="color:#1e40af;margin:0 0 16px;">Bienvenue sur Ventec GRH</h2>
              <p style="color:#334155;margin:0 0 12px;">Bonjour <strong>%s %s</strong>,</p>
              <p style="color:#334155;margin:0 0 16px;">Votre compte a été créé par un administrateur. Voici vos identifiants de connexion :</p>
              <table style="width:100%%;background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:0 0 16px;border-collapse:collapse;">
                <tr>
                  <td style="color:#64748b;padding:6px 8px;white-space:nowrap;">Email</td>
                  <td style="font-weight:600;color:#0f172a;padding:6px 8px;">%s</td>
                </tr>
                <tr>
                  <td style="color:#64748b;padding:6px 8px;white-space:nowrap;">Mot de passe temporaire</td>
                  <td style="font-weight:700;color:#0f172a;letter-spacing:2px;font-family:monospace;font-size:16px;padding:6px 8px;">%s</td>
                </tr>
              </table>
              <p style="color:#ef4444;font-size:13px;margin:0 0 20px;">⚠ Pour des raisons de sécurité, vous serez invité à changer ce mot de passe lors de votre première connexion.</p>
              <a href="%s" style="display:inline-block;padding:11px 28px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">Se connecter</a>
              <p style="color:#94a3b8;font-size:11px;margin:32px 0 0;">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
            </div>
            """.formatted(firstName, lastName, email, password, loginUrl);
    }

    private String generatePassword() {
        String upper   = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        String lower   = "abcdefghjkmnpqrstuvwxyz";
        String digits  = "23456789";
        String special = "!@#$%&*+-?";
        String all     = upper + lower + digits + special;

        SecureRandom rnd = new SecureRandom();
        List<Character> chars = new ArrayList<>();
        chars.add(upper.charAt(rnd.nextInt(upper.length())));
        chars.add(digits.charAt(rnd.nextInt(digits.length())));
        chars.add(special.charAt(rnd.nextInt(special.length())));
        for (int i = 3; i < 12; i++) {
            chars.add(all.charAt(rnd.nextInt(all.length())));
        }
        Collections.shuffle(chars, rnd);
        StringBuilder sb = new StringBuilder();
        chars.forEach(sb::append);
        return sb.toString();
    }

    public UserResponse syncUser(SyncUserRequest req) {
        User user = userRepository.findByKeycloakId(req.keycloakId())
                .orElseGet(() -> User.builder()
                        .keycloakId(req.keycloakId())
                        .email(req.email())
                        .build());
        user.setEmail(req.email());
        user.setFirstName(req.firstName());
        user.setLastName(req.lastName());
        user.setRole(req.role());
        user.setDepartment(req.department());
        if (user.getActive() == null) user.setActive(true);
        return toResponse(userRepository.save(user));
    }

    @Transactional(readOnly = true)
    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public UserResponse getUser(UUID id) {
        return userRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new NotFoundException("User not found: " + id));
    }

    public UserResponse updateUser(UUID id, UpdateUserRequest req) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("User not found: " + id));

        if (user.getKeycloakId() != null && !user.getKeycloakId().isBlank()) {
            try {
                var resource = keycloakAdmin.realm(keycloakRealm).users().get(user.getKeycloakId());
                UserRepresentation userRep = resource.toRepresentation();
                if (req.firstName() != null) userRep.setFirstName(req.firstName());
                if (req.lastName()  != null) userRep.setLastName(req.lastName());
                resource.update(userRep);
            } catch (Exception ignored) {}

            if (req.role() != null && !req.role().equals(user.getRole())) {
                if (user.getRole() != null) removeRealmRole(user.getKeycloakId(), user.getRole());
                assignRealmRole(user.getKeycloakId(), req.role());
            }
        }

        if (req.firstName() != null) user.setFirstName(req.firstName());
        if (req.lastName()  != null) user.setLastName(req.lastName());
        user.setRole(req.role());
        user.setDepartment(req.department());
        return toResponse(userRepository.save(user));
    }

    public void deleteUser(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("User not found: " + id));

        if (user.getKeycloakId() != null && !user.getKeycloakId().isBlank()) {
            try {
                keycloakAdmin.realm(keycloakRealm).users().delete(user.getKeycloakId());
            } catch (Exception ignored) {}
        }

        userRepository.delete(user);
    }

    public UserResponse deactivateUser(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("User not found: " + id));
        user.setActive(false);
        return toResponse(userRepository.save(user));
    }

    private void assignRealmRole(String keycloakUserId, String roleName) {
        var realmResource = keycloakAdmin.realm(keycloakRealm);
        RoleRepresentation role;
        try {
            role = realmResource.roles().get(roleName).toRepresentation();
        } catch (Exception e) {
            RoleRepresentation newRole = new RoleRepresentation();
            newRole.setName(roleName);
            realmResource.roles().create(newRole);
            role = realmResource.roles().get(roleName).toRepresentation();
        }
        realmResource.users().get(keycloakUserId).roles().realmLevel().add(List.of(role));
    }

    private void removeRealmRole(String keycloakUserId, String roleName) {
        try {
            var realmResource = keycloakAdmin.realm(keycloakRealm);
            RoleRepresentation role = realmResource.roles().get(roleName).toRepresentation();
            realmResource.users().get(keycloakUserId).roles().realmLevel().remove(List.of(role));
        } catch (Exception ignored) {}
    }

    public UserResponse toResponse(User u) {
        return new UserResponse(
                u.getId(), u.getKeycloakId(), u.getEmail(),
                u.getFirstName(), u.getLastName(), u.getRole(),
                u.getDepartment(), u.getActive(), u.getCreatedAt()
        );
    }
}
