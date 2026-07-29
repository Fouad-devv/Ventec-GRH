package com.ventec.grh_backend.controller;

import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/debug")
public class DebugController {

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
