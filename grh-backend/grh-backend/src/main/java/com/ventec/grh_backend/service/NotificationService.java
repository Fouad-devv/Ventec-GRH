package com.ventec.grh_backend.service;

import com.ventec.grh_backend.domain.Notification;
import com.ventec.grh_backend.domain.User;
import com.ventec.grh_backend.DTO.request.CreateNotificationRequest;
import com.ventec.grh_backend.DTO.response.NotificationResponse;
import com.ventec.grh_backend.exception.NotFoundException;
import com.ventec.grh_backend.repository.NotificationRepository;
import com.ventec.grh_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationResponse createNotification(CreateNotificationRequest req) {
        User user = userRepository.findById(req.userId())
                .orElseThrow(() -> new NotFoundException("User not found: " + req.userId()));
        return toResponse(notificationRepository.save(buildNotification(
                user, req.type(), req.title(), req.body(), req.referenceType(), req.referenceId())));
    }

    public void createInternal(User user, String type, String title, String body,
                                String referenceType, UUID referenceId) {
        notificationRepository.save(buildNotification(user, type, title, body, referenceType, referenceId));
    }

    private Notification buildNotification(User user, String type, String title,
                                            String body, String referenceType, UUID referenceId) {
        return Notification.builder()
                .user(user)
                .type(type)
                .title(title)
                .body(body)
                .read(false)
                .referenceType(referenceType)
                .referenceId(referenceId)
                .build();
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> getNotificationsForUser(UUID userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream().map(this::toResponse).toList();
    }

    public NotificationResponse markRead(UUID notificationId) {
        Notification n = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new NotFoundException("Notification not found: " + notificationId));
        n.setRead(true);
        return toResponse(notificationRepository.save(n));
    }

    public void markAllRead(UUID userId) {
        notificationRepository.findByUserIdAndReadFalseOrderByCreatedAtDesc(userId)
                .forEach(n -> {
                    n.setRead(true);
                    notificationRepository.save(n);
                });
    }

    @Transactional(readOnly = true)
    public long countUnread(UUID userId) {
        return notificationRepository.countByUserIdAndReadFalse(userId);
    }

    public NotificationResponse toResponse(Notification n) {
        return new NotificationResponse(
                n.getId(),
                n.getUser() != null ? n.getUser().getId() : null,
                n.getType(), n.getTitle(), n.getBody(), n.getRead(),
                n.getReferenceType(), n.getReferenceId(), n.getCreatedAt()
        );
    }
}
