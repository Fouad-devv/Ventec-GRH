package com.ventec.grh_backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ventec.grh_backend.service.FilterService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

// NOTE: /callback/** must be added to SecurityConfig permitAll() list —
// this endpoint is called by the internal AI service, not by authenticated users.
@RestController
@RequestMapping("/callback")
@RequiredArgsConstructor
public class CallbackController {

    private final FilterService filterService;
    private final ObjectMapper objectMapper;

    @PostMapping("/filter/{filterJobId}")
    public ResponseEntity<Void> filterCallback(
            @PathVariable UUID filterJobId,
            @RequestBody Map<String, Object> payload) {
        String status = (String) payload.get("status");
        String result = null;
        if (payload.containsKey("result")) {
            try {
                result = objectMapper.writeValueAsString(payload.get("result"));
            } catch (Exception ignored) {}
        }
        String errorMessage = (String) payload.get("error_message");
        filterService.handleCallback(filterJobId, status, result, errorMessage);
        return ResponseEntity.ok().build();
    }
}
