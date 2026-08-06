package com.ventec.grh_backend.controller;

import com.ventec.grh_backend.DTO.response.NotificationResponse;
import com.ventec.grh_backend.service.NotificationService;
import com.ventec.grh_backend.service.UserContextService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Tag(name = "Notifications")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final UserContextService userContextService;

    @Operation(summary = "Mes notifications", description = "Retourne toutes les notifications de l'utilisateur connecté")
    @GetMapping("/me")
    public ResponseEntity<List<NotificationResponse>> getMyNotifications(Authentication auth) {
        UUID userId = userContextService.resolveUser(auth).getId();
        return ResponseEntity.ok(notificationService.getNotificationsForUser(userId));
    }

    @Operation(summary = "Nombre de notifications non lues",
               description = "Retourne un objet { \"count\": N } avec le nombre de notifications non lues. Utilisé pour afficher le badge dans la navbar")
    @GetMapping("/me/unread-count")
    public ResponseEntity<Map<String, Long>> countUnread(Authentication auth) {
        UUID userId = userContextService.resolveUser(auth).getId();
        return ResponseEntity.ok(Map.of("count", notificationService.countUnread(userId)));
    }

    @Operation(summary = "Marquer une notification comme lue",
               description = "Met à jour le champ readAt de la notification. Retourne la notification mise à jour")
    @PutMapping("/{id}/read")
    public ResponseEntity<NotificationResponse> markRead(@Parameter(description = "ID de la notification") @PathVariable UUID id) {
        return ResponseEntity.ok(notificationService.markRead(id));
    }

    @Operation(summary = "Marquer toutes les notifications comme lues",
               description = "Marque en une seule requête toutes les notifications non lues de l'utilisateur connecté. Utile pour le bouton 'Tout marquer comme lu'")
    @PutMapping("/me/read-all")
    public ResponseEntity<Void> markAllRead(Authentication auth) {
        UUID userId = userContextService.resolveUser(auth).getId();
        notificationService.markAllRead(userId);
        return ResponseEntity.ok().build();
    }
}
