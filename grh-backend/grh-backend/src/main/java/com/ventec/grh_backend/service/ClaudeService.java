package com.ventec.grh_backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class ClaudeService {

    private static final String MODEL = "claude-haiku-4-5-20251001";

    private final WebClient anthropicWebClient;
    private final ObjectMapper objectMapper;

    public ClaudeService(@Qualifier("anthropicWebClient") WebClient anthropicWebClient,
                         ObjectMapper objectMapper) {
        this.anthropicWebClient = anthropicWebClient;
        this.objectMapper = objectMapper;
    }

    /**
     * Generates a personalized administrative document checklist for a hired candidate.
     * Returns a list of items: [{name, copies, observation, required, received}]
     * Falls back to the standard Ventec list if Claude fails.
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> generateDocumentChecklist(
            String candidateName, String postTitle, String contractType, String department) {

        String prompt = buildPrompt(candidateName, postTitle, contractType, department);

        Map<String, Object> body = Map.of(
                "model", MODEL,
                "max_tokens", 1024,
                "messages", List.of(Map.of("role", "user", "content", prompt))
        );

        try {
            Map<String, Object> response = anthropicWebClient.post()
                    .uri("/v1/messages")
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (response == null) return defaultChecklist(contractType);

            List<Map<String, Object>> content = (List<Map<String, Object>>) response.get("content");
            if (content == null || content.isEmpty()) return defaultChecklist(contractType);

            String text = (String) content.get(0).get("text");
            int start = text.indexOf('[');
            int end   = text.lastIndexOf(']') + 1;
            if (start < 0 || end <= start) return defaultChecklist(contractType);

            List<Map<String, Object>> items = objectMapper.readValue(text.substring(start, end), List.class);
            // Inject tracking fields expected by DocumentsPage
            return items.stream().map(item -> {
                java.util.Map<String, Object> m = new java.util.HashMap<>(item);
                m.putIfAbsent("required", true);
                m.putIfAbsent("received", false);
                return m;
            }).toList();

        } catch (Exception e) {
            log.warn("Claude document checklist generation failed for '{}': {}", postTitle, e.getMessage());
            return defaultChecklist(contractType);
        }
    }

    private String buildPrompt(String candidateName, String postTitle,
                                String contractType, String department) {
        boolean isChantier = isChantierPost(postTitle, department);
        return String.format("""
                Tu es un assistant RH chez Ventec (entreprise marocaine).
                Génère la liste personnalisée des documents administratifs à fournir pour un candidat recruté.

                Informations du candidat:
                - Nom: %s
                - Poste: %s
                - Type de contrat: %s
                - Département: %s
                - Personnel chantier/terrain: %s

                Documents standards Ventec CDI/CDD (base):
                1. Curriculum Vitae — 1 exemplaire
                2. Photo d'identité récente — 3 exemplaires
                3. Photocopie CIN légalisée — 2 exemplaires
                4. Photocopie carte CNSS — 1 exemplaire — observation: si déjà inscrit
                5. N° CIMR — 1 exemplaire — observation: si déjà inscrit
                6. Relevé d'Identité Bancaire — 1 exemplaire
                7. Fiche anthropométrique — 1 exemplaire
                8. Photocopie des diplômes — 1 exemplaire
                9. Certificat de travail du dernier employeur — 1 exemplaire — observation: pour expérimenté
                10. Attestations de stage — 1 exemplaire — observation: pour débutant
                11. Radio pulmonaire (petit format) — 1 exemplaire
                12. Analyse de sang NFS — 1 exemplaire — observation: personnel chantier uniquement
                13. Analyse de sang IGE — 1 exemplaire — observation: personnel chantier uniquement
                14. Bulletin d'adhésion Assurance + Fiche Administrative — 1 exemplaire — observation: à remplir le jour de l'intégration
                15. Contrat de travail — 2 exemplaires

                Règles:
                - Inclure "Analyse de sang NFS" et "Analyse de sang IGE" UNIQUEMENT si personnel chantier = oui
                - Adapter l'observation "pour expérimenté / pour débutant" selon le contexte du poste
                - Les observations doivent être courtes (max 8 mots) ou vide si rien de spécial
                - Adapter le nombre d'exemplaires si nécessaire selon le poste

                Retourne UNIQUEMENT un tableau JSON valide sans texte avant ni après:
                [
                  {"name": "Curriculum Vitae", "copies": 1, "observation": ""},
                  {"name": "Photo d'identité récente", "copies": 3, "observation": ""},
                  ...
                ]
                """,
                candidateName != null ? candidateName : "",
                postTitle     != null ? postTitle     : "",
                contractType  != null ? contractType  : "CDI",
                department    != null ? department    : "",
                isChantier ? "oui" : "non"
        );
    }

    private boolean isChantierPost(String title, String department) {
        String text = ((title != null ? title : "") + " " + (department != null ? department : "")).toLowerCase();
        return text.contains("chantier") || text.contains("terrain") || text.contains("site")
                || text.contains("travaux") || text.contains("btp") || text.contains("génie civil")
                || text.contains("construction") || text.contains("ouvrier");
    }

    private List<Map<String, Object>> defaultChecklist(String contractType) {
        return List.of(
                item("Curriculum Vitae",                             1, ""),
                item("Photo d'identité récente",                     3, ""),
                item("Photocopie CIN légalisée",                     2, ""),
                item("Photocopie carte CNSS",                        1, "Si déjà inscrit"),
                item("N° CIMR",                                      1, "Si déjà inscrit"),
                item("Relevé d'Identité Bancaire",                   1, ""),
                item("Fiche anthropométrique",                        1, ""),
                item("Photocopie des diplômes",                      1, ""),
                item("Certificat de travail / Attestation de stage", 1, "Expérimenté ou débutant"),
                item("Radio pulmonaire (petit format)",               1, ""),
                item("Bulletin d'adhésion Assurance + Fiche Administrative", 1, "Jour de l'intégration"),
                item("Contrat de travail",                           2, contractType != null ? contractType : "")
        );
    }

    private Map<String, Object> item(String name, int copies, String observation) {
        return Map.of("name", name, "copies", copies, "observation", observation,
                "required", true, "received", false);
    }
}
