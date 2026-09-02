package com.ventec.keycloak;

import org.keycloak.email.EmailException;
import org.keycloak.email.EmailSenderProvider;
import org.keycloak.models.UserModel;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;

public class BrevoEmailSenderProvider implements EmailSenderProvider {

    private static final HttpClient HTTP = HttpClient.newHttpClient();

    @Override
    public void send(Map<String, String> config, UserModel user, String subject, String textBody, String htmlBody) throws EmailException {
        String apiKey = System.getenv("BREVO_API_KEY");
        if (apiKey == null || apiKey.isBlank()) {
            throw new EmailException("BREVO_API_KEY environment variable is not set");
        }

        String from     = env("MAIL_FROM",         config.getOrDefault("from",            "noreply@ventec.ma"));
        String fromName = env("MAIL_FROM_NAME",     config.getOrDefault("fromDisplayName", "Ventec GRH"));
        String to       = user.getEmail();
        String content  = htmlBody != null && !htmlBody.isBlank() ? htmlBody : "<pre>" + textBody + "</pre>";

        String json = "{"
                + "\"sender\":{\"email\":\"" + esc(from) + "\",\"name\":\"" + esc(fromName) + "\"},"
                + "\"to\":[{\"email\":\"" + esc(to) + "\"}],"
                + "\"subject\":\"" + esc(subject) + "\","
                + "\"htmlContent\":\"" + esc(content) + "\""
                + "}";

        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.brevo.com/v3/smtp/email"))
                    .header("api-key", apiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();
            HttpResponse<String> resp = HTTP.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() >= 300) {
                throw new EmailException("Brevo API returned " + resp.statusCode() + ": " + resp.body());
            }
        } catch (EmailException e) {
            throw e;
        } catch (Exception e) {
            throw new EmailException(e);
        }
    }

    private String env(String key, String fallback) {
        String v = System.getenv(key);
        return (v != null && !v.isBlank()) ? v : fallback;
    }

    private String esc(String s) {
        if (s == null) return "";
        StringBuilder sb = new StringBuilder(s.length() + 16);
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"'  -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default   -> { if (c < 0x20) sb.append(String.format("\\u%04x", (int) c)); else sb.append(c); }
            }
        }
        return sb.toString();
    }

    @Override
    public void close() {}
}
