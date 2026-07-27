package com.ventec.grh_backend.service;

import com.ventec.grh_backend.DTO.response.DashboardStatsResponse;
import com.ventec.grh_backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardService {

    private final JobPostingRepository jobPostingRepository;
    private final CandidateRepository candidateRepository;
    private final ApplicationRepository applicationRepository;
    private final InterviewRepository interviewRepository;

    public DashboardStatsResponse getStats() {
        OffsetDateTime startOfWeek = OffsetDateTime.now()
                .with(DayOfWeek.MONDAY)
                .truncatedTo(ChronoUnit.DAYS);
        OffsetDateTime endOfWeek = startOfWeek.plusDays(7);

        long interviewsThisWeek = interviewRepository
                .findByStatusAndScheduledAtBetween("SCHEDULED", startOfWeek, endOfWeek)
                .size();

        return new DashboardStatsResponse(
                jobPostingRepository.count(),
                jobPostingRepository.countByStatus("PUBLISHED"),
                candidateRepository.count(),
                applicationRepository.count(),
                applicationRepository.countByStatus("NEW") + applicationRepository.countByStatus("SCREENING"),
                interviewsThisWeek,
                applicationRepository.countByStatus("HIRED")
        );
    }
}
