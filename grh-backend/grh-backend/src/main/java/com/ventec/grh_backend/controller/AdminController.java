package com.ventec.grh_backend.controller;

import com.ventec.grh_backend.DTO.request.CreateUserRequest;
import com.ventec.grh_backend.DTO.request.SyncUserRequest;
import com.ventec.grh_backend.DTO.request.TemplateRequest;
import com.ventec.grh_backend.DTO.response.TemplateResponse;
import com.ventec.grh_backend.DTO.response.UserResponse;
import com.ventec.grh_backend.service.AdminService;
import com.ventec.grh_backend.service.TemplateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;
    private final TemplateService templateService;

    @PostMapping("/users")
    public ResponseEntity<UserResponse> createUser(@Valid @RequestBody CreateUserRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminService.createUser(req));
    }

    @PostMapping("/users/sync")
    public ResponseEntity<UserResponse> syncUser(@Valid @RequestBody SyncUserRequest req) {
        return ResponseEntity.ok(adminService.syncUser(req));
    }

    @GetMapping("/users")
    public ResponseEntity<List<UserResponse>> getAllUsers() {
        return ResponseEntity.ok(adminService.getAllUsers());
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<UserResponse> getUser(@PathVariable UUID id) {
        return ResponseEntity.ok(adminService.getUser(id));
    }

    @PutMapping("/users/{id}/deactivate")
    public ResponseEntity<UserResponse> deactivate(@PathVariable UUID id) {
        return ResponseEntity.ok(adminService.deactivateUser(id));
    }

    /* ── Templates ── */

    @GetMapping("/templates")
    public ResponseEntity<List<TemplateResponse>> getTemplates() {
        return ResponseEntity.ok(templateService.getAll());
    }

    @GetMapping("/templates/{id}")
    public ResponseEntity<TemplateResponse> getTemplate(@PathVariable UUID id) {
        return ResponseEntity.ok(templateService.get(id));
    }

    @PostMapping("/templates")
    public ResponseEntity<TemplateResponse> createTemplate(@Valid @RequestBody TemplateRequest req) {
        return ResponseEntity.ok(templateService.create(req));
    }

    @PutMapping("/templates/{id}")
    public ResponseEntity<TemplateResponse> updateTemplate(
            @PathVariable UUID id, @RequestBody TemplateRequest req) {
        return ResponseEntity.ok(templateService.update(id, req));
    }

    @DeleteMapping("/templates/{id}")
    public ResponseEntity<Void> deleteTemplate(@PathVariable UUID id) {
        templateService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
