package com.ventec.grh_backend.service;

import com.ventec.grh_backend.domain.User;
import com.ventec.grh_backend.exception.NotFoundException;
import com.ventec.grh_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserContextService {
    private final UserRepository userRepository;

    @Transactional
    public User resolveUser(Authentication auth) {
        if (!(auth instanceof JwtAuthenticationToken jwtAuth)) {
            throw new NotFoundException("User not found: " + auth.getName());
        }
        Jwt jwt = jwtAuth.getToken();
        String sub   = jwt.getSubject();
        String email = jwt.getClaimAsString("email");
        if (email == null) email = jwt.getClaimAsString("preferred_username");
        final String finalEmail = email;
        return userRepository.findByKeycloakId(sub)
                .or(() -> userRepository.findByEmail(finalEmail))
                .orElseGet(() -> userRepository.save(User.builder()
                        .keycloakId(sub)
                        .email(finalEmail)
                        .firstName(jwt.getClaimAsString("given_name"))
                        .lastName(jwt.getClaimAsString("family_name"))
                        .role("RH")
                        .active(true)
                        .build()));
    }
}
