package com.ventec.grh_backend.DTO.response;

public record YearBreakdownResponse(
        long pending,
        long shortlisted,
        long interviews,
        long hired,
        long rejected
) {}
