package com.ventec.grh_backend.DTO.response;

import java.util.List;

public record DashboardStatsResponse(
        long totalJobPostings,
        long activeJobPostings,
        long totalCandidates,
        long totalApplications,
        long pendingApplications,
        long shortlistedApplications,
        long interviewApplications,
        long hiredApplications,
        long rejectedApplications,
        long interviewsThisWeek,
        long totalInterviews,
        long hiredThisMonth,
        List<UpcomingInterviewDto> upcomingInterviews,
        List<UpcomingInterviewDto> overdueInterviews,
        long pendingThisYear,
        long shortlistedThisYear,
        long interviewsThisYear,
        long hiredThisYear,
        long rejectedThisYear
) {}
