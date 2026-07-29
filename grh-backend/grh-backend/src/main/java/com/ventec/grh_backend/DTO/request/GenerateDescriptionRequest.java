package com.ventec.grh_backend.DTO.request;

public record GenerateDescriptionRequest(
        String title,
        String department,
        String contractType,
        String location,
        Integer minExperience
) {}
