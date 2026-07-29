package com.ventec.grh_backend.service;

import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.ventec.grh_backend.domain.Interview;
import com.ventec.grh_backend.domain.JobPosting;
import com.ventec.grh_backend.exception.NotFoundException;
import com.ventec.grh_backend.repository.InterviewRepository;
import com.ventec.grh_backend.repository.JobPostingRepository;
import lombok.RequiredArgsConstructor;
import org.apache.poi.xwpf.usermodel.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ExportService {

    private final JobPostingRepository jobPostingRepository;
    private final InterviewRepository interviewRepository;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    // ── Word export for job posting ──────────────────────────────────────────
    public byte[] exportPostingToDocx(UUID id) {
        JobPosting p = jobPostingRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Job posting not found: " + id));

        try (XWPFDocument doc = new XWPFDocument();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            // Title
            XWPFParagraph title = doc.createParagraph();
            title.setAlignment(ParagraphAlignment.CENTER);
            XWPFRun titleRun = title.createRun();
            titleRun.setText(p.getTitle());
            titleRun.setBold(true);
            titleRun.setFontSize(20);
            titleRun.addBreak();

            // Metadata line
            XWPFParagraph meta = doc.createParagraph();
            meta.setAlignment(ParagraphAlignment.CENTER);
            XWPFRun metaRun = meta.createRun();
            metaRun.setColor("6B7280");
            metaRun.setFontSize(11);
            String metaText = String.join("  ·  ",
                    p.getDepartment() != null ? p.getDepartment() : "",
                    p.getLocation() != null ? p.getLocation() : "",
                    p.getContractType() != null ? p.getContractType() : ""
            ).replaceAll("(  ·  )+", "  ·  ").trim().replaceAll("^  ·  |  ·  $", "");
            metaRun.setText(metaText);
            metaRun.addBreak();

            // Experience + deadline
            if (p.getMinExperience() != null || p.getDeadline() != null) {
                XWPFParagraph infoLine = doc.createParagraph();
                XWPFRun infoRun = infoLine.createRun();
                infoRun.setFontSize(10);
                infoRun.setColor("6B7280");
                if (p.getMinExperience() != null)
                    infoRun.setText("Expérience minimum : " + p.getMinExperience() + " an(s)   ");
                if (p.getDeadline() != null)
                    infoRun.setText((infoRun.text() != null ? infoRun.text() : "") +
                            "Date limite : " + p.getDeadline().toString());
            }

            doc.createParagraph(); // spacer

            // Description section
            if (p.getDescription() != null && !p.getDescription().isBlank()) {
                addSection(doc, "Description du poste", p.getDescription());
            }

            // Requirements section
            if (p.getRequirements() != null && !p.getRequirements().isBlank()) {
                addSection(doc, "Exigences", p.getRequirements());
            }

            // Footer
            XWPFParagraph footer = doc.createParagraph();
            footer.setAlignment(ParagraphAlignment.CENTER);
            XWPFRun footerRun = footer.createRun();
            footerRun.setFontSize(9);
            footerRun.setColor("9CA3AF");
            footerRun.setText("Document généré par Ventec GRH");

            doc.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Erreur lors de la génération du document Word", e);
        }
    }

    private void addSection(XWPFDocument doc, String heading, String content) {
        XWPFParagraph h = doc.createParagraph();
        XWPFRun hRun = h.createRun();
        hRun.setText(heading);
        hRun.setBold(true);
        hRun.setFontSize(13);
        hRun.setColor("1D4ED8");

        XWPFParagraph body = doc.createParagraph();
        XWPFRun bodyRun = body.createRun();
        bodyRun.setFontSize(11);
        bodyRun.setText(content);

        doc.createParagraph(); // spacer
    }

    // ── PDF export for interview compte-rendu ────────────────────────────────
    public byte[] exportInterviewToPdf(UUID id) {
        Interview interview = interviewRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Interview not found: " + id));

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document pdf = new Document(PageSize.A4, 50, 50, 60, 60);
            PdfWriter.getInstance(pdf, out);
            pdf.open();

            Font titleFont   = new Font(Font.HELVETICA, 18, Font.BOLD, new Color(29, 78, 216));
            Font headingFont = new Font(Font.HELVETICA, 12, Font.BOLD, new Color(55, 65, 81));
            Font labelFont   = new Font(Font.HELVETICA, 10, Font.BOLD, new Color(107, 114, 128));
            Font valueFont   = new Font(Font.HELVETICA, 10, Font.NORMAL, new Color(17, 24, 39));
            Font noteFont    = new Font(Font.HELVETICA, 10, Font.ITALIC, new Color(75, 85, 99));
            Font footerFont  = new Font(Font.HELVETICA, 8, Font.NORMAL, new Color(156, 163, 175));

            // Title
            Paragraph title = new Paragraph("Compte-rendu d'entretien", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(6);
            pdf.add(title);

            // Divider line via empty cell
            PdfPTable divider = new PdfPTable(1);
            divider.setWidthPercentage(100);
            PdfPCell divCell = new PdfPCell();
            divCell.setBackgroundColor(new Color(29, 78, 216));
            divCell.setFixedHeight(2f);
            divCell.setBorder(Rectangle.NO_BORDER);
            divider.addCell(divCell);
            divider.setSpacingAfter(16);
            pdf.add(divider);

            // Candidate + posting info
            var app = interview.getApplication();
            if (app != null) {
                pdf.add(new Paragraph("Poste", headingFont));
                pdf.add(field("Intitulé", app.getJobPosting() != null ? app.getJobPosting().getTitle() : "—", labelFont, valueFont));
                pdf.add(field("Candidat",
                        app.getCandidate() != null
                                ? app.getCandidate().getFirstName() + " " + app.getCandidate().getLastName()
                                : "—", labelFont, valueFont));
                pdf.add(new Paragraph(" "));
            }

            // Interview details table
            pdf.add(new Paragraph("Détails de l'entretien", headingFont));
            pdf.add(new Paragraph(" "));

            PdfPTable table = new PdfPTable(2);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{1f, 2f});

            addRow(table, "Date & heure",
                    interview.getScheduledAt() != null
                            ? interview.getScheduledAt().format(DATE_FMT) : "—",
                    labelFont, valueFont);
            addRow(table, "Durée",
                    interview.getDurationMinutes() != null
                            ? interview.getDurationMinutes() + " minutes" : "—",
                    labelFont, valueFont);
            addRow(table, "Type",    interview.getType()          != null ? interview.getType() : "—", labelFont, valueFont);
            addRow(table, "Lieu/Lien", interview.getLocationOrLink() != null ? interview.getLocationOrLink() : "—", labelFont, valueFont);
            addRow(table, "Statut", interview.getStatus()         != null ? interview.getStatus() : "—", labelFont, valueFont);
            table.setSpacingAfter(16);
            pdf.add(table);

            // Notes
            pdf.add(new Paragraph("Notes et observations", headingFont));
            pdf.add(new Paragraph(" "));
            String notes = (interview.getNotes() != null && !interview.getNotes().isBlank())
                    ? interview.getNotes() : "Aucune note enregistrée.";
            Paragraph notesPara = new Paragraph(notes, noteFont);
            notesPara.setSpacingAfter(24);
            pdf.add(notesPara);

            // Signature area
            PdfPTable sigTable = new PdfPTable(2);
            sigTable.setWidthPercentage(100);
            addSigCell(sigTable, "Signature du recruteur", valueFont);
            addSigCell(sigTable, "Signature du candidat", valueFont);
            pdf.add(sigTable);

            // Footer
            pdf.add(new Paragraph(" "));
            Paragraph footer = new Paragraph("Document généré par Ventec GRH", footerFont);
            footer.setAlignment(Element.ALIGN_CENTER);
            pdf.add(footer);

            pdf.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Erreur lors de la génération du PDF", e);
        }
    }

    private Paragraph field(String label, String value, Font labelFont, Font valueFont) {
        Paragraph p = new Paragraph();
        p.add(new Chunk(label + " : ", labelFont));
        p.add(new Chunk(value, valueFont));
        p.setSpacingAfter(4);
        return p;
    }

    private void addRow(PdfPTable table, String label, String value, Font labelFont, Font valueFont) {
        PdfPCell lCell = new PdfPCell(new Phrase(label, labelFont));
        lCell.setBorder(Rectangle.BOTTOM);
        lCell.setBorderColor(new Color(229, 231, 235));
        lCell.setPadding(6);
        PdfPCell vCell = new PdfPCell(new Phrase(value, valueFont));
        vCell.setBorder(Rectangle.BOTTOM);
        vCell.setBorderColor(new Color(229, 231, 235));
        vCell.setPadding(6);
        table.addCell(lCell);
        table.addCell(vCell);
    }

    private void addSigCell(PdfPTable table, String label, Font font) {
        PdfPCell cell = new PdfPCell();
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setPadding(8);
        Paragraph p = new Paragraph();
        p.add(new Chunk(label + "\n\n\n_______________________", font));
        cell.addElement(p);
        table.addCell(cell);
    }
}
