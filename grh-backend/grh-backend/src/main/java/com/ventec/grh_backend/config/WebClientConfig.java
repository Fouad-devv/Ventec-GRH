package com.ventec.grh_backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {

    @Value("${ai.service.url}")
    private String aiServiceUrl;

    @Value("${anthropic.api.key}")
    private String anthropicApiKey;

    @Value("${anthropic.api.url:https://api.anthropic.com}")
    private String anthropicApiUrl;

    @Bean
    public WebClient aiWebClient() {
        return WebClient.builder()
                .baseUrl(aiServiceUrl)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    @Bean
    public WebClient anthropicWebClient() {
        return WebClient.builder()
                .baseUrl(anthropicApiUrl)
                .defaultHeader("x-api-key", anthropicApiKey)
                .defaultHeader("anthropic-version", "2023-06-01")
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .codecs(c -> c.defaultCodecs().maxInMemorySize(2 * 1024 * 1024))
                .build();
    }
}
