package com.ventec.grh_backend.controller;

import com.ventec.grh_backend.domain.User;
import com.ventec.grh_backend.dto.response.NotificationResponse;
import com.ventec.grh_backend.exception.NotFoundException;
import com.ventec.grh_backend.repository.UserRepository;
import com.ventec.grh_backend.service.NotificationService;
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
    private final UserRepository userRepository;

    @GetMapping("/me")
    public ResponseEntity<List<NotificationResponse>> getMyNotifications(Authentication auth) {
        UUID userId = resolveUserId(auth);
        return ResponseEntity.ok(notificationService.getNotificationsForUser(userId));
    }

    @GetMapping("/me/unread-count")
    public ResponseEntity<Map<String, Long>> countUnread(Authentication auth) {
        UUID userId = resolveUserId(auth);
        return ResponseEntity.ok(Map.of("count", notificationService.countUnread(userId)));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<NotificationResponse> markRead(@PathVariable UUID id) {
        return ResponseEntity.ok(notificationService.markRead(id));
    }

    @PutMapping("/me/read-all")
    public ResponseEntity<Void> markAllRead(Authentication auth) {
        UUID userId = resolveUserId(auth);
        notificationService.markAllRead(userId);
        return ResponseEntity.ok().build();
    }

    private UUID resolveUserId(Authentication auth) {
        User user = userRepository.findByKeycloakId(auth.getName())
                .orElseThrow(() -> new NotFoundException("User not found: " + auth.getName()));
        return user.getId();
    }
}
