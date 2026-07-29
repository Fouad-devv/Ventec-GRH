package com.ventec.grh_backend.DTO.response;

import java.util.List;

public record DashboardStatsResponse(
        long totalJobPostings,
        long activeJobPostings,
        long totalCandidates,
        long totalApplications,
        long pendingApplications,
        long interviewsThisWeek,
        long hiredThisMonth,
        List<UpcomingInterviewDto> upcomingInterviews
) {}
