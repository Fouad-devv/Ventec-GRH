package com.ventec.grh_backend.service;

import com.ventec.grh_backend.domain.User;
import com.ventec.grh_backend.dto.request.SyncUserRequest;
import com.ventec.grh_backend.dto.response.UserResponse;
import com.ventec.grh_backend.exception.NotFoundException;
import com.ventec.grh_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminService {

    private final UserRepository userRepository;

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

    public UserResponse deactivateUser(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("User not found: " + id));
        user.setActive(false);
        return toResponse(userRepository.save(user));
    }

    public UserResponse toResponse(User u) {
        return new UserResponse(
                u.getId(), u.getKeycloakId(), u.getEmail(),
                u.getFirstName(), u.getLastName(), u.getRole(),
                u.getDepartment(), u.getActive(), u.getCreatedAt()
        );
    }
}
