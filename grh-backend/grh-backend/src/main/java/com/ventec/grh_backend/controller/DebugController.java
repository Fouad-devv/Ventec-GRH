package com.ventec.grh_backend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@Tag(name = "Debug")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/debug")
public class DebugController {

    @Operation(summary = "Inspecter le token JWT courant", description = "Retourne les claims du token JWT (sub, rôles, realm_access, resource_access) pour diagnostiquer les problèmes d'authentification")
    @GetMapping("/me")
    public Map<String, Object> me(Authentication auth) {
        if (auth instanceof JwtAuthenticationToken jwtAuth) {
            Jwt jwt = jwtAuth.getToken();
            return Map.of(
                "name", auth.getName(),
                "authorities", auth.getAuthorities().stream()
                        .map(a -> a.getAuthority()).toList(),
                "realm_access", jwt.getClaim("realm_access") != null ? jwt.getClaim("realm_access") : "null",
                "resource_access", jwt.getClaim("resource_access") != null ? jwt.getClaim("resource_access") : "null",
                "sub", jwt.getSubject()
            );
        }
        return Map.of("name", auth.getName(), "authorities", auth.getAuthorities());
    }
}
