package com.ventec.grh_backend.dto.request;

import jakarta.validation.constraints.NotBlank;

public record UpdateApplicationStatusRequest(
        @NotBlank String status,
        String notes
) {}
