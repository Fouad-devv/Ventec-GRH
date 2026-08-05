package com.ventec.grh_backend.controller;

import com.ventec.grh_backend.DTO.response.NotificationResponse;
import com.ventec.grh_backend.service.NotificationService;
import com.ventec.grh_backend.service.UserContextService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final UserContextService userContextService;

    @GetMapping("/me")
    public ResponseEntity<List<NotificationResponse>> getMyNotifications(Authentication auth) {
        UUID userId = userContextService.resolveUser(auth).getId();
        return ResponseEntity.ok(notificationService.getNotificationsForUser(userId));
    }

    @GetMapping("/me/unread-count")
    public ResponseEntity<Map<String, Long>> countUnread(Authentication auth) {
        UUID userId = userContextService.resolveUser(auth).getId();
        return ResponseEntity.ok(Map.of("count", notificationService.countUnread(userId)));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<NotificationResponse> markRead(@PathVariable UUID id) {
        return ResponseEntity.ok(notificationService.markRead(id));
    }

    @PutMapping("/me/read-all")
    public ResponseEntity<Void> markAllRead(Authentication auth) {
        UUID userId = userContextService.resolveUser(auth).getId();
        notificationService.markAllRead(userId);
        return ResponseEntity.ok().build();
    }
}
