package com.ventec.grh_backend.DTO.request;

import jakarta.validation.constraints.NotNull;

public record UpdateDocumentChecklistRequest(
        @NotNull String documents
) {}
