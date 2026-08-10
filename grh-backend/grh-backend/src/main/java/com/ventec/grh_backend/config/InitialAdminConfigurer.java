package com.ventec.grh_backend.config;

import com.ventec.grh_backend.DTO.request.CreateUserRequest;
import com.ventec.grh_backend.repository.UserRepository;
import com.ventec.grh_backend.service.AdminService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Slf4j
@Component
@Order(2)
public class InitialAdminConfigurer implements ApplicationRunner {

    private final AdminService adminService;
    private final UserRepository userRepository;

    @Value("${INIT_ADMIN_EMAIL:}")
    private String email;

    @Value("${INIT_ADMIN_FIRSTNAME:}")
    private String firstName;

    @Value("${INIT_ADMIN_LASTNAME:}")
    private String lastName;

    @Value("${INIT_ADMIN_PASSWORD:}")
    private String password;

    @Value("${INIT_ADMIN_DEPARTMENT:Direction}")
    private String department;

    public InitialAdminConfigurer(AdminService adminService, UserRepository userRepository) {
        this.adminService = adminService;
        this.userRepository = userRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!StringUtils.hasText(email) || !StringUtils.hasText(password)) {
            log.info("[InitAdmin] No INIT_ADMIN_* vars set — skipping initial admin creation.");
            return;
        }
        if (userRepository.existsByRole("ADMIN")) {
            log.info("[InitAdmin] Admin user already exists — skipping.");
            return;
        }
        try {
            adminService.createUser(new CreateUserRequest(
                    firstName, lastName, email, password, "ADMIN", department
            ));
            log.info("[InitAdmin] Initial admin created successfully: {}", email);
            log.info("[InitAdmin] The user will be prompted to change their password on first login.");
        } catch (Exception e) {
            log.warn("[InitAdmin] Failed to create initial admin ({}): {}", email, e.getMessage());
        }
    }
}
