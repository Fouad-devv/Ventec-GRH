# GRH Ventec — Plateforme de Recrutement IA

Plateforme de gestion du recrutement pour **Ventec**, dotée d'un moteur d'analyse IA des CVs, d'une réception automatique des candidatures par email, et d'un pipeline de sélection complet.

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 19 + Vite + Tailwind CSS |
| Backend | Spring Boot 3 (Java 21) |
| Service IA | FastAPI (Python 3) — Groq / Gemini / SambaNova |
| Base de données | PostgreSQL |
| Authentification | Keycloak 26 (OpenID Connect) |
| Reverse proxy | Nginx 1.27 (TLS termination) |
| Conteneurisation | Docker Compose |
| CI/CD | GitHub Actions (self-hosted runner) |

---

## Architecture

```
Internet
   │
   ▼
Nginx (TLS)
   ├── :443 / :4443  ──▶  React Frontend
   │        └──────────▶  Spring Boot API (/api/*)
   └── :8443 / :9443 ──▶  Keycloak
                               │
                    (réseau Docker interne)
                               │
                    FastAPI AI Service ◀── Groq / Gemini / SambaNova
                               │
                          PostgreSQL
```

---

## Environnements

| Environnement | Branche | Ports |
|---------------|---------|-------|
| Production | `main` | 443 (app), 8443 (Keycloak) |
| Test | `deployTest` | 4443 (app), 9443 (Keycloak) |

Les deux environnements tournent sur la même VM Ventec via des projets Docker Compose séparés (`grh-prod` / `grh-test`).

---

## Structure du projet

```
├── Front-GRH/              # Application React (Vite)
├── grh-backend/            # API Spring Boot
├── FastAPI/                # Service IA (analyse CV, matching offres)
├── nginx/
│   ├── nginx.prod.conf
│   └── nginx.test.conf
├── keycloak-theme/         # Thème Keycloak personnalisé Ventec
├── docker-compose.yml      # Prod
├── docker-compose.test.yml # Test
├── Dockerfile.keycloak
├── realm-export.json       # Configuration Keycloak (import automatique)
├── .env.prod.example       # Template variables d'environnement prod
├── .env.test.example       # Template variables d'environnement test
└── .github/workflows/
    ├── deploy-prod.yml     # CI/CD → production (push sur main)
    └── deploy-test.yml     # CI/CD → test (push sur deployTest)
```

---

## Fonctionnalités principales

- **Pipeline de recrutement** — gestion des candidatures de la réception à l'embauche
- **Analyse IA des CVs** — scoring automatique, extraction de compétences et d'expérience
- **Candidatures par email** — réception IMAP, matching IA vers l'offre correspondante
- **Génération de documents** — checklist d'intégration, convocations, fiches de poste
- **Multi-LLM avec rotation de clés** — Groq, Gemini et SambaNova en fallback automatique
- **Authentification SSO** — Keycloak avec rôles RH / ADMIN
- **Notifications email** — convocations entretiens, rejets, intégration SMTP

---

## Déploiement

### Prérequis (à faire une seule fois sur la VM)

1. Installer Docker + Docker Compose
2. Installer le GitHub Actions self-hosted runner
3. Placer les certificats TLS dans `/opt/grh-certs/` :
   ```
   /opt/grh-certs/server.crt    # Certificat serveur (leaf)
   /opt/grh-certs/ca-chain.crt  # Chaîne intermédiaire CA
   /opt/grh-certs/server.key    # Clé privée (chmod 600)
   ```
4. Configurer les secrets GitHub dans les environnements `production` et `test`
   (voir `.env.prod.example` et `.env.test.example`)

### Déploiement automatique

| Action | Résultat |
|--------|---------|
| Push sur `deployTest` | Déploiement automatique en environnement test |
| Push sur `main` | Déploiement automatique en production |

Le runner self-hosted sur la VM récupère le code, écrit le `.env` depuis les secrets GitHub, assemble les certificats TLS, puis lance `docker compose up -d --build`.

### Déploiement manuel (sans CI/CD)

```bash
# Copier et remplir le fichier d'environnement
cp .env.prod.example .env
# (éditer .env avec les vraies valeurs)

# Production
docker compose -f docker-compose.yml -p grh-prod up -d --build

# Test
docker compose -f docker-compose.test.yml -p grh-test up -d --build
```

---

## Variables d'environnement

Voir [`.env.prod.example`](.env.prod.example) et [`.env.test.example`](.env.test.example) pour la liste complète avec descriptions.
