package com.ventec.grh_backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;

import com.lowagie.text.Chunk;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
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
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTShd;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTTblBorders;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTTblPr;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTTblWidth;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTTc;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTTcPr;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.STBorder;
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
    private static final String LGRAY = "D9D9D9";

    private static final String[] COMPETENCES_COMPORTEMENTALES = {
        "Rigueur et organisation",
        "Sens de la communication",
        "Travail en équipe",
        "Adaptabilité et flexibilité",
        "Orientation résultats",
        "Sens des responsabilités",
        "Initiative et proactivité",
        "Gestion du stress",
        "Leadership et management",
        "Orientation client"
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

        List<String> missions    = toStringList(ai.get("missions"));
        List<String> activites   = toStringList(ai.get("activites_principales"));
        List<String> indicateurs = toStringList(ai.get("indicateurs_performance"));
        String niveauFormation   = toStr(ai.get("niveau_formation"), "");
        String experienceRequise = toStr(ai.get("experience_requise"), "");
        List<Map<String, Object>> compTech = toMapList(ai.get("competences_techniques"));
        List<String> internesL   = toStringList(ai.get("interlocuteurs_internes"));
        List<String> externesL   = toStringList(ai.get("interlocuteurs_externes"));

        try (XWPFDocument doc = new XWPFDocument();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            // ── Header (logos | title | signatures) ─────────────────────────
            XWPFTable headerTbl = doc.createTable(1, 3);
            setTableWidth(headerTbl, 9360);
            XWPFTableRow hRow = headerTbl.getRow(0);

            // Left: Ventec + Ecowell logos on white background
            setLogosInCell(doc, hRow.getCell(0));

            // Center: MPM3 title + FICHE DE FONCTION + job title (navy)
            XWPFTableCell midC = hRow.getCell(1);
            navyCell(midC, "MPM3 – MACROPROCESSUS DIRECTION", ParagraphAlignment.CENTER, 9, false);
            XWPFParagraph midP2 = midC.addParagraph();
            midP2.setAlignment(ParagraphAlignment.CENTER);
            XWPFRun midR2 = midP2.createRun();
            midR2.setBold(true); midR2.setFontSize(14); midR2.setColor(WHITE);
            midR2.setUnderline(UnderlinePatterns.SINGLE);
            midR2.setText("FICHE DE FONCTION");
            XWPFParagraph midP3 = midC.addParagraph();
            midP3.setAlignment(ParagraphAlignment.CENTER);
            XWPFRun midR3 = midP3.createRun();
            midR3.setBold(true); midR3.setFontSize(11); midR3.setColor(WHITE);
            midR3.setText(p.getTitle());

            // Right: Intéressé(e) / Dpt ou Service / Direction signature boxes
            setSignatureCell(hRow.getCell(2));

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
            sectionHeading(doc, "I.", "MISSIONS PRINCIPALES");
            for (int i = 0; i < missions.size(); i++) numberedItem(doc, i + 1, missions.get(i));
            doc.createParagraph();

            // ── II. Place dans l'organisation ───────────────────────────────
            sectionHeading(doc, "II.", "PLACE DANS L'ORGANISATION");
            doc.createParagraph().createRun()
               .setText("Rattachement hiérarchique : ......................................................................");
            doc.createParagraph();

            // ── III. Activités principales ───────────────────────────────────
            sectionHeading(doc, "III.", "ACTIVITES PRINCIPALES");
            for (int i = 0; i < activites.size(); i++) numberedItem(doc, i + 1, activites.get(i));
            doc.createParagraph();

            // Interlocuteurs
            XWPFParagraph interTitleP = doc.createParagraph();
            XWPFRun interTitleR = interTitleP.createRun();
            interTitleR.setBold(true); interTitleR.setFontSize(10);
            interTitleR.setText("Interlocuteurs :");
            int interRows = Math.max(Math.max(internesL.size(), externesL.size()), 1);
            XWPFTable interTbl = doc.createTable(interRows + 1, 2);
            setTableWidth(interTbl, 9360);
            XWPFTableRow interHdr = interTbl.getRow(0);
            navyCell(interHdr.getCell(0), "Interlocuteurs internes", ParagraphAlignment.CENTER, 10, true);
            navyCell(interHdr.getCell(1), "Interlocuteurs externes", ParagraphAlignment.CENTER, 10, true);
            for (int i = 0; i < interRows; i++) {
                XWPFTableRow r = interTbl.getRow(i + 1);
                String interne = i < internesL.size() ? internesL.get(i) : "";
                String externe = i < externesL.size() ? externesL.get(i) : "";
                plainCell(r.getCell(0), interne, ParagraphAlignment.LEFT, 10, false);
                plainCell(r.getCell(1), externe, ParagraphAlignment.LEFT, 10, false);
            }
            doc.createParagraph();

            // ── IV. Indicateurs de performance ──────────────────────────────
            sectionHeading(doc, "IV.", "INDICATEURS DE PERFORMANCE (KPI)");
            for (int i = 0; i < indicateurs.size(); i++) numberedItem(doc, i + 1, indicateurs.get(i));
            doc.createParagraph();

            // ── V. Intérim ──────────────────────────────────────────────────
            sectionHeading(doc, "V.", "INTERIMAIRE");
            doc.createParagraph().createRun()
               .setText("En cas d'absence, le titulaire est remplacé par : ......................................................................");
            doc.createParagraph();

            // ── VI. Critères de compétences ─────────────────────────────────
            sectionHeading(doc, "VI.", "CRITERES DE COMPETENCES");

            XWPFParagraph formP = doc.createParagraph();
            XWPFRun formLbl = formP.createRun();
            formLbl.setBold(true); formLbl.setFontSize(10);
            formLbl.setText("A. Niveau de formation : ");
            XWPFRun formVal = formP.createRun();
            formVal.setFontSize(10); formVal.setText(niveauFormation);

            XWPFParagraph expP = doc.createParagraph();
            XWPFRun expLbl = expP.createRun();
            expLbl.setBold(true); expLbl.setFontSize(10);
            expLbl.setText("B. Expérience requise : ");
            XWPFRun expVal = expP.createRun();
            expVal.setFontSize(10); expVal.setText(experienceRequise);

            doc.createParagraph();

            // C. Compétences techniques
            XWPFParagraph techLblP = doc.createParagraph();
            XWPFRun techLblR = techLblP.createRun();
            techLblR.setBold(true); techLblR.setFontSize(10);
            techLblR.setText("C. Compétences techniques :");

            int techRows = compTech.isEmpty() ? 7 : compTech.size();
            XWPFTable techTbl = doc.createTable(techRows + 2, 5);
            setTableWidth(techTbl, 9360);
            XWPFTableRow techHdr = techTbl.getRow(0);
            navyCell(techHdr.getCell(0), "N°",                    ParagraphAlignment.CENTER, 9, true);
            navyCell(techHdr.getCell(1), "Compétences techniques", ParagraphAlignment.LEFT,   9, true);
            navyCell(techHdr.getCell(2), "Poids",                  ParagraphAlignment.CENTER, 9, true);
            navyCell(techHdr.getCell(3), "Niveau requis (1–5)",    ParagraphAlignment.CENTER, 9, true);
            navyCell(techHdr.getCell(4), "Maîtrise",               ParagraphAlignment.CENTER, 9, true);
            for (int i = 0; i < techRows; i++) {
                XWPFTableRow r = techTbl.getRow(i + 1);
                String label   = i < compTech.size() ? toStr(compTech.get(i).get("label"), "") : "";
                Object poidsObj = i < compTech.size() ? compTech.get(i).get("poids") : 5;
                int poids = poidsObj instanceof Number num ? num.intValue() : 5;
                plainCell(r.getCell(0), String.valueOf(i + 1), ParagraphAlignment.CENTER, 9, false);
                plainCell(r.getCell(1), label,                  ParagraphAlignment.LEFT,   9, false);
                plainCell(r.getCell(2), String.valueOf(poids),  ParagraphAlignment.CENTER, 9, false);
                plainCell(r.getCell(3), "",                     ParagraphAlignment.CENTER, 9, false);
                plainCell(r.getCell(4), "",                     ParagraphAlignment.CENTER, 9, false);
            }
            XWPFTableRow techTotal = techTbl.getRow(techRows + 1);
            navyCell(techTotal.getCell(0), "",      ParagraphAlignment.CENTER, 9, true);
            navyCell(techTotal.getCell(1), "TOTAL", ParagraphAlignment.LEFT,   9, true);
            navyCell(techTotal.getCell(2), "35",    ParagraphAlignment.CENTER, 9, true);
            navyCell(techTotal.getCell(3), "",      ParagraphAlignment.CENTER, 9, true);
            navyCell(techTotal.getCell(4), "",      ParagraphAlignment.CENTER, 9, true);

            doc.createParagraph();

            // D. Compétences comportementales
            XWPFParagraph behLblP = doc.createParagraph();
            XWPFRun behLblR = behLblP.createRun();
            behLblR.setBold(true); behLblR.setFontSize(10);
            behLblR.setText("D. Compétences comportementales :");

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
            sectionHeading(doc, "VII.", "QUALITE – SECURITE – ENVIRONNEMENT (QSE)");
            XWPFParagraph qseP = doc.createParagraph();
            XWPFRun qseR = qseP.createRun();
            qseR.setFontSize(10);
            qseR.setText("Le titulaire du poste est responsable de l'application des procédures QSE en vigueur "
                    + "dans l'entreprise et contribue à l'amélioration continue du système de management QSE.");

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

            // ── Header (logos | title | Management RH) ──────────────────────
            XWPFTable headerTbl = doc.createTable(1, 3);
            setTableWidth(headerTbl, 9360);
            XWPFTableRow hRow = headerTbl.getRow(0);

            // Left: logos
            setLogosInCell(doc, hRow.getCell(0));

            // Center: title (navy) — matches PDF exactly
            XWPFTableCell midC = hRow.getCell(1);
            navyCell(midC, "LISTE DES DOCUMENTS", ParagraphAlignment.CENTER, 11, true);
            XWPFParagraph midP2 = midC.addParagraph();
            midP2.setAlignment(ParagraphAlignment.CENTER);
            XWPFRun midR2 = midP2.createRun();
            midR2.setBold(true); midR2.setFontSize(11); midR2.setColor(WHITE);
            midR2.setText("ADMINISTRATIFS A FOURNIR");
            XWPFParagraph midP3 = midC.addParagraph();
            midP3.setAlignment(ParagraphAlignment.CENTER);
            XWPFRun midR3 = midP3.createRun();
            midR3.setBold(true); midR3.setFontSize(11); midR3.setColor(WHITE);
            midR3.setText("CDI-CDD");

            // Right: Management RH (navy)
            XWPFTableCell rightC = hRow.getCell(2);
            navyCell(rightC, "Management", ParagraphAlignment.RIGHT, 9, false);
            XWPFParagraph rp2 = rightC.addParagraph(); rp2.setAlignment(ParagraphAlignment.RIGHT);
            XWPFRun rr2 = rp2.createRun(); rr2.setFontSize(9); rr2.setColor(WHITE); rr2.setText("Ressources");
            XWPFParagraph rp3 = rightC.addParagraph(); rp3.setAlignment(ParagraphAlignment.RIGHT);
            XWPFRun rr3 = rp3.createRun(); rr3.setFontSize(9); rr3.setColor(WHITE); rr3.setText("Humaines");

            doc.createParagraph();

            // ── Info table ──────────────────────────────────────────────────
            XWPFTable infoTbl = doc.createTable(3, 2);
            setTableWidth(infoTbl, 9360);
            addInfoRow(infoTbl, 0, "Filiale",   "Ventec");
            addInfoRow(infoTbl, 1, "Catégorie", contractType != null ? contractType : "CDI / CDD");
            addInfoRow(infoTbl, 2, "Candidat",  candidateName);

            doc.createParagraph();

            // ── Documents table ─────────────────────────────────────────────
            int rows = Math.max(documents.size(), 1);
            XWPFTable docTbl = doc.createTable(rows + 1, 3);
            setTableWidth(docTbl, 9360);
            XWPFTableRow docHdr = docTbl.getRow(0);
            navyCell(docHdr.getCell(0), "Documents",            ParagraphAlignment.LEFT,   10, true);
            navyCell(docHdr.getCell(1), "Nombre d'exemplaires", ParagraphAlignment.CENTER, 10, true);
            navyCell(docHdr.getCell(2), "Observation",          ParagraphAlignment.LEFT,   10, true);

            if (documents.isEmpty()) {
                XWPFTableRow r = docTbl.getRow(1);
                plainCell(r.getCell(0), "Aucun document spécifié", ParagraphAlignment.LEFT,   10, false);
                plainCell(r.getCell(1), "",                         ParagraphAlignment.CENTER, 10, false);
                plainCell(r.getCell(2), "",                         ParagraphAlignment.LEFT,   10, false);
            } else {
                for (int i = 0; i < documents.size(); i++) {
                    Map<String, Object> item = documents.get(i);
                    String name    = toStr(item.get("name"), "");
                    String copies  = toStr(item.get("copies"), "1");
                    String obs     = toStr(item.get("observation"), "");
                    XWPFTableRow r = docTbl.getRow(i + 1);
                    plainCell(r.getCell(0), name,   ParagraphAlignment.LEFT,   10, false);
                    plainCell(r.getCell(1), copies, ParagraphAlignment.CENTER, 10, false);
                    plainCell(r.getCell(2), obs,    ParagraphAlignment.LEFT,   10, false);
                }
            }

            doc.createParagraph();
            XWPFParagraph noteP = doc.createParagraph();
            XWPFRun noteR = noteP.createRun();
            noteR.setFontSize(9); noteR.setItalic(true); noteR.setColor("555555");
            noteR.setText("Poste : " + postingTitle);

            doc.createParagraph();
            // Footer matches PDF: "Version du 01/01/2022  Annule et remplace celle du 04/01/2021"
            XWPFTable footerTbl = doc.createTable(1, 2);
            setTableWidth(footerTbl, 9360);
            removeBorders(footerTbl);
            plainCell(footerTbl.getRow(0).getCell(0),
                      "Version du 01/01/2022", ParagraphAlignment.LEFT, 8, false);
            plainCell(footerTbl.getRow(0).getCell(1),
                      "Annule et remplace celle du 04/01/2021", ParagraphAlignment.RIGHT, 8, false);

            doc.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Erreur lors de la génération de la liste des documents", e);
        }
    }

    // ── PDF export for interview compte-rendu ────────────────────────────────
    public byte[] exportInterviewToPdf(UUID id) {
        Interview interview = interviewRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Interview not found: " + id));

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document pdf = new Document(PageSize.A4, 50, 50, 60, 60);
            PdfWriter.getInstance(pdf, out);
            pdf.open();

            Font titleFont   = new Font(Font.HELVETICA, 18, Font.BOLD,   new Color(29, 78, 216));
            Font headingFont = new Font(Font.HELVETICA, 12, Font.BOLD,   new Color(55, 65, 81));
            Font labelFont   = new Font(Font.HELVETICA, 10, Font.BOLD,   new Color(107, 114, 128));
            Font valueFont   = new Font(Font.HELVETICA, 10, Font.NORMAL, new Color(17, 24, 39));
            Font noteFont    = new Font(Font.HELVETICA, 10, Font.ITALIC, new Color(75, 85, 99));
            Font footerFont  = new Font(Font.HELVETICA,  8, Font.NORMAL, new Color(156, 163, 175));

            Paragraph titlePara = new Paragraph("Compte-rendu d'entretien", titleFont);
            titlePara.setAlignment(Element.ALIGN_CENTER);
            titlePara.setSpacingAfter(6);
            pdf.add(titlePara);

            PdfPTable divider = new PdfPTable(1);
            divider.setWidthPercentage(100);
            PdfPCell divCell = new PdfPCell();
            divCell.setBackgroundColor(new Color(29, 78, 216));
            divCell.setFixedHeight(2f);
            divCell.setBorder(Rectangle.NO_BORDER);
            divider.addCell(divCell);
            divider.setSpacingAfter(16);
            pdf.add(divider);

            var app = interview.getApplication();
            if (app != null) {
                pdf.add(new Paragraph("Poste", headingFont));
                pdf.add(pdfField("Intitulé",
                        app.getJobPosting() != null ? app.getJobPosting().getTitle() : "—",
                        labelFont, valueFont));
                pdf.add(pdfField("Candidat",
                        app.getCandidate() != null
                                ? app.getCandidate().getFirstName() + " " + app.getCandidate().getLastName()
                                : "—",
                        labelFont, valueFont));
                pdf.add(new Paragraph(" "));
            }

            pdf.add(new Paragraph("Détails de l'entretien", headingFont));
            pdf.add(new Paragraph(" "));

            PdfPTable table = new PdfPTable(2);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{1f, 2f});
            addPdfRow(table, "Date & heure",
                    interview.getScheduledAt() != null ? interview.getScheduledAt().format(DATE_FMT) : "—",
                    labelFont, valueFont);
            addPdfRow(table, "Durée",
                    interview.getDurationMinutes() != null ? interview.getDurationMinutes() + " minutes" : "—",
                    labelFont, valueFont);
            addPdfRow(table, "Type",      toStr(interview.getType(),            "—"), labelFont, valueFont);
            addPdfRow(table, "Lieu/Lien", toStr(interview.getLocationOrLink(),  "—"), labelFont, valueFont);
            addPdfRow(table, "Statut",    toStr(interview.getStatus(),          "—"), labelFont, valueFont);
            table.setSpacingAfter(16);
            pdf.add(table);

            // ── AI-generated questions ───────────────────────────────────────────
            if (interview.getQuestions() != null && !interview.getQuestions().isBlank()) {
                try {
                    List<?> rawList = objectMapper.readValue(interview.getQuestions(), List.class);
                    if (!rawList.isEmpty()) {
                        Font qLabelFont  = new Font(Font.HELVETICA, 9, Font.BOLD,   new Color(4, 120, 87));
                        Font qAnswerFont = new Font(Font.HELVETICA, 9, Font.ITALIC, new Color(6, 78, 59));

                        Paragraph qSection = new Paragraph("Questions d'entretien IA", headingFont);
                        qSection.setSpacingBefore(8);
                        qSection.setSpacingAfter(8);
                        pdf.add(qSection);

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

                            Paragraph qPara = new Paragraph(num + ". " + questionText, valueFont);
                            qPara.setSpacingAfter(answerText != null ? 3 : 8);
                            pdf.add(qPara);

                            if (answerText != null && !answerText.isBlank()) {
                                PdfPTable ansBox = new PdfPTable(1);
                                ansBox.setWidthPercentage(95);
                                ansBox.setHorizontalAlignment(Element.ALIGN_RIGHT);
                                PdfPCell labelCell = new PdfPCell(new Phrase("Réponse attendue :", qLabelFont));
                                labelCell.setBackgroundColor(new Color(236, 253, 245));
                                labelCell.setBorderColor(new Color(167, 243, 208));
                                labelCell.setPaddingTop(5);
                                labelCell.setPaddingBottom(2);
                                labelCell.setPaddingLeft(8);
                                labelCell.setBorderWidthBottom(0);
                                ansBox.addCell(labelCell);
                                PdfPCell ansCell = new PdfPCell(new Phrase(answerText, qAnswerFont));
                                ansCell.setBackgroundColor(new Color(236, 253, 245));
                                ansCell.setBorderColor(new Color(167, 243, 208));
                                ansCell.setPaddingTop(2);
                                ansCell.setPaddingBottom(6);
                                ansCell.setPaddingLeft(8);
                                ansCell.setBorderWidthTop(0);
                                ansBox.addCell(ansCell);
                                ansBox.setSpacingAfter(8);
                                pdf.add(ansBox);
                            }
                            num++;
                        }
                        pdf.add(new Paragraph(" "));
                    }
                } catch (Exception ignored) {}
            }

            pdf.add(new Paragraph("Notes et observations", headingFont));
            pdf.add(new Paragraph(" "));
            String notes = (interview.getNotes() != null && !interview.getNotes().isBlank())
                    ? interview.getNotes() : "Aucune note enregistrée.";
            Paragraph notesPara = new Paragraph(notes, noteFont);
            notesPara.setSpacingAfter(24);
            pdf.add(notesPara);

            PdfPTable sigTable = new PdfPTable(2);
            sigTable.setWidthPercentage(100);
            addSigCell(sigTable, "Signature du recruteur", valueFont);
            addSigCell(sigTable, "Signature du candidat",  valueFont);
            pdf.add(sigTable);

            pdf.add(new Paragraph(" "));
            Paragraph footerPara = new Paragraph("Document généré par Ventec GRH", footerFont);
            footerPara.setAlignment(Element.ALIGN_CENTER);
            pdf.add(footerPara);

            pdf.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Erreur lors de la génération du PDF", e);
        }
    }

    // ── Logo / signature helpers ─────────────────────────────────────────────

    private byte[] loadLogoBytes(String resourcePath) {
        try (InputStream is = getClass().getResourceAsStream(resourcePath)) {
            return is != null ? is.readAllBytes() : null;
        } catch (IOException e) {
            return null;
        }
    }

    /** Puts Ventec logo above Ecowell logo in a white cell. */
    private void setLogosInCell(XWPFDocument doc, XWPFTableCell cell) {
        byte[] ventec  = loadLogoBytes("/logos/ventec-logo.jpeg");
        byte[] ecowell = loadLogoBytes("/logos/ecowell-logo.jpg");
        setCellBg(cell, WHITE);

        XWPFParagraph p1 = cell.getParagraphs().isEmpty() ? cell.addParagraph() : cell.getParagraphs().get(0);
        p1.setAlignment(ParagraphAlignment.CENTER);
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

    private void addInfoRow(XWPFTable table, int rowIdx, String label, String value) {
        XWPFTableRow row = table.getRow(rowIdx);
        grayCell(row.getCell(0), label, ParagraphAlignment.LEFT, 10, true);
        plainCell(row.getCell(1), value, ParagraphAlignment.LEFT, 10, false);
    }

    private void sectionHeading(XWPFDocument doc, String roman, String heading) {
        XWPFParagraph p = doc.createParagraph();
        XWPFRun run = p.createRun();
        run.setBold(true); run.setFontSize(11);
        run.setUnderline(UnderlinePatterns.SINGLE);
        run.setText(roman + " " + heading);
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
