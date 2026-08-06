package com.ventec.grh_backend.service;

import com.ventec.grh_backend.DTO.response.DashboardStatsResponse;
import com.ventec.grh_backend.DTO.response.UpcomingInterviewDto;
import com.ventec.grh_backend.DTO.response.YearBreakdownResponse;
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

    public YearBreakdownResponse getYearBreakdown(int year) {
        OffsetDateTime start = OffsetDateTime.now().withYear(year).withDayOfYear(1).truncatedTo(ChronoUnit.DAYS);
        OffsetDateTime end   = start.plusYears(1);
        return new YearBreakdownResponse(
                applicationRepository.countByStatusAndAppliedAtBetween("NEW", start, end)
                        + applicationRepository.countByStatusAndAppliedAtBetween("SCREENING", start, end),
                applicationRepository.countByStatusAndAppliedAtBetween("SHORTLISTED", start, end),
                interviewRepository.countByScheduledAtBetween(start, end),
                applicationRepository.countByStatusAndAppliedAtBetween("HIRED", start, end),
                applicationRepository.countByStatusAndAppliedAtBetween("REJECTED", start, end)
        );
    }

    private UpcomingInterviewDto toUpcomingDto(Interview i) {
        var app = i.getApplication();
        var candidate = app != null ? app.getCandidate() : null;
        var posting = app != null ? app.getJobPosting() : null;
        return new UpcomingInterviewDto(
                i.getId(),
                app != null ? app.getId() : null,
                candidate != null ? candidate.getId() : null,
                candidate != null ? candidate.getFirstName() : null,
                candidate != null ? candidate.getLastName() : null,
                posting != null ? posting.getTitle() : null,
                i.getScheduledAt(),
                i.getDurationMinutes(),
                i.getType()
        );
    }

    public DashboardStatsResponse getStats() {
        OffsetDateTime now = OffsetDateTime.now();

        OffsetDateTime startOfWeek = now.with(DayOfWeek.MONDAY).truncatedTo(ChronoUnit.DAYS);
        OffsetDateTime endOfWeek   = startOfWeek.plusDays(7);

        OffsetDateTime startOfYear = now.withDayOfYear(1).truncatedTo(ChronoUnit.DAYS);
        OffsetDateTime endOfYear   = startOfYear.plusYears(1);

        long interviewsThisWeek = interviewRepository
                .countByStatusNotAndScheduledAtBetween("CANCELLED", startOfWeek, endOfWeek);

        List<UpcomingInterviewDto> upcoming = interviewRepository
                .findByStatusAndScheduledAtBefore("SCHEDULED", now.plusDays(7))
                .stream()
                .filter(i -> {
                    int dur = i.getDurationMinutes() != null ? i.getDurationMinutes() : 60;
                    return i.getScheduledAt().plusMinutes(dur).isAfter(now);
                })
                .sorted((a, b) -> a.getScheduledAt().compareTo(b.getScheduledAt()))
                .limit(10)
                .map(this::toUpcomingDto)
                .toList();

        List<UpcomingInterviewDto> overdue = interviewRepository
                .findByStatusAndScheduledAtBefore("SCHEDULED", now)
                .stream()
                .filter(i -> {
                    int dur = i.getDurationMinutes() != null ? i.getDurationMinutes() : 60;
                    return i.getScheduledAt().plusMinutes(dur).isBefore(now);
                })
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
                interviewRepository.count(),
                applicationRepository.countByStatus("HIRED"),
                upcoming,
                overdue,
                applicationRepository.countByStatusAndAppliedAtBetween("NEW", startOfYear, endOfYear)
                        + applicationRepository.countByStatusAndAppliedAtBetween("SCREENING", startOfYear, endOfYear),
                applicationRepository.countByStatusAndAppliedAtBetween("SHORTLISTED", startOfYear, endOfYear),
                interviewRepository.countByScheduledAtBetween(startOfYear, endOfYear),
                applicationRepository.countByStatusAndAppliedAtBetween("HIRED", startOfYear, endOfYear),
                applicationRepository.countByStatusAndAppliedAtBetween("REJECTED", startOfYear, endOfYear)
        );
    }
}
