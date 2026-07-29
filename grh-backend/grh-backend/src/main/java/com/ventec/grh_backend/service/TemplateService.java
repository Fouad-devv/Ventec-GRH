package com.ventec.grh_backend.service;

import com.ventec.grh_backend.domain.Template;
import com.ventec.grh_backend.DTO.request.TemplateRequest;
import com.ventec.grh_backend.DTO.response.TemplateResponse;
import com.ventec.grh_backend.exception.NotFoundException;
import com.ventec.grh_backend.repository.TemplateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class TemplateService {

    private final TemplateRepository templateRepository;

    @Transactional(readOnly = true)
    public List<TemplateResponse> getAll() {
        return templateRepository.findAllByOrderByCreatedAtDesc()
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public TemplateResponse get(UUID id) {
        return templateRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new NotFoundException("Template not found: " + id));
    }

    public TemplateResponse create(TemplateRequest req) {
        Template t = Template.builder()
                .name(req.name())
                .type(req.type() != null ? req.type() : "EMAIL")
                .subject(req.subject())
                .content(req.content() != null ? req.content() : "")
                .build();
        return toResponse(templateRepository.save(t));
    }

    public TemplateResponse update(UUID id, TemplateRequest req) {
        Template t = templateRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Template not found: " + id));
        if (req.name()    != null) t.setName(req.name());
        if (req.type()    != null) t.setType(req.type());
        if (req.subject() != null) t.setSubject(req.subject());
        if (req.content() != null) t.setContent(req.content());
        return toResponse(templateRepository.save(t));
    }

    public void delete(UUID id) {
        if (!templateRepository.existsById(id))
            throw new NotFoundException("Template not found: " + id);
        templateRepository.deleteById(id);
    }

    private TemplateResponse toResponse(Template t) {
        return new TemplateResponse(
                t.getId(), t.getName(), t.getType(), t.getSubject(),
                t.getContent(), t.getCreatedAt(), t.getUpdatedAt()
        );
    }
}
