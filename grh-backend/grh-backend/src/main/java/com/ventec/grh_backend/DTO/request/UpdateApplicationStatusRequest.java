package com.ventec.grh_backend.DTO.request;

import jakarta.validation.constraints.NotBlank;

public record UpdateApplicationStatusRequest(
        @NotBlank String status,
        String notes
) {}
