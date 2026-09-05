package com.ventec.grh_backend.service;

import jakarta.activation.DataHandler;
import jakarta.mail.Message.RecipientType;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeBodyPart;
import jakarta.mail.internet.MimeMessage;
import jakarta.mail.internet.MimeMultipart;
import jakarta.mail.util.ByteArrayDataSource;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Base64;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class MailService {

    private final JavaMailSender mailSender;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${mail.from}")
    private String from;

    @Value("${brevo.api-key:}")
    private String brevoApiKey;

    @Value("${app.logo-url:}")
    private String logoUrl;

    private boolean useBrevoApi() {
        return brevoApiKey != null && !brevoApiKey.isBlank();
    }

    @Async
    public void sendSimple(String to, String subject, String text) {
        if (useBrevoApi()) {
            sendViaBrevoApi(to, subject, "<pre>" + text + "</pre>");
            return;
        }
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(from);
            msg.setTo(to);
            msg.setSubject(subject);
            msg.setText(text);
            mailSender.send(msg);
        } catch (Exception e) {
            log.error("Failed to send email to {}: {}", to, e.getMessage());
        }
    }

    @Async
    public void sendHtml(String to, String subject, String html) {
        if (useBrevoApi()) {
            sendViaBrevoApi(to, subject, html);
            return;
        }
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(from);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(html, true);
            mailSender.send(msg);
        } catch (Exception e) {
            log.error("Failed to send HTML email to {}: {}", to, e.getMessage());
        }
    }

    /**
     * Sends an HTML email with one inline image using a proper multipart/related structure.
     * The HTML must reference the image via <img src="cid:{cid}">.
     * multipart/related ensures the image is truly inline — not shown as an attachment.
     */
    @Async
    public void sendHtmlWithInline(String to, String subject, String html,
                                   String cid, byte[] imageBytes, String contentType) {
        if (useBrevoApi()) {
            String resolvedHtml = (logoUrl != null && !logoUrl.isBlank())
                    ? html.replace("cid:" + cid, logoUrl)
                    : html.replace("src=\"cid:" + cid + "\"", "src=\"\" style=\"display:none\"");
            sendViaBrevoApi(to, subject, resolvedHtml);
            return;
        }
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            msg.setFrom(new InternetAddress(from));
            msg.setRecipient(RecipientType.TO, new InternetAddress(to));
            msg.setSubject(subject, "UTF-8");

            MimeMultipart related = new MimeMultipart("related");

            MimeBodyPart htmlPart = new MimeBodyPart();
            htmlPart.setContent(html, "text/html; charset=UTF-8");
            related.addBodyPart(htmlPart);

            MimeBodyPart imgPart = new MimeBodyPart();
            imgPart.setDataHandler(new DataHandler(new ByteArrayDataSource(imageBytes, contentType)));
            imgPart.setContentID("<" + cid + ">");
            imgPart.setHeader("Content-Disposition", "inline; filename=\"logo.jpeg\"");
            related.addBodyPart(imgPart);

            msg.setContent(related);
            mailSender.send(msg);
        } catch (Exception e) {
            log.error("Failed to send HTML email with inline image to {}: {}", to, e.getMessage());
        }
    }

    @Async
    public void sendHtmlWithInlineAndAttachment(String to, String subject, String html,
                                                String cid, byte[] imageBytes, String imageContentType,
                                                byte[] attachmentBytes, String attachmentFilename) {
        if (useBrevoApi()) {
            String resolvedHtml = (logoUrl != null && !logoUrl.isBlank())
                    ? html.replace("cid:" + cid, logoUrl)
                    : html.replace("src=\"cid:" + cid + "\"", "src=\"\" style=\"display:none\"");
            sendViaBrevoApiWithAttachment(to, subject, resolvedHtml, attachmentBytes, attachmentFilename);
            return;
        }
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            msg.setFrom(new InternetAddress(from));
            msg.setRecipient(RecipientType.TO, new InternetAddress(to));
            msg.setSubject(subject, "UTF-8");

            MimeMultipart mixed = new MimeMultipart("mixed");

            MimeMultipart related = new MimeMultipart("related");
            MimeBodyPart htmlPart = new MimeBodyPart();
            htmlPart.setContent(html, "text/html; charset=UTF-8");
            related.addBodyPart(htmlPart);

            MimeBodyPart imgPart = new MimeBodyPart();
            imgPart.setDataHandler(new DataHandler(new ByteArrayDataSource(imageBytes, imageContentType)));
            imgPart.setContentID("<" + cid + ">");
            imgPart.setHeader("Content-Disposition", "inline; filename=\"logo.jpeg\"");
            related.addBodyPart(imgPart);

            MimeBodyPart relatedWrapper = new MimeBodyPart();
            relatedWrapper.setContent(related);
            mixed.addBodyPart(relatedWrapper);

            MimeBodyPart attachPart = new MimeBodyPart();
            attachPart.setDataHandler(new DataHandler(new ByteArrayDataSource(attachmentBytes, "application/pdf")));
            attachPart.setFileName(attachmentFilename);
            attachPart.setDisposition(MimeBodyPart.ATTACHMENT);
            mixed.addBodyPart(attachPart);

            msg.setContent(mixed);
            mailSender.send(msg);
        } catch (Exception e) {
            log.error("Failed to send HTML email with attachment to {}: {}", to, e.getMessage());
        }
    }

    private void sendViaBrevoApi(String to, String subject, String html) {
        try {
            Map<String, Object> body = Map.of(
                "sender", Map.of("email", from, "name", "Ventec GRH"),
                "to", List.of(Map.of("email", to)),
                "subject", subject,
                "htmlContent", html
            );
            HttpHeaders headers = new HttpHeaders();
            headers.set("api-key", brevoApiKey);
            headers.setContentType(MediaType.APPLICATION_JSON);
            ResponseEntity<String> resp = restTemplate.exchange(
                "https://api.brevo.com/v3/smtp/email",
                HttpMethod.POST,
                new HttpEntity<>(body, headers),
                String.class
            );
            log.info("Email sent via Brevo API to {} (status: {})", to, resp.getStatusCode());
        } catch (Exception e) {
            log.error("Failed to send email via Brevo API to {}: {}", to, e.getMessage());
        }
    }

    private void sendViaBrevoApiWithAttachment(String to, String subject, String html,
                                               byte[] attachmentBytes, String attachmentFilename) {
        try {
            java.util.Map<String, Object> attachmentEntry = new java.util.HashMap<>();
            attachmentEntry.put("content", Base64.getEncoder().encodeToString(attachmentBytes));
            attachmentEntry.put("name", attachmentFilename);

            java.util.Map<String, Object> body = new java.util.HashMap<>();
            body.put("sender", Map.of("email", from, "name", "Ventec GRH"));
            body.put("to", List.of(Map.of("email", to)));
            body.put("subject", subject);
            body.put("htmlContent", html);
            body.put("attachment", List.of(attachmentEntry));

            HttpHeaders headers = new HttpHeaders();
            headers.set("api-key", brevoApiKey);
            headers.setContentType(MediaType.APPLICATION_JSON);
            ResponseEntity<String> resp = restTemplate.exchange(
                "https://api.brevo.com/v3/smtp/email",
                HttpMethod.POST,
                new HttpEntity<>(body, headers),
                String.class
            );
            log.info("Email with attachment sent via Brevo API to {} (status: {})", to, resp.getStatusCode());
        } catch (Exception e) {
            log.error("Failed to send email with attachment via Brevo API to {}: {}", to, e.getMessage());
        }
    }
}
