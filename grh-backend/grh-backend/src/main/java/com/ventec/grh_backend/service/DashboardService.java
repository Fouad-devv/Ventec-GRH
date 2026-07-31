package com.ventec.grh_backend.service;

import com.ventec.grh_backend.DTO.response.DashboardStatsResponse;
import com.ventec.grh_backend.DTO.response.UpcomingInterviewDto;
import com.ventec.grh_backend.domain.Interview;
import com.ventec.grh_backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardService {

    private final JobPostingRepository jobPostingRepository;
    private final CandidateRepository candidateRepository;
    private final ApplicationRepository applicationRepository;
    private final InterviewRepository interviewRepository;

    private UpcomingInterviewDto toUpcomingDto(Interview i) {
        var app = i.getApplication();
        var candidate = app != null ? app.getCandidate() : null;
        var posting = app != null ? app.getJobPosting() : null;
        return new UpcomingInterviewDto(
                i.getId(),
                app != null ? app.getId() : null,
                candidate != null ? candidate.getFirstName() : null,
                candidate != null ? candidate.getLastName() : null,
                posting != null ? posting.getTitle() : null,
                i.getScheduledAt(),
                i.getDurationMinutes(),
                i.getType()
        );
    }

    public DashboardStatsResponse getStats() {
        OffsetDateTime startOfWeek = OffsetDateTime.now()
                .with(DayOfWeek.MONDAY)
                .truncatedTo(ChronoUnit.DAYS);
        OffsetDateTime endOfWeek = startOfWeek.plusDays(7);

        long interviewsThisWeek = interviewRepository
                .findByStatusAndScheduledAtBetween("SCHEDULED", startOfWeek, endOfWeek)
                .size();

        OffsetDateTime now = OffsetDateTime.now();
        List<UpcomingInterviewDto> upcoming = interviewRepository
                .findByStatusAndScheduledAtBetween("SCHEDULED", now, now.plusDays(7))
                .stream()
                .sorted((a, b) -> a.getScheduledAt().compareTo(b.getScheduledAt()))
                .limit(10)
                .map(this::toUpcomingDto)
                .toList();

        return new DashboardStatsResponse(
                jobPostingRepository.count(),
                jobPostingRepository.countByStatus("PUBLISHED"),
                candidateRepository.count(),
                applicationRepository.count(),
                applicationRepository.countByStatus("NEW") + applicationRepository.countByStatus("SCREENING"),
                applicationRepository.countByStatus("SHORTLISTED"),
                applicationRepository.countByStatus("INTERVIEW"),
                applicationRepository.countByStatus("HIRED"),
                applicationRepository.countByStatus("REJECTED"),
                interviewsThisWeek,
                applicationRepository.countByStatus("HIRED"),
                upcoming
        );
    }
}
