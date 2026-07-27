package com.ventec.grh_backend.service;

import com.ventec.grh_backend.domain.Candidate;
import com.ventec.grh_backend.DTO.response.CandidateResponse;
import com.ventec.grh_backend.exception.NotFoundException;
import com.ventec.grh_backend.repository.CandidateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class CandidateService {

    private final CandidateRepository candidateRepository;
    private final StorageService storageService;

    public CandidateResponse createCandidate(MultipartFile cv,
                                              String firstName, String lastName,
                                              String email, String phone,
                                              String linkedinUrl, String location) {
        String cvPath = null;
        if (cv != null && !cv.isEmpty()) {
            cvPath = storageService.store(cv, "cvs");
        }
        Candidate candidate = Candidate.builder()
                .firstName(firstName)
                .lastName(lastName)
                .email(email)
                .phone(phone)
                .linkedinUrl(linkedinUrl)
                .location(location)
                .cvPath(cvPath)
                .build();
        return toResponse(candidateRepository.save(candidate));
    }

    public CandidateResponse updateCandidate(UUID id, String firstName, String lastName,
                                              String email, String phone,
                                              String linkedinUrl, String location) {
        Candidate candidate = candidateRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Candidate not found: " + id));
        if (firstName != null) candidate.setFirstName(firstName);
        if (lastName != null) candidate.setLastName(lastName);
        if (email != null) candidate.setEmail(email);
        if (phone != null) candidate.setPhone(phone);
        if (linkedinUrl != null) candidate.setLinkedinUrl(linkedinUrl);
        if (location != null) candidate.setLocation(location);
        return toResponse(candidateRepository.save(candidate));
    }

    @Transactional(readOnly = true)
    public CandidateResponse getCandidate(UUID id) {
        return candidateRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new NotFoundException("Candidate not found: " + id));
    }

    @Transactional(readOnly = true)
    public Page<CandidateResponse> getAllCandidates(Pageable pageable) {
        return candidateRepository.findAll(pageable).map(this::toResponse);
    }

    public void deleteCandidate(UUID id) {
        Candidate candidate = candidateRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Candidate not found: " + id));
        storageService.delete(candidate.getCvPath());
        candidateRepository.delete(candidate);
    }

    @Transactional(readOnly = true)
    public Candidate getCandidateEntity(UUID id) {
        return candidateRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Candidate not found: " + id));
    }

    public CandidateResponse toResponse(Candidate c) {
        return new CandidateResponse(
                c.getId(), c.getFirstName(), c.getLastName(), c.getEmail(),
                c.getPhone(), c.getLinkedinUrl(), c.getCvPath(),
                c.getSkills(), c.getExperienceYears(), c.getEducation(),
                c.getCurrentPosition(), c.getLocation(),
                c.getCreatedAt(), c.getUpdatedAt()
        );
    }
}
