package com.ventec.grh_backend.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.tags.Tag;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI grHOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Ventec GRH — API Recrutement")
                        .description("""
                                API REST du système de gestion des ressources humaines Ventec.

                                **Authentification** : Bearer JWT émis par Keycloak.
                                Cliquez sur *Authorize* et collez votre token pour tester les endpoints protégés.

                                **Rôles** : `ADMIN` (accès complet) · `RH` (accès recrutement) · `USER` (lecture)
                                """)
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("Ventec")
                                .email("contact@ventec.ma")))
                .components(new Components()
                        .addSecuritySchemes("bearerAuth", new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Token JWT obtenu depuis Keycloak")))
                .tags(List.of(
                        new Tag().name("Offres d'emploi").description("Gestion des offres de recrutement"),
                        new Tag().name("Candidats").description("Gestion des profils candidats"),
                        new Tag().name("Candidatures").description("Gestion des candidatures par offre"),
                        new Tag().name("Filtrage IA").description("Scoring et filtrage automatique par l'IA"),
                        new Tag().name("Entretiens").description("Planification et suivi des entretiens"),
                        new Tag().name("Tableau de bord").description("Statistiques et indicateurs RH"),
                        new Tag().name("Administration").description("Gestion des utilisateurs (ADMIN uniquement)"),
                        new Tag().name("Notifications").description("Notifications internes en temps réel"),
                        new Tag().name("Checklist documents").description("Suivi des documents requis par candidat"),
                        new Tag().name("Callbacks internes").description("Endpoints appelés par le service FastAPI (pas d'auth utilisateur)"),
                        new Tag().name("Données IA").description("Endpoints anonymisés utilisés par le service IA"),
                        new Tag().name("Public").description("Ressources publiques (logo, assets)"),
                        new Tag().name("Debug").description("Inspection du token JWT courant")
                ));
    }
}
