package com.ventec.grh_backend.DTO.request;

import jakarta.validation.constraints.NotBlank;

public record TemplateRequest(
        @NotBlank String name,
        String type,
        String subject,
        String content
) {}
