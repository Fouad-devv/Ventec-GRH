package com.ventec.grh_backend.repository;

import com.ventec.grh_backend.domain.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    List<Notification> findByUserIdOrderByCreatedAtDesc(UUID userId);

    long countByUserIdAndReadFalse(UUID userId);

    List<Notification> findByUserIdAndReadFalseOrderByCreatedAtDesc(UUID userId);
}
