package com.ventec.grh_backend.service;

import com.ventec.grh_backend.domain.User;
import com.ventec.grh_backend.DTO.request.CreateUserRequest;
import com.ventec.grh_backend.DTO.request.SyncUserRequest;
import com.ventec.grh_backend.DTO.request.UpdateUserRequest;
import com.ventec.grh_backend.DTO.response.UserResponse;
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

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class AdminService {

    private final UserRepository userRepository;
    private final Keycloak keycloakAdmin;

    @Value("${keycloak.realm}")
    private String keycloakRealm;

    public AdminService(UserRepository userRepository, Keycloak keycloakAdmin) {
        this.userRepository = userRepository;
        this.keycloakAdmin = keycloakAdmin;
    }

    public UserResponse createUser(CreateUserRequest req) {
        CredentialRepresentation cred = new CredentialRepresentation();
        cred.setType(CredentialRepresentation.PASSWORD);
        cred.setValue(req.password());
        cred.setTemporary(false);

        UserRepresentation userRep = new UserRepresentation();
        userRep.setUsername(req.email());
        userRep.setEmail(req.email());
        userRep.setFirstName(req.firstName());
        userRep.setLastName(req.lastName());
        userRep.setEnabled(true);
        userRep.setCredentials(List.of(cred));

        try (Response response = keycloakAdmin.realm(keycloakRealm).users().create(userRep)) {
            if (response.getStatus() != 201) {
                String body = response.hasEntity() ? response.readEntity(String.class) : "";
                throw new RuntimeException("Keycloak user creation failed (" + response.getStatus() + "): " + body);
            }
            String keycloakId = CreatedResponseUtil.getCreatedId(response);
            assignRealmRole(keycloakId, req.role());
            return syncUser(new SyncUserRequest(keycloakId, req.email(), req.firstName(), req.lastName(), req.role(), req.department()));
        }
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
