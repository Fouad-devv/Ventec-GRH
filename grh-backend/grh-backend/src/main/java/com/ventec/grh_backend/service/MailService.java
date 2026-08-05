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
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@Slf4j
@RequiredArgsConstructor
public class MailService {

    private final JavaMailSender mailSender;

    @Value("${mail.from}")
    private String from;

    @Async
    public void sendSimple(String to, String subject, String text) {
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
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            msg.setFrom(new InternetAddress(from));
            msg.setRecipient(RecipientType.TO, new InternetAddress(to));
            msg.setSubject(subject, "UTF-8");

            // multipart/related keeps HTML and its inline images together as one unit —
            // no separate attachment, correct rendering in Gmail and Outlook
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
}
