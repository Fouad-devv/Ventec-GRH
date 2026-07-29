package com.ventec.grh_backend.DTO.response;

import java.util.List;

public record ExtractCvResponse(
        List<String> skills,
        Integer experienceYears,
        String education,
        String currentPosition,
        String location
) {}
