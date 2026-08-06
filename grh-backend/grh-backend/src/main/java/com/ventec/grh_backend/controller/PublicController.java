package com.ventec.grh_backend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Public")
@RestController
@RequestMapping("/public")
public class PublicController {

    @Operation(summary = "Logo Ventec", description = "Retourne le logo JPEG de l'entreprise (mis en cache 24h)")
    @GetMapping(value = "/logo", produces = "image/jpeg")
    public ResponseEntity<byte[]> getLogo() {
        try {
            byte[] bytes = new ClassPathResource("images/ventec-logo.jpeg").getInputStream().readAllBytes();
            return ResponseEntity.ok()
                    .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                    .body(bytes);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}
