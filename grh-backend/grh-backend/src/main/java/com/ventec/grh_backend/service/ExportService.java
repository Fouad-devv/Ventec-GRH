package com.ventec.grh_backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;

import com.lowagie.text.Chunk;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.Image;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.BaseFont;
import com.lowagie.text.pdf.PdfContentByte;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;

import com.ventec.grh_backend.domain.Application;
import com.ventec.grh_backend.domain.DocumentChecklist;
import com.ventec.grh_backend.domain.Interview;
import com.ventec.grh_backend.domain.JobPosting;
import com.ventec.grh_backend.exception.NotFoundException;
import com.ventec.grh_backend.repository.ApplicationRepository;
import com.ventec.grh_backend.repository.DocumentChecklistRepository;
import com.ventec.grh_backend.repository.InterviewRepository;
import com.ventec.grh_backend.repository.JobPostingRepository;

import lombok.RequiredArgsConstructor;

import org.apache.poi.xwpf.usermodel.ParagraphAlignment;
import org.apache.poi.xwpf.usermodel.UnderlinePatterns;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableCell;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;

import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTBorder;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTDecimalNumber;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTShd;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTTblBorders;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTTblPr;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTTblWidth;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTTc;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTTcPr;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTVMerge;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.STBorder;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.STMerge;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.STShd;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.STTblWidth;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigInteger;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.apache.poi.util.Units;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ExportService {

    private final JobPostingRepository jobPostingRepository;
    private final ApplicationRepository applicationRepository;
    private final InterviewRepository interviewRepository;
    private final DocumentChecklistRepository checklistRepository;
    private final AiServiceClient aiServiceClient;
    private final ObjectMapper objectMapper;

    private static final DateTimeFormatter DATE_FMT       = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final DateTimeFormatter DATE_SHORT_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private static final String NAVY  = "1F3864";
    private static final String WHITE = "FFFFFF";
    private static final String BLACK = "000000";
    private static final String LGRAY = "D9D9D9";
    private static final String HDR_FONT = "Times New Roman";

    private static final String[] COMPETENCES_COMPORTEMENTALES = {
        "Ponctualité/Engagement/Disponibilité",
        "Attitude – Présentation",
        "Esprit de négociation et persuasion",
        "Gestion du temps et des priorités",
        "Sens de l'organisation",
        "Sens de l'anticipation",
        "Aisance relationnelle",
        "Sens de la responsabilité et autonomie",
        "Sens de la collaboration / travail en équipe",
        "Proactivité et Dynamisme"
    };

    // ── Word export for job posting ──────────────────────────────────────────
    public byte[] exportPostingToDocx(UUID id) {
        JobPosting p = jobPostingRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Job posting not found: " + id));

        try (XWPFDocument doc = new XWPFDocument();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            XWPFParagraph title = doc.createParagraph();
            title.setAlignment(ParagraphAlignment.CENTER);
            XWPFRun titleRun = title.createRun();
            titleRun.setText(p.getTitle());
            titleRun.setBold(true);
            titleRun.setFontSize(20);
            titleRun.addBreak();

            XWPFParagraph meta = doc.createParagraph();
            meta.setAlignment(ParagraphAlignment.CENTER);
            XWPFRun metaRun = meta.createRun();
            metaRun.setColor("6B7280");
            metaRun.setFontSize(11);
            String metaText = String.join("  ·  ",
                    p.getDepartment()  != null ? p.getDepartment()  : "",
                    p.getLocation()    != null ? p.getLocation()    : "",
                    p.getContractType()!= null ? p.getContractType(): ""
            ).replaceAll("(  ·  )+", "  ·  ").trim().replaceAll("^  ·  |  ·  $", "");
            metaRun.setText(metaText);
            metaRun.addBreak();

            if (p.getMinExperience() != null || p.getDeadline() != null) {
                XWPFParagraph infoLine = doc.createParagraph();
                XWPFRun infoRun = infoLine.createRun();
                infoRun.setFontSize(10);
                infoRun.setColor("6B7280");
                if (p.getMinExperience() != null)
                    infoRun.setText("Expérience minimum : " + p.getMinExperience() + " an(s)   ");
                if (p.getDeadline() != null)
                    infoRun.setText((infoRun.text() != null ? infoRun.text() : "")
                            + "Date limite : " + p.getDeadline());
            }

            doc.createParagraph();

            if (p.getDescription() != null && !p.getDescription().isBlank())
                addSection(doc, "Description du poste", p.getDescription());

            if (p.getRequirements() != null && !p.getRequirements().isBlank())
                addSection(doc, "Exigences", p.getRequirements());

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

        doc.createParagraph();
    }

    // ── Fiche de fonction Word export ────────────────────────────────────────
    @SuppressWarnings("unchecked")
    public byte[] exportFicheFonctionDocx(UUID postingId) {
        JobPosting p = jobPostingRepository.findById(postingId)
                .orElseThrow(() -> new NotFoundException("Job posting not found: " + postingId));

        Map<String, Object> ai = (Map<String, Object>) aiServiceClient
                .generateFicheFonction(p.getTitle(), p.getDepartment(), p.getContractType(),
                        null, p.getDescription(), p.getRequirements())
                .block();
        if (ai == null) ai = Map.of();

        List<String> missions             = toStringList(ai.get("missions"));
        List<Map<String, Object>> activites = toMapList(ai.get("activites_principales"));
        String collaborateursDirects      = toStr(ai.get("collaborateurs_directs"), "Néant");
        List<String> indicateurs          = toStringList(ai.get("indicateurs_performance"));
        String niveauFormation            = toStr(ai.get("niveau_formation"), "");
        String experienceRequise          = toStr(ai.get("experience_requise"), "");
        List<Map<String, Object>> compTech = toMapList(ai.get("competences_techniques"));
        List<String> internesL            = toStringList(ai.get("interlocuteurs_internes"));
        List<String> externesL            = toStringList(ai.get("interlocuteurs_externes"));
        String interimaire                = toStr(ai.get("interimaire"), "");

        try (XWPFDocument doc = new XWPFDocument();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            // ── Header: 4-col table matching original Ventec design ─────────
            // Rows 0-3: logo cell (v-merge) | title content (h-span 3 cols)
            // Rows 4-6: logo cell (v-merge) | Intéressé | Dpt/Service | Direction
            XWPFTable hdrTbl = doc.createTable(7, 4);
            setTableWidth(hdrTbl, 9360);
            final int LOGO_W = 2520;
            final int SIG_W  = 2280; // (9360 - 2520) / 3

            for (int ri = 0; ri < 7; ri++) {
                setCellWidth(hdrTbl.getRow(ri).getCell(0), LOGO_W);
                for (int ci = 1; ci <= 3; ci++) setCellWidth(hdrTbl.getRow(ri).getCell(ci), SIG_W);
            }

            // Col 0: logos in row 0, then v-merge continue rows 1-6
            setVMerge(hdrTbl.getRow(0).getCell(0), true);
            setLogosInCell(doc, hdrTbl.getRow(0).getCell(0));
            for (int ri = 1; ri < 7; ri++) setVMerge(hdrTbl.getRow(ri).getCell(0), false);

            // Rows 0-3: cols 1-3 merged horizontally (h-span 3) for title content
            for (int ri = 0; ri < 4; ri++) {
                XWPFTableCell titleC = hdrTbl.getRow(ri).getCell(1);
                setHSpan(titleC, 3);
                setCellWidth(titleC, SIG_W * 3);
                setCellBg(titleC, WHITE);
                hdrTbl.getRow(ri).getCtRow().removeTc(3);
                hdrTbl.getRow(ri).getCtRow().removeTc(2);
            }

            // Row 0: "MPM3 :" — centered, underlined, Times New Roman
            XWPFParagraph hP0 = hdrTbl.getRow(0).getCell(1).getParagraphs().get(0);
            hP0.setAlignment(ParagraphAlignment.CENTER);
            XWPFRun hR0 = hP0.createRun();
            hR0.setFontFamily(HDR_FONT); hR0.setFontSize(11);
            hR0.setColor(BLACK); hR0.setUnderline(UnderlinePatterns.SINGLE);
            hR0.setText("MPM3 :");

            // Row 1: "MACROPROCESSUS DIRECTION" — bold, underlined, centered
            XWPFParagraph hP1 = hdrTbl.getRow(1).getCell(1).getParagraphs().get(0);
            hP1.setAlignment(ParagraphAlignment.CENTER);
            XWPFRun hR1 = hP1.createRun();
            hR1.setFontFamily(HDR_FONT); hR1.setBold(true); hR1.setFontSize(13);
            hR1.setColor(BLACK); hR1.setUnderline(UnderlinePatterns.SINGLE);
            hR1.setText("MACROPROCESSUS DIRECTION");

            // Row 2: "FICHE DE FONCTION" — bold, underlined, centered
            XWPFParagraph hP2 = hdrTbl.getRow(2).getCell(1).getParagraphs().get(0);
            hP2.setAlignment(ParagraphAlignment.CENTER);
            XWPFRun hR2 = hP2.createRun();
            hR2.setFontFamily(HDR_FONT); hR2.setBold(true); hR2.setFontSize(16);
            hR2.setColor(BLACK); hR2.setUnderline(UnderlinePatterns.SINGLE);
            hR2.setText("FICHE DE FONCTION");

            // Row 3: job title — bold, centered
            XWPFParagraph hP3 = hdrTbl.getRow(3).getCell(1).getParagraphs().get(0);
            hP3.setAlignment(ParagraphAlignment.CENTER);
            XWPFRun hR3 = hP3.createRun();
            hR3.setFontFamily(HDR_FONT); hR3.setBold(true); hR3.setFontSize(13);
            hR3.setColor(BLACK);
            hR3.setText(p.getTitle().toUpperCase());

            // Rows 4-6: 3 separate signature columns
            String[] sigLabels = {"Intéressé(e) :", "Dpt ou Service :", "Direction :"};
            for (int ci = 1; ci <= 3; ci++) {
                XWPFTableCell lC = hdrTbl.getRow(4).getCell(ci);
                setCellBg(lC, WHITE);
                XWPFParagraph lP = lC.getParagraphs().get(0);
                lP.setAlignment(ParagraphAlignment.LEFT);
                XWPFRun lR = lP.createRun();
                lR.setFontFamily(HDR_FONT); lR.setBold(true); lR.setFontSize(9);
                lR.setColor(BLACK); lR.setUnderline(UnderlinePatterns.SINGLE);
                lR.setText(sigLabels[ci - 1]);

                XWPFTableCell dC = hdrTbl.getRow(5).getCell(ci);
                setCellBg(dC, WHITE);
                XWPFRun dR = dC.getParagraphs().get(0).createRun();
                dR.setFontFamily(HDR_FONT); dR.setFontSize(9); dR.setColor(BLACK);
                dR.setText("Date : …………");

                XWPFTableCell vC = hdrTbl.getRow(6).getCell(ci);
                setCellBg(vC, WHITE);
                XWPFRun vR = vC.getParagraphs().get(0).createRun();
                vR.setFontFamily(HDR_FONT); vR.setFontSize(9); vR.setColor(BLACK);
                vR.setText("Visa : …………");
            }

            doc.createParagraph();

            // ── Famille professionnelle / Postes concernés ───────────────────
            XWPFTable famTbl = doc.createTable(4, 2);
            setTableWidth(famTbl, 9360);
            navyCell(famTbl.getRow(0).getCell(0), "Famille professionnelle", ParagraphAlignment.CENTER, 10, true);
            navyCell(famTbl.getRow(0).getCell(1), "Postes concernés",        ParagraphAlignment.CENTER, 10, true);
            plainCell(famTbl.getRow(1).getCell(0), "Support",                ParagraphAlignment.CENTER, 10, false);
            plainCell(famTbl.getRow(1).getCell(1), p.getTitle(),             ParagraphAlignment.CENTER, 10, false);
            navyCell(famTbl.getRow(2).getCell(0), "Métier",                  ParagraphAlignment.CENTER, 10, true);
            navyCell(famTbl.getRow(2).getCell(1), "Filiale",                 ParagraphAlignment.CENTER, 10, true);
            plainCell(famTbl.getRow(3).getCell(0), toStr(p.getDepartment(), "Gestion des Ressources Humaines"),
                      ParagraphAlignment.CENTER, 10, false);
            plainCell(famTbl.getRow(3).getCell(1), "Ventec Maroc",           ParagraphAlignment.CENTER, 10, false);

            doc.createParagraph();

            // ── I. Missions ─────────────────────────────────────────────────
            sectionHeading(doc, "I-", "MISSIONS :");
            for (String m : missions) bulletItem(doc, m);
            doc.createParagraph();

            // ── II. Place du poste dans l'organisation ───────────────────────
            sectionHeading(doc, "II-", "PLACE DU POSTE DANS L'ORGANISATION :");
            doc.createParagraph().createRun()
               .setText("Rattachement hiérarchique : ......................................................................");
            doc.createParagraph();

            // ── III. Activités ───────────────────────────────────────────────
            sectionHeading(doc, "III-", "ACTIVITES :");

            // 1. Activités principales du titulaire
            subSectionHeading(doc, "1.", "Activités principales du titulaire");
            for (Map<String, Object> act : activites) {
                String label = toStr(act.get("label"), "");
                bulletItem(doc, label);
                Object subRaw = act.get("sub");
                if (subRaw instanceof List<?> subList) {
                    for (Object sub : subList) bulletSubItem(doc, String.valueOf(sub));
                }
            }
            bulletItem(doc, "Autres fonctions jugées nécessaires par la hiérarchie.");
            doc.createParagraph();

            // 2. Collaborateurs directs
            subSectionHeading(doc, "2.", "Collaborateurs directs :");
            XWPFParagraph collabP = doc.createParagraph();
            collabP.setIndentationLeft(360);
            XWPFRun collabR = collabP.createRun();
            collabR.setFontSize(10);
            collabR.setText(collaborateursDirects);
            doc.createParagraph();

            // 3. Principaux Interlocuteurs
            subSectionHeading(doc, "3.", "Principaux Interlocuteurs :");
            int interRows = Math.max(Math.max(internesL.size(), externesL.size()), 1);
            XWPFTable interTbl = doc.createTable(interRows + 1, 2);
            setTableWidth(interTbl, 9360);
            XWPFTableRow interHdr = interTbl.getRow(0);
            navyCell(interHdr.getCell(0), "Relations Internes", ParagraphAlignment.CENTER, 10, true);
            navyCell(interHdr.getCell(1), "Relations Externes", ParagraphAlignment.CENTER, 10, true);
            for (int i = 0; i < interRows; i++) {
                XWPFTableRow r = interTbl.getRow(i + 1);
                String interne = i < internesL.size() ? internesL.get(i) : "";
                String externe = i < externesL.size() ? externesL.get(i) : "";
                plainCell(r.getCell(0), interne, ParagraphAlignment.LEFT, 10, false);
                plainCell(r.getCell(1), externe, ParagraphAlignment.LEFT, 10, false);
            }
            doc.createParagraph();

            // ── IV. Indicateurs de performance ──────────────────────────────
            sectionHeading(doc, "IV-", "INDICATEURS DE PERFORMANCE :");
            for (String kpi : indicateurs) bulletItem(doc, kpi);
            doc.createParagraph();

            // ── V. Intérim ──────────────────────────────────────────────────
            sectionHeading(doc, "V-", "INTERIM :");
            XWPFParagraph interimP = doc.createParagraph();
            XWPFRun interimR = interimP.createRun();
            interimR.setFontSize(10);
            interimR.setText(interimaire.isBlank()
                ? "Pendant l'absence du titulaire, l'intérim sera assuré par une personne désignée par le responsable hiérarchique."
                : interimaire);
            doc.createParagraph();

            // ── VI. Critères de compétences ─────────────────────────────────
            sectionHeading(doc, "VI-", "CRITERES DE COMPETENCES :");

            // 1. Niveau de formation et Diplôme requis
            subSectionHeading(doc, "1.", "Niveau de formation et Diplôme requis");
            bulletItem(doc, niveauFormation);
            doc.createParagraph();

            // 2. Expérience requise
            subSectionHeading(doc, "2.", "Expérience requise");
            bulletItem(doc, experienceRequise);
            doc.createParagraph();

            // 3. Compétences techniques et transverses
            subSectionHeading(doc, "3.", "Compétences techniques et transverses :");

            int techRows = compTech.isEmpty() ? 7 : compTech.size();
            XWPFTable techTbl = doc.createTable(techRows + 2, 3);
            setTableWidth(techTbl, 9360);
            XWPFTableRow techHdr = techTbl.getRow(0);
            navyCell(techHdr.getCell(0), "N°",                    ParagraphAlignment.CENTER, 9, true);
            navyCell(techHdr.getCell(1), "Compétences techniques", ParagraphAlignment.LEFT,   9, true);
            navyCell(techHdr.getCell(2), "Poids du Critère",       ParagraphAlignment.CENTER, 9, true);
            for (int i = 0; i < techRows; i++) {
                XWPFTableRow r = techTbl.getRow(i + 1);
                String label   = i < compTech.size() ? toStr(compTech.get(i).get("label"), "") : "";
                Object poidsObj = i < compTech.size() ? compTech.get(i).get("poids") : 5;
                int poids = poidsObj instanceof Number num ? num.intValue() : 5;
                plainCell(r.getCell(0), String.valueOf(i + 1), ParagraphAlignment.CENTER, 9, false);
                plainCell(r.getCell(1), label,                  ParagraphAlignment.LEFT,   9, false);
                plainCell(r.getCell(2), String.valueOf(poids),  ParagraphAlignment.CENTER, 9, false);
            }
            XWPFTableRow techTotal = techTbl.getRow(techRows + 1);
            navyCell(techTotal.getCell(0), "",      ParagraphAlignment.CENTER, 9, true);
            navyCell(techTotal.getCell(1), "TOTAL", ParagraphAlignment.LEFT,   9, true);
            navyCell(techTotal.getCell(2), "35",    ParagraphAlignment.CENTER, 9, true);

            doc.createParagraph();

            // 4. Compétences comportementales
            subSectionHeading(doc, "4.", "Compétences comportementales :");

            XWPFTable behTbl = doc.createTable(COMPETENCES_COMPORTEMENTALES.length + 2, 3);
            setTableWidth(behTbl, 9360);
            XWPFTableRow behHdr = behTbl.getRow(0);
            navyCell(behHdr.getCell(0), "N°",                           ParagraphAlignment.CENTER, 9, true);
            navyCell(behHdr.getCell(1), "Compétences comportementales", ParagraphAlignment.LEFT,   9, true);
            navyCell(behHdr.getCell(2), "Poids",                        ParagraphAlignment.CENTER, 9, true);
            for (int i = 0; i < COMPETENCES_COMPORTEMENTALES.length; i++) {
                XWPFTableRow r = behTbl.getRow(i + 1);
                plainCell(r.getCell(0), String.valueOf(i + 1),           ParagraphAlignment.CENTER, 9, false);
                plainCell(r.getCell(1), COMPETENCES_COMPORTEMENTALES[i], ParagraphAlignment.LEFT,   9, false);
                plainCell(r.getCell(2), "5",                             ParagraphAlignment.CENTER, 9, false);
            }
            XWPFTableRow behTotal = behTbl.getRow(COMPETENCES_COMPORTEMENTALES.length + 1);
            navyCell(behTotal.getCell(0), "",      ParagraphAlignment.CENTER, 9, true);
            navyCell(behTotal.getCell(1), "TOTAL", ParagraphAlignment.LEFT,   9, true);
            navyCell(behTotal.getCell(2), "50",    ParagraphAlignment.CENTER, 9, true);

            doc.createParagraph();

            // ── VII. QSE ────────────────────────────────────────────────────
            sectionHeading(doc, "VII-", "QUALITE SECURITE ENVIRONNEMENT :");
            bulletItem(doc, "Veiller aux respects des dispositions QSE dans le milieu de travail "
                    + "et remonter tout dysfonctionnement");

            doc.createParagraph();

            // ── Footer: matches PDF "Version du : xx/xx/xxxx" ───────────────
            XWPFTable footerTbl = doc.createTable(1, 2);
            setTableWidth(footerTbl, 9360);
            removeBorders(footerTbl);
            plainCell(footerTbl.getRow(0).getCell(0),
                      "Version du : " + LocalDate.now().format(DATE_SHORT_FMT), ParagraphAlignment.LEFT, 8, true);
            plainCell(footerTbl.getRow(0).getCell(1),
                      "Document généré par Ventec GRH", ParagraphAlignment.RIGHT, 8, false);

            doc.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Erreur lors de la génération de la fiche de fonction", e);
        }
    }

    // ── Documents list Word export ───────────────────────────────────────────

    /** Entry point by application ID — looks up checklist automatically. */
    public byte[] exportDocumentsListDocxByApplication(UUID applicationId) {
        Application app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new NotFoundException("Application not found: " + applicationId));
        return exportDocumentsListDocx(app.getCandidate().getId(), app.getJobPosting().getId());
    }

    public byte[] exportDocumentsListPdfByApplication(UUID applicationId) {
        Application app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new NotFoundException("Application not found: " + applicationId));
        return exportDocumentsListPdf(app.getCandidate().getId(), app.getJobPosting().getId());
    }

    public byte[] exportDocumentsListDocx(UUID candidateId, UUID jobPostingId) {
        DocumentChecklist checklist = checklistRepository
                .findByCandidateIdAndJobPostingId(candidateId, jobPostingId)
                .orElseThrow(() -> new NotFoundException("Checklist not found for candidate "
                        + candidateId + " and posting " + jobPostingId));

        String candidateName = checklist.getCandidate().getFirstName() + " "
                + checklist.getCandidate().getLastName();
        String postingTitle  = checklist.getJobPosting().getTitle();
        String contractType  = checklist.getJobPosting().getContractType();
        List<Map<String, Object>> documents = parseDocumentsListFull(checklist.getDocuments());

        try (XWPFDocument doc = new XWPFDocument();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            // ── Header (logos | title | Management RH) — dashed outer border ─
            XWPFTable headerTbl = doc.createTable(1, 3);
            setTableWidth(headerTbl, 9360);
            // Dashed outer border, thin inner borders (matching original template)
            CTTblPr htPr = headerTbl.getCTTbl().getTblPr();
            if (htPr == null) htPr = headerTbl.getCTTbl().addNewTblPr();
            CTTblBorders htB = htPr.isSetTblBorders() ? htPr.getTblBorders() : htPr.addNewTblBorders();
            setDashedBorder(htB.isSetTop()     ? htB.getTop()     : htB.addNewTop(),     "000000", 8);
            setDashedBorder(htB.isSetBottom()  ? htB.getBottom()  : htB.addNewBottom(),  "000000", 8);
            setDashedBorder(htB.isSetLeft()    ? htB.getLeft()    : htB.addNewLeft(),     "000000", 8);
            setDashedBorder(htB.isSetRight()   ? htB.getRight()   : htB.addNewRight(),    "000000", 8);
            setDashedBorder(htB.isSetInsideH() ? htB.getInsideH() : htB.addNewInsideH(), "000000", 4);
            setDashedBorder(htB.isSetInsideV() ? htB.getInsideV() : htB.addNewInsideV(), "000000", 4);

            XWPFTableRow hRow = headerTbl.getRow(0);

            // Set column widths: logos 25% | title 50% | management 25%
            setCellWidth(hRow.getCell(0), 2340);
            setCellWidth(hRow.getCell(1), 4680);
            setCellWidth(hRow.getCell(2), 2340);

            // Left: Ventec / Ecowell — Franklin Gothic Heavy, no bold, black
            XWPFTableCell leftC = hRow.getCell(0);
            setCellBg(leftC, WHITE);
            leftC.setVerticalAlignment(XWPFTableCell.XWPFVertAlign.CENTER);
            XWPFParagraph lp1 = leftC.getParagraphs().isEmpty() ? leftC.addParagraph() : leftC.getParagraphs().get(0);
            lp1.setAlignment(ParagraphAlignment.CENTER);
            lp1.setSpacingBefore(0); lp1.setSpacingAfter(0);
            XWPFRun lr1 = lp1.createRun();
            lr1.setBold(false); lr1.setFontSize(12); lr1.setFontFamily("Franklin Gothic Heavy"); lr1.setText("Ventec");
            XWPFParagraph lp2 = leftC.addParagraph();
            lp2.setAlignment(ParagraphAlignment.CENTER);
            lp2.setSpacingBefore(0); lp2.setSpacingAfter(0);
            XWPFRun lr2 = lp2.createRun();
            lr2.setBold(false); lr2.setFontSize(12); lr2.setFontFamily("Franklin Gothic Heavy"); lr2.setText("Ecowell");

            // Center: Franklin Gothic Heavy, italic, no bold
            XWPFTableCell midC = hRow.getCell(1);
            setCellBg(midC, WHITE);
            midC.setVerticalAlignment(XWPFTableCell.XWPFVertAlign.CENTER);
            String[] centerLines = {"LISTE DES DOCUMENTS", "ADMINISTRATIFS A FOURNIR", "CDI-CDD"};
            for (int li = 0; li < centerLines.length; li++) {
                XWPFParagraph mp = li == 0
                    ? (midC.getParagraphs().isEmpty() ? midC.addParagraph() : midC.getParagraphs().get(0))
                    : midC.addParagraph();
                mp.setAlignment(ParagraphAlignment.CENTER);
                mp.setSpacingBefore(0); mp.setSpacingAfter(0);
                XWPFRun mr = mp.createRun();
                mr.setBold(false); mr.setItalic(true);
                mr.setFontFamily("Franklin Gothic Heavy"); mr.setFontSize(14);
                mr.setText(centerLines[li]);
            }

            // Right: Management Ressources Humaines — Franklin Gothic Heavy, no bold, black
            XWPFTableCell rightC = hRow.getCell(2);
            setCellBg(rightC, WHITE);
            rightC.setVerticalAlignment(XWPFTableCell.XWPFVertAlign.CENTER);
            String[] rightLines = {"Management", "Ressources", "Humaines"};
            for (int li = 0; li < rightLines.length; li++) {
                XWPFParagraph rp = li == 0
                    ? (rightC.getParagraphs().isEmpty() ? rightC.addParagraph() : rightC.getParagraphs().get(0))
                    : rightC.addParagraph();
                rp.setAlignment(ParagraphAlignment.CENTER);
                rp.setSpacingBefore(0); rp.setSpacingAfter(0);
                XWPFRun rr = rp.createRun();
                rr.setBold(false); rr.setFontSize(10); rr.setColor("000000");
                rr.setFontFamily("Franklin Gothic Heavy");
                rr.setText(rightLines[li]);
            }

            doc.createParagraph();

            // ── Info table (Filiale / Catégorie / Candidat) ─────────────────
            XWPFTable infoTbl = doc.createTable(3, 2);
            setTableWidth(infoTbl, 9360);
            addInfoRow(infoTbl, 0, "Filiale",   "Ventec");
            addInfoRow(infoTbl, 1, "Catégorie", contractType != null ? contractType : "CDI / CDD");
            addInfoRow(infoTbl, 2, "Candidat",  candidateName);

            doc.createParagraph();

            // ── Documents table (Documents | Nombre d'exemplaires | Observation) ─
            final String LIGHT_BLUE = "BDD7EE";
            int rows = Math.max(documents.size(), 1);
            XWPFTable docTbl = doc.createTable(rows + 1, 3);
            setTableWidth(docTbl, 9360);
            CTTblPr dtPr = docTbl.getCTTbl().getTblPr();
            if (dtPr == null) dtPr = docTbl.getCTTbl().addNewTblPr();
            CTTblBorders dtB = dtPr.isSetTblBorders() ? dtPr.getTblBorders() : dtPr.addNewTblBorders();
            setSolidBorder(dtB.isSetTop()     ? dtB.getTop()     : dtB.addNewTop(),     "4472C4", 4);
            setSolidBorder(dtB.isSetBottom()  ? dtB.getBottom()  : dtB.addNewBottom(),  "4472C4", 4);
            setSolidBorder(dtB.isSetLeft()    ? dtB.getLeft()    : dtB.addNewLeft(),     "4472C4", 4);
            setSolidBorder(dtB.isSetRight()   ? dtB.getRight()   : dtB.addNewRight(),    "4472C4", 4);
            setSolidBorder(dtB.isSetInsideH() ? dtB.getInsideH() : dtB.addNewInsideH(), "4472C4", 4);
            setSolidBorder(dtB.isSetInsideV() ? dtB.getInsideV() : dtB.addNewInsideV(), "4472C4", 4);
            setCellWidth(docTbl.getRow(0).getCell(0), 5040);
            setCellWidth(docTbl.getRow(0).getCell(1), 1560);
            setCellWidth(docTbl.getRow(0).getCell(2), 2760);

            // Header
            XWPFTableRow docHdr = docTbl.getRow(0);
            grayCell(docHdr.getCell(0), "Documents",            ParagraphAlignment.CENTER, 10, true);
            grayCell(docHdr.getCell(1), "Nombre d'exemplaires", ParagraphAlignment.CENTER, 10, true);
            grayCell(docHdr.getCell(2), "Observation",          ParagraphAlignment.CENTER, 10, true);

            if (documents.isEmpty()) {
                XWPFTableRow r = docTbl.getRow(1);
                setCellWidth(r.getCell(0), 5040);
                setCellWidth(r.getCell(1), 1560);
                setCellWidth(r.getCell(2), 2760);
                plainCell(r.getCell(0), "Aucun document spécifié", ParagraphAlignment.CENTER, 10, true);
                plainCell(r.getCell(1), "", ParagraphAlignment.CENTER, 10, false);
                plainCell(r.getCell(2), "", ParagraphAlignment.CENTER, 10, false);
            } else {
                for (int i = 0; i < documents.size(); i++) {
                    Map<String, Object> item = documents.get(i);
                    String name   = toStr(item.get("name"), "");
                    String copies = toStr(item.get("copies"), "1");
                    String obs    = toStr(item.get("observation"), "");
                    XWPFTableRow r = docTbl.getRow(i + 1);
                    setCellWidth(r.getCell(0), 5040);
                    setCellWidth(r.getCell(1), 1560);
                    setCellWidth(r.getCell(2), 2760);
                    if (i % 2 != 0) {
                        setCellBg(r.getCell(0), LIGHT_BLUE);
                        setCellBg(r.getCell(1), LIGHT_BLUE);
                        setCellBg(r.getCell(2), LIGHT_BLUE);
                    }
                    // Documents cell: name centered, (observation) italic centered below
                    XWPFTableCell nameCell = r.getCell(0);
                    XWPFParagraph np = nameCell.getParagraphs().isEmpty()
                        ? nameCell.addParagraph() : nameCell.getParagraphs().get(0);
                    np.setAlignment(ParagraphAlignment.CENTER);
                    np.setSpacingBefore(60); np.setSpacingAfter(0);
                    XWPFRun nr = np.createRun();
                    nr.setFontFamily("Times New Roman"); nr.setFontSize(10);
                    if (!name.isEmpty()) nr.setText(name);
                    if (!obs.isEmpty()) {
                        XWPFParagraph op = nameCell.addParagraph();
                        op.setAlignment(ParagraphAlignment.CENTER);
                        op.setSpacingBefore(0); op.setSpacingAfter(60);
                        XWPFRun or2 = op.createRun();
                        or2.setFontFamily("Times New Roman"); or2.setFontSize(9);
                        or2.setItalic(true); or2.setColor("555555");
                        or2.setText("(" + obs + ")");
                    } else {
                        np.setSpacingAfter(60);
                    }
                    plainCell(r.getCell(1), copies, ParagraphAlignment.CENTER, 10, false);
                    plainCell(r.getCell(2), "",     ParagraphAlignment.CENTER, 10, false);
                }
            }

            doc.createParagraph();
            XWPFParagraph noteP = doc.createParagraph();
            XWPFRun noteR = noteP.createRun();
            noteR.setFontSize(9); noteR.setItalic(true); noteR.setColor("555555");
            noteR.setText("Poste : " + postingTitle);

            doc.createParagraph();
            // Footer — matches original: "Version du 01/01/2022   Annule et remplace celle du 04/01/2021"
            XWPFTable footerTbl = doc.createTable(1, 2);
            setTableWidth(footerTbl, 9360);
            removeBorders(footerTbl);
            plainCell(footerTbl.getRow(0).getCell(0),
                      "Version du 01/01/2022", ParagraphAlignment.LEFT, 8, true);
            plainCell(footerTbl.getRow(0).getCell(1),
                      "Annule et remplace celle du 04/01/2021", ParagraphAlignment.RIGHT, 8, false);

            doc.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Erreur lors de la génération de la liste des documents", e);
        }
    }

    // ── PDF export for interview guide d'entretien ───────────────────────────
    public byte[] exportInterviewToPdf(UUID id) {
        Interview interview = interviewRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Interview not found: " + id));

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document pdf = new Document(PageSize.A4, 45, 45, 50, 50);
            PdfWriter.getInstance(pdf, out);
            pdf.open();

            // ── Colors ──────────────────────────────────────────────────────
            Color navy      = new Color(31, 56, 100);
            Color navyLight = new Color(44, 72, 120);
            Color white     = Color.WHITE;
            Color grayText  = new Color(55, 65, 81);
            Color lightGray = new Color(249, 250, 251);
            Color green     = new Color(4, 120, 87);
            Color greenBg   = new Color(236, 253, 245);
            Color greenBorder= new Color(167, 243, 208);

            // ── Fonts ────────────────────────────────────────────────────────
            Font headerTitleFont = new Font(Font.HELVETICA, 16, Font.BOLD,   white);
            Font headerSubFont   = new Font(Font.HELVETICA,  9, Font.NORMAL, new Color(199, 210, 254));
            Font sectionFont     = new Font(Font.HELVETICA, 10, Font.BOLD,   white);
            Font labelFont       = new Font(Font.HELVETICA,  9, Font.BOLD,   new Color(107, 114, 128));
            Font valueFont       = new Font(Font.HELVETICA,  9, Font.NORMAL, grayText);
            Font qNumFont        = new Font(Font.HELVETICA, 10, Font.BOLD,   navy);
            Font qTextFont       = new Font(Font.HELVETICA, 10, Font.NORMAL, grayText);
            Font ansLabelFont    = new Font(Font.HELVETICA,  8, Font.BOLD,   green);
            Font ansTextFont     = new Font(Font.HELVETICA,  9, Font.ITALIC, new Color(6, 78, 59));
            Font noteFont        = new Font(Font.HELVETICA, 10, Font.ITALIC, new Color(75, 85, 99));
            Font footerFont      = new Font(Font.HELVETICA,  8, Font.NORMAL, new Color(156, 163, 175));

            var app = interview.getApplication();
            String candidateName = app != null && app.getCandidate() != null
                    ? app.getCandidate().getFirstName() + " " + app.getCandidate().getLastName() : "—";
            String posteName = app != null && app.getJobPosting() != null
                    ? app.getJobPosting().getTitle() : "—";

            // ── HEADER: 3-column (logos white | title navy | candidate navy) ──
            PdfPTable headerTable = new PdfPTable(new float[]{1.4f, 2.2f, 1.4f});
            headerTable.setWidthPercentage(100);
            headerTable.setSpacingAfter(10);

            // Left cell: Ventec + Ecowell logos (white bg)
            PdfPCell logosCell = new PdfPCell();
            logosCell.setBackgroundColor(white);
            logosCell.setBorder(Rectangle.BOX);
            logosCell.setBorderColor(new Color(226, 232, 240));
            logosCell.setPadding(10);
            logosCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            logosCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            byte[] ventecBytes  = loadLogoBytes("/logos/ventec-logo.jpeg");
            byte[] ecowellBytes = loadLogoBytes("/logos/ecowell-logo.jpg");
            boolean hasLogo = false;
            if (ventecBytes != null) {
                try {
                    Image vImg = Image.getInstance(ventecBytes);
                    vImg.scaleToFit(120, 32);
                    Paragraph vPara = new Paragraph();
                    vPara.setAlignment(Element.ALIGN_CENTER);
                    vPara.setSpacingAfter(8);
                    vPara.add(new Chunk(vImg, 0, 0));
                    logosCell.addElement(vPara);
                    hasLogo = true;
                } catch (Exception ignored) {}
            }
            if (ecowellBytes != null) {
                try {
                    Image eImg = Image.getInstance(ecowellBytes);
                    eImg.scaleToFit(100, 22);
                    Paragraph ePara = new Paragraph();
                    ePara.setAlignment(Element.ALIGN_CENTER);
                    ePara.add(new Chunk(eImg, 0, 0));
                    logosCell.addElement(ePara);
                    hasLogo = true;
                } catch (Exception ignored) {}
            }
            if (!hasLogo) {
                Paragraph fallback = new Paragraph("Ventec", new Font(Font.HELVETICA, 12, Font.BOLD, navy));
                fallback.setAlignment(Element.ALIGN_CENTER);
                logosCell.addElement(fallback);
            }
            headerTable.addCell(logosCell);

            // Center cell: document title (navy bg)
            PdfPCell titleCell = new PdfPCell();
            titleCell.setBackgroundColor(navy);
            titleCell.setBorder(Rectangle.NO_BORDER);
            titleCell.setPadding(14);
            titleCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            titleCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            Paragraph titlePara = new Paragraph();
            titlePara.setAlignment(Element.ALIGN_CENTER);
            titlePara.add(new Chunk("GUIDE D'ENTRETIEN\n", headerTitleFont));
            titlePara.add(new Chunk("Ventec GRH — Recrutement", headerSubFont));
            titleCell.addElement(titlePara);
            headerTable.addCell(titleCell);

            // Right cell: candidate + post (navy bg)
            PdfPCell infoCell = new PdfPCell();
            infoCell.setBackgroundColor(navyLight);
            infoCell.setBorder(Rectangle.NO_BORDER);
            infoCell.setPadding(10);
            infoCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            Paragraph infoPara = new Paragraph();
            infoPara.add(new Chunk("Candidat\n", new Font(Font.HELVETICA, 7, Font.NORMAL, new Color(199, 210, 254))));
            infoPara.add(new Chunk(candidateName + "\n", new Font(Font.HELVETICA, 9, Font.BOLD, white)));
            infoPara.add(new Chunk("\nPoste\n",   new Font(Font.HELVETICA, 7, Font.NORMAL, new Color(199, 210, 254))));
            infoPara.add(new Chunk(posteName,     new Font(Font.HELVETICA, 9, Font.BOLD, white)));
            infoCell.addElement(infoPara);
            headerTable.addCell(infoCell);
            pdf.add(headerTable);

            // ── Interview details info bar ───────────────────────────────────
            PdfPTable detailsTable = new PdfPTable(4);
            detailsTable.setWidthPercentage(100);
            detailsTable.setSpacingAfter(14);
            Color detailBorder = new Color(203, 213, 225);
            String[][] details = {
                {"Date & heure", interview.getScheduledAt() != null ? interview.getScheduledAt().format(DATE_FMT) : "—"},
                {"Durée",        interview.getDurationMinutes() != null ? interview.getDurationMinutes() + " min" : "—"},
                {"Type",         toStr(interview.getType(), "—")},
                {"Lieu / Lien",  toStr(interview.getLocationOrLink(), "—")},
            };
            for (String[] d : details) {
                PdfPCell lbl = new PdfPCell();
                lbl.setBackgroundColor(new Color(241, 245, 249));
                lbl.setBorderColor(detailBorder);
                lbl.setBorderWidth(0.75f);
                lbl.setPadding(8);
                lbl.addElement(new Paragraph(d[0], labelFont));
                lbl.addElement(new Paragraph(d[1], valueFont));
                detailsTable.addCell(lbl);
            }
            pdf.add(detailsTable);

            // ── Section I: Questions ─────────────────────────────────────────
            PdfPTable qHeader = new PdfPTable(1);
            qHeader.setWidthPercentage(100);
            qHeader.setSpacingAfter(8);
            PdfPCell qHCell = new PdfPCell(new Phrase("I.  QUESTIONS D'ENTRETIEN", sectionFont));
            qHCell.setBackgroundColor(navy);
            qHCell.setBorder(Rectangle.NO_BORDER);
            qHCell.setPaddingTop(6); qHCell.setPaddingBottom(6);
            qHCell.setPaddingLeft(10);
            qHeader.addCell(qHCell);
            pdf.add(qHeader);

            if (interview.getQuestions() != null && !interview.getQuestions().isBlank()) {
                try {
                    List<?> rawList = objectMapper.readValue(interview.getQuestions(), List.class);
                    int num = 1;
                    for (Object raw : rawList) {
                        String questionText = null;
                        String answerText   = null;
                        if (raw instanceof String s) {
                            questionText = s;
                        } else if (raw instanceof Map<?, ?> m) {
                            questionText = m.get("question") instanceof String q ? q : null;
                            answerText   = m.get("answer")   instanceof String a ? a : null;
                        }
                        if (questionText == null) continue;

                        // Question row (alternating bg)
                        PdfPTable qRow = new PdfPTable(new float[]{0.12f, 1f});
                        qRow.setWidthPercentage(100);
                        qRow.setSpacingAfter(answerText != null ? 2 : 6);
                        Color rowBg = (num % 2 == 0) ? lightGray : white;

                        PdfPCell numCell = new PdfPCell(new Phrase(String.valueOf(num), qNumFont));
                        numCell.setBackgroundColor(rowBg);
                        numCell.setBorderColor(new Color(229, 231, 235));
                        numCell.setHorizontalAlignment(Element.ALIGN_CENTER);
                        numCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
                        numCell.setPadding(8);
                        qRow.addCell(numCell);

                        PdfPCell qCell = new PdfPCell(new Phrase(questionText, qTextFont));
                        qCell.setBackgroundColor(rowBg);
                        qCell.setBorderColor(new Color(229, 231, 235));
                        qCell.setPadding(8);
                        qRow.addCell(qCell);
                        pdf.add(qRow);

                        // Answer box (green) if present
                        if (answerText != null && !answerText.isBlank()) {
                            PdfPTable ansBox = new PdfPTable(1);
                            ansBox.setWidthPercentage(88);
                            ansBox.setHorizontalAlignment(Element.ALIGN_RIGHT);
                            ansBox.setSpacingAfter(6);

                            PdfPCell ansLbl = new PdfPCell(new Phrase("Réponse attendue :", ansLabelFont));
                            ansLbl.setBackgroundColor(greenBg);
                            ansLbl.setBorderColor(greenBorder);
                            ansLbl.setPaddingTop(5); ansLbl.setPaddingBottom(2);
                            ansLbl.setPaddingLeft(8); ansLbl.setBorderWidthBottom(0);
                            ansBox.addCell(ansLbl);

                            PdfPCell ansTxt = new PdfPCell(new Phrase(answerText, ansTextFont));
                            ansTxt.setBackgroundColor(greenBg);
                            ansTxt.setBorderColor(greenBorder);
                            ansTxt.setPaddingTop(2); ansTxt.setPaddingBottom(6);
                            ansTxt.setPaddingLeft(8); ansTxt.setBorderWidthTop(0);
                            ansBox.addCell(ansTxt);
                            pdf.add(ansBox);
                        }
                        num++;
                    }
                } catch (Exception ignored) {}
            } else {
                Paragraph noQ = new Paragraph("Aucune question générée.", new Font(Font.HELVETICA, 9, Font.ITALIC, new Color(156, 163, 175)));
                noQ.setSpacingAfter(8);
                pdf.add(noQ);
            }

            // ── Section II: Notes (header + content in one table so they stay together) ──
            String notes = (interview.getNotes() != null && !interview.getNotes().isBlank())
                    ? interview.getNotes() : "Aucune note enregistrée.";
            PdfPTable notesSection = new PdfPTable(1);
            notesSection.setWidthPercentage(100);
            notesSection.setSpacingBefore(10);
            notesSection.setSpacingAfter(16);
            notesSection.setKeepTogether(true);

            PdfPCell nHCell = new PdfPCell(new Phrase("II.  NOTES ET OBSERVATIONS", sectionFont));
            nHCell.setBackgroundColor(navy);
            nHCell.setBorder(Rectangle.NO_BORDER);
            nHCell.setPaddingTop(6); nHCell.setPaddingBottom(6);
            nHCell.setPaddingLeft(10);
            notesSection.addCell(nHCell);

            PdfPCell notesCell = new PdfPCell(new Phrase(notes, noteFont));
            notesCell.setBorderColor(new Color(229, 231, 235));
            notesCell.setMinimumHeight(70f);
            notesCell.setPadding(10);
            notesSection.addCell(notesCell);
            pdf.add(notesSection);

            // ── Signature row ────────────────────────────────────────────────
            PdfPTable sigTable = new PdfPTable(2);
            sigTable.setWidthPercentage(100);
            sigTable.setSpacingAfter(12);
            for (String label : new String[]{"Signature du recruteur", "Signature du candidat"}) {
                PdfPCell sc = new PdfPCell();
                sc.setBorderColor(new Color(209, 213, 219));
                sc.setMinimumHeight(50f);
                sc.setPadding(8);
                sc.addElement(new Paragraph(label, labelFont));
                sigTable.addCell(sc);
            }
            pdf.add(sigTable);

            // ── Footer ───────────────────────────────────────────────────────
            Paragraph footerPara = new Paragraph("Document généré par Ventec GRH", footerFont);
            footerPara.setAlignment(Element.ALIGN_CENTER);
            pdf.add(footerPara);

            pdf.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Erreur lors de la génération du PDF", e);
        }
    }

    // ── Documents list PDF export ────────────────────────────────────────────
    public byte[] exportDocumentsListPdf(UUID candidateId, UUID jobPostingId) {
        DocumentChecklist checklist = checklistRepository
                .findByCandidateIdAndJobPostingId(candidateId, jobPostingId)
                .orElseThrow(() -> new NotFoundException("Checklist not found for candidate "
                        + candidateId + " and posting " + jobPostingId));

        String candidateName = checklist.getCandidate().getFirstName() + " " + checklist.getCandidate().getLastName();
        String postingTitle  = checklist.getJobPosting().getTitle();
        String contractType  = checklist.getJobPosting().getContractType();
        List<Map<String, Object>> documents = parseDocumentsListFull(checklist.getDocuments());

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document pdf = new Document(PageSize.A4, 36, 36, 40, 40);
            PdfWriter.getInstance(pdf, out);
            pdf.open();

            Color orange   = new Color(197, 90, 17);
            Color black    = Color.BLACK;
            Color white    = Color.WHITE;
            Color dgray    = new Color(217, 217, 217);
            Color altBlue  = new Color(189, 215, 238);
            Color borderC  = new Color(180, 180, 180);
            Color textGray = new Color(80, 80, 80);

            // Load Franklin Gothic Heavy for header (falls back to Helvetica if not found)
            BaseFont fghBase;
            try {
                fghBase = BaseFont.createFont("C:/Windows/Fonts/FRAHV.TTF",
                        BaseFont.IDENTITY_H, BaseFont.EMBEDDED);
            } catch (Exception ex) {
                fghBase = BaseFont.createFont(BaseFont.HELVETICA, BaseFont.CP1252, false);
            }
            Font fghSide  = new Font(fghBase, 12, Font.NORMAL, black);
            Font fghTitle = new Font(fghBase, 14, Font.ITALIC,  black);
            Font fghRight = new Font(fghBase, 10, Font.NORMAL, black);
            Font labelFont   = new Font(Font.HELVETICA,  9, Font.BOLD,   black);
            Font valueFont   = new Font(Font.HELVETICA,  9, Font.NORMAL, black);
            Font footerFont  = new Font(Font.HELVETICA,  7, Font.NORMAL, textGray);
            Font noteFont    = new Font(Font.HELVETICA,  8, Font.ITALIC, textGray);

            // ── Header 3-col ─────────────────────────────────────────────
            PdfPTable hdrTbl = new PdfPTable(new float[]{1f, 2f, 1f});
            hdrTbl.setWidthPercentage(100);
            hdrTbl.setSpacingAfter(8);

            // Left: Ventec / Ecowell
            PdfPCell lcell = new PdfPCell();
            lcell.setBackgroundColor(white); lcell.setBorder(Rectangle.NO_BORDER);
            lcell.setPaddingTop(8); lcell.setPaddingBottom(8);
            lcell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            Paragraph lp = new Paragraph();
            lp.setAlignment(Element.ALIGN_CENTER); lp.setLeading(16f);
            lp.add(new Chunk("Ventec\n", fghSide));
            lp.add(new Chunk("Ecowell", fghSide));
            lcell.addElement(lp);
            hdrTbl.addCell(lcell);

            // Center: title
            PdfPCell ccell = new PdfPCell();
            ccell.setBackgroundColor(white); ccell.setBorder(Rectangle.NO_BORDER);
            ccell.setPaddingTop(8); ccell.setPaddingBottom(8);
            ccell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            Paragraph cp = new Paragraph();
            cp.setAlignment(Element.ALIGN_CENTER); cp.setLeading(17f);
            cp.add(new Chunk("LISTE DES DOCUMENTS\n", fghTitle));
            cp.add(new Chunk("ADMINISTRATIFS A FOURNIR\n", fghTitle));
            cp.add(new Chunk("CDI-CDD", fghTitle));
            ccell.addElement(cp);
            hdrTbl.addCell(ccell);

            // Right: Management RH
            PdfPCell rcell = new PdfPCell();
            rcell.setBackgroundColor(white); rcell.setBorder(Rectangle.NO_BORDER);
            rcell.setPaddingTop(8); rcell.setPaddingBottom(8);
            rcell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            Paragraph rp = new Paragraph();
            rp.setAlignment(Element.ALIGN_CENTER); rp.setLeading(14f);
            rp.add(new Chunk("Management\n", fghRight));
            rp.add(new Chunk("Ressources\n", fghRight));
            rp.add(new Chunk("Humaines", fghRight));
            rcell.addElement(rp);
            hdrTbl.addCell(rcell);

            // Dashed black borders drawn via canvas event
            hdrTbl.setTableEvent((table, widths, heights, headerRows, rowStart, canvases) -> {
                PdfContentByte cb = canvases[PdfPTable.LINECANVAS];
                cb.saveState();
                cb.setColorStroke(Color.BLACK);
                cb.setLineWidth(0.75f);
                cb.setLineDash(3f, 3f, 0f);
                float top = heights[0];
                float bottom = heights[heights.length - 1];
                float[] xs = widths[0];
                cb.moveTo(xs[0], top);           cb.lineTo(xs[xs.length - 1], top);
                cb.moveTo(xs[0], bottom);         cb.lineTo(xs[xs.length - 1], bottom);
                cb.moveTo(xs[0], top);            cb.lineTo(xs[0], bottom);
                cb.moveTo(xs[xs.length - 1], top); cb.lineTo(xs[xs.length - 1], bottom);
                for (int i = 1; i < xs.length - 1; i++) {
                    cb.moveTo(xs[i], top); cb.lineTo(xs[i], bottom);
                }
                cb.stroke();
                cb.restoreState();
            });
            pdf.add(hdrTbl);

            // ── Info table ────────────────────────────────────────────────
            PdfPTable infoTbl = new PdfPTable(new float[]{1f, 2f});
            infoTbl.setWidthPercentage(100); infoTbl.setSpacingAfter(8);
            addPdfInfoRow(infoTbl, "Filiale",   "Ventec",                                  labelFont, valueFont, dgray, borderC);
            addPdfInfoRow(infoTbl, "Catégorie", contractType != null ? contractType : "CDI / CDD", labelFont, valueFont, dgray, borderC);
            addPdfInfoRow(infoTbl, "Candidat",  candidateName,                             labelFont, valueFont, dgray, borderC);
            pdf.add(infoTbl);

            // ── Documents table (2 columns: Documents | Nombre d'exemplaires) ─
            Color docBlue = new Color(68, 114, 196);
            Font docObsFont = new Font(Font.TIMES_ROMAN, 9, Font.ITALIC, new Color(85, 85, 85));
            PdfPTable docTbl = new PdfPTable(new float[]{3f, 1f, 2f});
            docTbl.setWidthPercentage(100); docTbl.setSpacingAfter(10);
            for (String h : new String[]{"Documents", "Nombre d'exemplaires", "Observation"}) {
                PdfPCell hc = new PdfPCell(new Phrase(h, labelFont));
                hc.setBackgroundColor(dgray); hc.setBorderColor(docBlue); hc.setBorderWidth(0.75f);
                hc.setPadding(5); hc.setHorizontalAlignment(Element.ALIGN_CENTER);
                hc.setVerticalAlignment(Element.ALIGN_MIDDLE);
                docTbl.addCell(hc);
            }
            if (documents.isEmpty()) {
                PdfPCell ec = new PdfPCell(new Phrase("Aucun document spécifié", valueFont));
                ec.setColspan(3); ec.setPadding(8);
                ec.setHorizontalAlignment(Element.ALIGN_CENTER);
                docTbl.addCell(ec);
            } else {
                for (int i = 0; i < documents.size(); i++) {
                    Map<String, Object> item = documents.get(i);
                    Color bg = (i % 2 != 0) ? altBlue : white;
                    String name   = toStr(item.get("name"), "");
                    String copies = toStr(item.get("copies"), "1");
                    String obs    = toStr(item.get("observation"), "");
                    // Documents cell: name centered, (observation) italic centered below
                    Paragraph nameP = new Paragraph();
                    nameP.setAlignment(Element.ALIGN_CENTER);
                    nameP.add(new Chunk(name, valueFont));
                    if (!obs.isEmpty()) {
                        nameP.add(Chunk.NEWLINE);
                        nameP.add(new Chunk("(" + obs + ")", docObsFont));
                    }
                    PdfPCell nameCell = new PdfPCell(nameP);
                    nameCell.setBackgroundColor(bg); nameCell.setBorderColor(docBlue); nameCell.setBorderWidth(0.75f);
                    nameCell.setPadding(8); nameCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
                    nameCell.setHorizontalAlignment(Element.ALIGN_CENTER);
                    docTbl.addCell(nameCell);
                    addPdfDocCell(docTbl, copies, valueFont, bg, docBlue, Element.ALIGN_CENTER);
                    addPdfDocCell(docTbl, "",     valueFont, bg, docBlue, Element.ALIGN_CENTER);
                }
            }
            pdf.add(docTbl);

            // ── Note ─────────────────────────────────────────────────────
            Paragraph notePara = new Paragraph("Poste : " + postingTitle, noteFont);
            notePara.setSpacingAfter(10);
            pdf.add(notePara);

            // ── Footer ────────────────────────────────────────────────────
            PdfPTable ftTbl = new PdfPTable(new float[]{1f, 1f});
            ftTbl.setWidthPercentage(100);
            PdfPCell ftL = new PdfPCell(new Phrase("Version du 01/01/2022", footerFont));
            ftL.setBorder(Rectangle.TOP); ftL.setBorderColor(new Color(200, 200, 200)); ftL.setPadding(4);
            ftL.setHorizontalAlignment(Element.ALIGN_LEFT);
            PdfPCell ftR = new PdfPCell(new Phrase("Annule et remplace celle du 04/01/2021", footerFont));
            ftR.setBorder(Rectangle.TOP); ftR.setBorderColor(new Color(200, 200, 200)); ftR.setPadding(4);
            ftR.setHorizontalAlignment(Element.ALIGN_RIGHT);
            ftTbl.addCell(ftL); ftTbl.addCell(ftR);
            pdf.add(ftTbl);

            pdf.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Erreur lors de la génération du PDF de la liste des documents", e);
        }
    }

    private void addPdfInfoRow(PdfPTable table, String label, String value,
                               Font labelFont, Font valueFont, Color labelBg, Color border) {
        PdfPCell lc = new PdfPCell(new Phrase(label, labelFont));
        lc.setBackgroundColor(labelBg); lc.setBorderColor(border); lc.setBorderWidth(0.75f); lc.setPadding(5);
        table.addCell(lc);
        PdfPCell vc = new PdfPCell(new Phrase(value, valueFont));
        vc.setBorderColor(border); vc.setBorderWidth(0.75f); vc.setPadding(5);
        table.addCell(vc);
    }

    private void addPdfDocCell(PdfPTable table, String text, Font font,
                               Color bg, Color border, int alignment) {
        PdfPCell cell = new PdfPCell(new Phrase(text != null ? text : "", font));
        cell.setBackgroundColor(bg); cell.setBorderColor(border); cell.setBorderWidth(0.75f);
        cell.setPadding(5); cell.setHorizontalAlignment(alignment);
        table.addCell(cell);
    }

    // ── Logo / signature helpers ─────────────────────────────────────────────

    private byte[] loadLogoBytes(String resourcePath) {
        try (InputStream is = getClass().getResourceAsStream(resourcePath)) {
            return is != null ? is.readAllBytes() : null;
        } catch (IOException e) {
            return null;
        }
    }

    /** Puts Ventec logo above Ecowell logo in a white cell with vertical spacing between them. */
    private void setLogosInCell(XWPFDocument doc, XWPFTableCell cell) {
        byte[] ventec  = loadLogoBytes("/logos/ventec-logo.jpeg");
        byte[] ecowell = loadLogoBytes("/logos/ecowell-logo.jpg");
        setCellBg(cell, WHITE);

        XWPFParagraph p1 = cell.getParagraphs().isEmpty() ? cell.addParagraph() : cell.getParagraphs().get(0);
        p1.setAlignment(ParagraphAlignment.CENTER);
        p1.setSpacingBefore(120); // ~6pt — push Ventec logo down from cell top
        p1.setSpacingAfter(1700); // ~85pt — push Ecowell logo toward bottom of cell
        if (ventec != null) {
            try {
                // Ventec: very wide logo (aspect ~3.75:1) → 105pt × 28pt
                p1.createRun().addPicture(new ByteArrayInputStream(ventec), 5,
                        "ventec.jpg", (int) Units.toEMU(105), (int) Units.toEMU(28));
            } catch (Exception e) {
                XWPFRun r = p1.createRun(); r.setBold(true); r.setFontSize(11); r.setText("Ventec");
            }
        } else {
            XWPFRun r = p1.createRun(); r.setBold(true); r.setFontSize(11); r.setText("Ventec");
        }

        if (ecowell != null) {
            XWPFParagraph p2 = cell.addParagraph();
            p2.setAlignment(ParagraphAlignment.CENTER);
            try {
                // Ecowell: 300×48px → aspect 6.25:1 → 94pt × 15pt
                p2.createRun().addPicture(new ByteArrayInputStream(ecowell), 5,
                        "ecowell.jpg", (int) Units.toEMU(94), (int) Units.toEMU(15));
            } catch (Exception e) {
                XWPFRun r = p2.createRun(); r.setFontSize(9); r.setText("Ecowell");
            }
        }
    }

    /** Right cell of Fiche de Fonction header: Intéressé(e) / Dpt / Direction. */
    private void setSignatureCell(XWPFTableCell cell) {
        setCellBg(cell, WHITE);
        XWPFParagraph ph = cell.getParagraphs().isEmpty() ? cell.addParagraph() : cell.getParagraphs().get(0);
        ph.setAlignment(ParagraphAlignment.LEFT);
        for (String lbl : new String[]{"Intéressé(e) :", "Dpt ou Service :", "Direction"}) {
            XWPFRun r = ph.createRun();
            r.setBold(true); r.setFontSize(7); r.setUnderline(UnderlinePatterns.SINGLE);
            r.setText(lbl + "   ");
        }
        XWPFParagraph pd = cell.addParagraph();
        XWPFRun rd = pd.createRun(); rd.setFontSize(7);
        rd.setText("Date : …………   Date : …………   Date : …………");
        XWPFParagraph pv = cell.addParagraph();
        XWPFRun rv = pv.createRun(); rv.setFontSize(7);
        rv.setText("Visa : …………   Visa : …………    Visa : …………");
    }

    // ── Apache POI cell/table helpers ────────────────────────────────────────

    private void navyCell(XWPFTableCell cell, String text, ParagraphAlignment align, int fontSize, boolean bold) {
        setCellBg(cell, NAVY);
        XWPFParagraph p = cell.getParagraphs().isEmpty() ? cell.addParagraph() : cell.getParagraphs().get(0);
        p.setAlignment(align);
        XWPFRun run = p.createRun();
        run.setColor(WHITE); run.setBold(bold); run.setFontSize(fontSize);
        if (!text.isEmpty()) run.setText(text);
    }

    private void grayCell(XWPFTableCell cell, String text, ParagraphAlignment align, int fontSize, boolean bold) {
        setCellBg(cell, LGRAY);
        XWPFParagraph p = cell.getParagraphs().isEmpty() ? cell.addParagraph() : cell.getParagraphs().get(0);
        p.setAlignment(align);
        XWPFRun run = p.createRun();
        run.setBold(bold); run.setFontSize(fontSize);
        if (!text.isEmpty()) run.setText(text);
    }

    private void plainCell(XWPFTableCell cell, String text, ParagraphAlignment align, int fontSize, boolean bold) {
        XWPFParagraph p = cell.getParagraphs().isEmpty() ? cell.addParagraph() : cell.getParagraphs().get(0);
        p.setAlignment(align);
        XWPFRun run = p.createRun();
        run.setBold(bold); run.setFontSize(fontSize);
        if (text != null && !text.isEmpty()) run.setText(text);
    }

    private void setCellBg(XWPFTableCell cell, String hex) {
        CTTc ctTc = cell.getCTTc();
        CTTcPr tcPr = ctTc.isSetTcPr() ? ctTc.getTcPr() : ctTc.addNewTcPr();
        CTShd shd   = tcPr.isSetShd()  ? tcPr.getShd()  : tcPr.addNewShd();
        shd.setFill(hex);
        shd.setVal(STShd.CLEAR);
    }

    private void setTableWidth(XWPFTable table, int twips) {
        CTTblPr tblPr = table.getCTTbl().getTblPr();
        if (tblPr == null) tblPr = table.getCTTbl().addNewTblPr();
        CTTblWidth w = tblPr.isSetTblW() ? tblPr.getTblW() : tblPr.addNewTblW();
        w.setType(STTblWidth.DXA);
        w.setW(BigInteger.valueOf(twips));
    }

    private void setCellWidth(XWPFTableCell cell, int twips) {
        CTTc tc = cell.getCTTc();
        CTTcPr tcPr = tc.isSetTcPr() ? tc.getTcPr() : tc.addNewTcPr();
        CTTblWidth w = tcPr.isSetTcW() ? tcPr.getTcW() : tcPr.addNewTcW();
        w.setType(STTblWidth.DXA);
        w.setW(BigInteger.valueOf(twips));
    }

    private void setVMerge(XWPFTableCell cell, boolean restart) {
        CTTc ctTc = cell.getCTTc();
        CTTcPr tcPr = ctTc.isSetTcPr() ? ctTc.getTcPr() : ctTc.addNewTcPr();
        CTVMerge vMerge = tcPr.isSetVMerge() ? tcPr.getVMerge() : tcPr.addNewVMerge();
        if (restart) vMerge.setVal(STMerge.RESTART);
    }

    private void setHSpan(XWPFTableCell cell, int span) {
        CTTc ctTc = cell.getCTTc();
        CTTcPr tcPr = ctTc.isSetTcPr() ? ctTc.getTcPr() : ctTc.addNewTcPr();
        CTDecimalNumber gs = tcPr.isSetGridSpan() ? tcPr.getGridSpan() : tcPr.addNewGridSpan();
        gs.setVal(BigInteger.valueOf(span));
    }

    private void removeBorders(XWPFTable table) {
        CTTblPr tblPr = table.getCTTbl().getTblPr();
        if (tblPr == null) tblPr = table.getCTTbl().addNewTblPr();
        CTTblBorders b = tblPr.isSetTblBorders() ? tblPr.getTblBorders() : tblPr.addNewTblBorders();
        setBorderNone(b.isSetTop()     ? b.getTop()     : b.addNewTop());
        setBorderNone(b.isSetBottom()  ? b.getBottom()  : b.addNewBottom());
        setBorderNone(b.isSetLeft()    ? b.getLeft()    : b.addNewLeft());
        setBorderNone(b.isSetRight()   ? b.getRight()   : b.addNewRight());
        setBorderNone(b.isSetInsideH() ? b.getInsideH() : b.addNewInsideH());
        setBorderNone(b.isSetInsideV() ? b.getInsideV() : b.addNewInsideV());
    }

    private void setBorderNone(CTBorder border) {
        border.setVal(STBorder.NONE);
    }

    private void setDashedBorder(CTBorder border, String color, int sz) {
        border.setVal(STBorder.DASHED);
        border.setSz(BigInteger.valueOf(sz));
        border.setColor(color);
    }

    private void setSolidBorder(CTBorder border, String color, int sz) {
        border.setVal(STBorder.SINGLE);
        border.setSz(BigInteger.valueOf(sz));
        border.setColor(color);
    }

    private void addInfoRow(XWPFTable table, int rowIdx, String label, String value) {
        XWPFTableRow row = table.getRow(rowIdx);
        grayCell(row.getCell(0), label, ParagraphAlignment.CENTER, 10, true);
        plainCell(row.getCell(1), value, ParagraphAlignment.CENTER, 10, false);
    }

    private void sectionHeading(XWPFDocument doc, String roman, String heading) {
        XWPFParagraph p = doc.createParagraph();
        XWPFRun run = p.createRun();
        run.setBold(true); run.setFontSize(11);
        run.setUnderline(UnderlinePatterns.SINGLE);
        run.setText(roman + " " + heading);
    }

    private void subSectionHeading(XWPFDocument doc, String number, String text) {
        XWPFParagraph p = doc.createParagraph();
        p.setIndentationLeft(180);
        XWPFRun run = p.createRun();
        run.setBold(true); run.setFontSize(10);
        run.setUnderline(UnderlinePatterns.SINGLE);
        run.setText(number + " " + text);
    }

    private void bulletItem(XWPFDocument doc, String text) {
        XWPFParagraph p = doc.createParagraph();
        p.setIndentationLeft(360);
        XWPFRun run = p.createRun();
        run.setFontSize(10);
        run.setText("– " + text);
    }

    private void bulletSubItem(XWPFDocument doc, String text) {
        XWPFParagraph p = doc.createParagraph();
        p.setIndentationLeft(720);
        XWPFRun run = p.createRun();
        run.setFontSize(10);
        run.setText("o " + text);
    }

    private void numberedItem(XWPFDocument doc, int n, String text) {
        XWPFParagraph p = doc.createParagraph();
        p.setIndentationLeft(360);
        XWPFRun run = p.createRun();
        run.setFontSize(10);
        run.setText(n + ". " + text);
    }

    // ── OpenPDF helpers ──────────────────────────────────────────────────────

    private Paragraph pdfField(String label, String value, Font labelFont, Font valueFont) {
        Paragraph p = new Paragraph();
        p.add(new Chunk(label + " : ", labelFont));
        p.add(new Chunk(value, valueFont));
        p.setSpacingAfter(4);
        return p;
    }

    private void addPdfRow(PdfPTable table, String label, String value, Font labelFont, Font valueFont) {
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

    // ── JSON / type helpers ──────────────────────────────────────────────────

    private List<String> toStringList(Object val) {
        if (val instanceof List<?> list) {
            return list.stream().map(Object::toString).collect(Collectors.toList());
        }
        return new ArrayList<>();
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> toMapList(Object val) {
        if (val instanceof List<?> list) {
            return list.stream()
                    .filter(e -> e instanceof Map)
                    .map(e -> (Map<String, Object>) e)
                    .collect(Collectors.toList());
        }
        return new ArrayList<>();
    }

    private String toStr(Object val, String def) {
        return val != null ? val.toString() : def;
    }

    /** Parses checklist JSON into full item maps preserving name, copies, observation. */
    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> parseDocumentsListFull(String json) {
        if (json == null || json.isBlank()) return new ArrayList<>();
        try {
            Object parsed = objectMapper.readValue(json, Object.class);
            if (parsed instanceof List<?> list) {
                return list.stream()
                        .filter(item -> item instanceof Map)
                        .map(item -> (Map<String, Object>) item)
                        .collect(Collectors.toList());
            }
        } catch (Exception ignored) {}
        return new ArrayList<>();
    }
}
