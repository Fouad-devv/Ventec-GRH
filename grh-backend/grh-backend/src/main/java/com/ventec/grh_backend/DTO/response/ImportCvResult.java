package com.ventec.grh_backend.DTO.response;

public record ImportCvResult(
        ApplicationResponse application,
        String fileName,
        String aiError
) {
    public boolean hasAiError() {
        return aiError != null && !aiError.isBlank();
    }
}
