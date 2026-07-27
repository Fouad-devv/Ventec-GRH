package com.ventec.grh_backend.dto.request;

import jakarta.validation.constraints.NotNull;

public record UpdateDocumentChecklistRequest(
        @NotNull String documents
) {}
