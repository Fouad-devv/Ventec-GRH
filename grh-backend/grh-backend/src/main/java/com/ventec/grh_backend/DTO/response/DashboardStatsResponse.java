package com.ventec.grh_backend.dto.response;

public record DashboardStatsResponse(
        long totalJobPostings,
        long activeJobPostings,
        long totalCandidates,
        long totalApplications,
        long pendingApplications,
        long interviewsThisWeek,
        long hiredThisMonth
) {}
