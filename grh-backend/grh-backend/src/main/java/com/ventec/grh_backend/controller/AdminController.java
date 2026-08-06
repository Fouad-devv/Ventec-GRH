package com.ventec.grh_backend.controller;

import com.ventec.grh_backend.DTO.request.CreateUserRequest;
import com.ventec.grh_backend.DTO.request.SyncUserRequest;
import com.ventec.grh_backend.DTO.request.UpdateUserRequest;
import com.ventec.grh_backend.DTO.response.UserResponse;
import com.ventec.grh_backend.service.AdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Tag(name = "Administration")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;

    @Operation(summary = "Créer un utilisateur", description = "Crée un utilisateur dans Keycloak et en base de données")
    @ApiResponse(responseCode = "201", description = "Utilisateur créé")
    @PostMapping("/users")
    public ResponseEntity<UserResponse> createUser(@Valid @RequestBody CreateUserRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminService.createUser(req));
    }

    @Operation(summary = "Synchroniser un utilisateur Keycloak", description = "Crée ou met à jour l'entrée locale d'un utilisateur existant dans Keycloak")
    @PostMapping("/users/sync")
    public ResponseEntity<UserResponse> syncUser(@Valid @RequestBody SyncUserRequest req) {
        return ResponseEntity.ok(adminService.syncUser(req));
    }

    @Operation(summary = "Lister tous les utilisateurs",
               description = "Retourne la liste de tous les comptes RH et ADMIN enregistrés dans le système")
    @GetMapping("/users")
    public ResponseEntity<List<UserResponse>> getAllUsers() {
        return ResponseEntity.ok(adminService.getAllUsers());
    }

    @Operation(summary = "Détail d'un utilisateur",
               description = "Retourne le profil d'un utilisateur RH/ADMIN : nom, email, rôle, statut actif/inactif et identifiant Keycloak")
    @GetMapping("/users/{id}")
    public ResponseEntity<UserResponse> getUser(@Parameter(description = "ID de l'utilisateur") @PathVariable UUID id) {
        return ResponseEntity.ok(adminService.getUser(id));
    }

    @Operation(summary = "Modifier un utilisateur",
               description = "Met à jour le nom, email ou rôle d'un utilisateur. Le changement est propagé à la fois en base de données et dans Keycloak")
    @PutMapping("/users/{id}")
    public ResponseEntity<UserResponse> updateUser(
            @Parameter(description = "ID de l'utilisateur") @PathVariable UUID id, @Valid @RequestBody UpdateUserRequest req) {
        return ResponseEntity.ok(adminService.updateUser(id, req));
    }

    @Operation(summary = "Supprimer un utilisateur", description = "Supprime l'utilisateur de Keycloak et de la base de données")
    @ApiResponse(responseCode = "204", description = "Utilisateur supprimé")
    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteUser(@Parameter(description = "ID de l'utilisateur") @PathVariable UUID id) {
        adminService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Désactiver un utilisateur",
               description = "Désactive le compte dans Keycloak sans le supprimer. L'utilisateur ne pourra plus se connecter mais ses données et son historique sont conservés")
    @PutMapping("/users/{id}/deactivate")
    public ResponseEntity<UserResponse> deactivate(@Parameter(description = "ID de l'utilisateur") @PathVariable UUID id) {
        return ResponseEntity.ok(adminService.deactivateUser(id));
    }
}
