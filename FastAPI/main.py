"""
GRH-VENTEC FastAPI AI Service
Handles:
  - POST /filter                       — async CV filtering + LLM scoring (calls back Spring Boot)
  - POST /extract-cv                   — extract structured data from CV text
  - POST /generate-description         — generate job posting description + requirements
  - POST /generate-interview-questions — generate interview questions for a candidate
  - POST /generate-checklist           — generate required document checklist
"""
import asyncio
import json as _json
import logging

import httpx
from fastapi import FastAPI, BackgroundTasks, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from openai import AsyncOpenAI

from config import settings
from cv_extractor import extract_text_from_bytes
from deterministic_filter import apply_deterministic_filter
from llm_scorer import score_multiple_candidates
from models import (
    FilterRequest, ExtractCvRequest, ExtractCvResponse,
    GenerateDescriptionRequest, GenerateDescriptionResponse,
    GenerateInterviewQuestionsRequest, GenerateInterviewQuestionsResponse,
    GenerateChecklistRequest, GenerateChecklistResponse, ChecklistItem,
    GenerateFicheFonctionRequest, GenerateFicheFonctionResponse, CompetenceCritere,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="GRH-VENTEC AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "UP"}


@app.post("/filter")
async def request_filter(req: FilterRequest, background_tasks: BackgroundTasks):
    """
    Receives a filter request from Spring Boot.
    Runs in background; calls back /api/callback/filter/{filter_job_id} when done.
    """
    background_tasks.add_task(_run_filter, req)
    return {"accepted": True, "filter_job_id": req.filter_job_id}


async def _run_filter(req: FilterRequest):
    callback_url = f"{settings.backend_url}/callback/filter/{req.filter_job_id}"
    try:
        # 1. Fetch candidate CV data from backend
        candidates_data = await _fetch_candidates(req.candidate_ids)

        # 2. Deterministic filter (experience only — no age/sex)
        filtered = apply_deterministic_filter(candidates_data)

        if not filtered:
            await _send_callback(callback_url, "DONE", [])
            return

        # 3. LLM scoring (only skills, experience, education — no demographics)
        scoring_input = [
            {"candidate_id": c["candidate_id"], "cv_text": c.get("cv_text", "")}
            for c in filtered
        ]
        results = await score_multiple_candidates(
            scoring_input, req.job_description, req.requirements
        )

        await _send_callback(callback_url, "DONE", results)

    except Exception as e:
        logger.error("Filter job %s failed: %s", req.filter_job_id, e)
        await _send_callback(callback_url, "FAILED", [], error_message=str(e))


async def _fetch_candidates(candidate_ids: list[str]) -> list[dict]:
    """
    Fetches candidate CV text from backend.
    Returns list of {candidate_id, cv_text, experience_years}.
    Note: backend sends NO age, NO sex — non-discrimination by design.
    """
    results = []
    async with httpx.AsyncClient(timeout=30.0) as client:
        for cid in candidate_ids:
            try:
                resp = await client.get(f"{settings.backend_url}/candidates/{cid}")
                if resp.status_code == 200:
                    data = resp.json()
                    results.append({
                        "candidate_id": cid,
                        "cv_text": data.get("cvExtractedText") or "",
                        "experience_years": data.get("experienceYears"),
                        "skills": data.get("skills") or "",
                        "education": data.get("education") or "",
                        "current_position": data.get("currentPosition") or "",
                    })
                else:
                    results.append({"candidate_id": cid, "cv_text": "", "experience_years": None})
            except Exception as e:
                logger.warning("Failed to fetch candidate %s: %s", cid, e)
                results.append({"candidate_id": cid, "cv_text": "", "experience_years": None})
    return results


async def _send_callback(url: str, status: str, results: list, error_message: str = None):
    payload = {"status": status}
    if status == "DONE":
        payload["result"] = results
    if error_message:
        payload["error_message"] = error_message

    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(url, json=payload)
                if resp.status_code < 300:
                    logger.info("Callback sent to %s — status: %s", url, status)
                    return
                logger.warning("Callback attempt %d returned %d", attempt + 1, resp.status_code)
        except Exception as e:
            logger.error("Callback attempt %d failed: %s", attempt + 1, e)
        await asyncio.sleep(2 ** attempt)

    logger.error("All callback attempts failed for %s", url)


_groq_client = AsyncOpenAI(
    api_key=settings.groq_api_key,
    base_url="https://api.groq.com/openai/v1",
) if settings.groq_api_key else None


def _require_groq():
    if not _groq_client:
        raise HTTPException(status_code=503, detail="Groq API key not configured")
    return _groq_client


async def _run_cv_extraction(text: str, source: str = "native") -> ExtractCvResponse:
    """
    Extract structured CV data using Groq (Llama).
    `source` is 'pdfplumber', 'ocr', 'text', or 'pdfplumber_fallback' — used to
    tune the prompt so the model is aware of potential OCR noise.
    """
    client = _require_groq()

    # OCR text can contain garbled characters — tell the model explicitly
    ocr_note = ""
    if source == "ocr":
        ocr_note = (
            "\nATTENTION : ce texte a été extrait par reconnaissance optique de caractères (OCR) "
            "depuis un CV scanné. Il peut contenir des erreurs de reconnaissance (lettres confondues, "
            "espaces parasites, lignes fusionnées). Corrige silencieusement les erreurs évidentes "
            "lors de l'extraction et base-toi sur le contexte pour interpréter les parties ambiguës.\n"
        )

    # Send more text for OCR (noisier, needs more context to extract same info)
    char_limit = 10_000 if source == "ocr" else 6_000

    prompt = f"""Tu es un expert RH et en analyse de CVs. Extrait avec précision les informations \
suivantes du CV ci-dessous et retourne UNIQUEMENT un objet JSON valide.
{ocr_note}
Format attendu :
{{
  "skills": ["compétence1", "compétence2", ...],
  "experience_years": <nombre entier ou null>,
  "education": "<diplôme le plus élevé obtenu ou null>",
  "current_position": "<intitulé du poste actuel ou du dernier poste occupé ou null>",
  "location": "<ville et/ou pays de résidence ou null>"
}}

Règles strictes :
- skills : compétences techniques (langages, frameworks, outils, certifications) ET soft skills — maximum 15, sans doublons
- experience_years : somme totale des années d'expérience professionnelle (entier, pas de décimale) ; si non précisé dans le CV, déduis-le des dates de début/fin des postes
- education : diplôme principal (ex. "Master Informatique", "Licence Gestion", "Bac+5 Ingénieur") — le plus haut obtenu
- current_position : poste exact tel qu'il apparaît dans le CV
- location : ville et pays si disponibles (ex. "Alger, Algérie")
- Si une information est absente ou impossible à déduire, retourne null pour ce champ
- Ne retourne QUE le JSON, sans aucun texte avant ou après

CV :
{text[:char_limit]}
"""
    response = await client.chat.completions.create(
        model=settings.groq_model_fast,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.0,
        response_format={"type": "json_object"},
    )
    data = _json.loads(response.choices[0].message.content)
    skills = data.get("skills", [])
    if isinstance(skills, str):
        skills = [s.strip() for s in skills.split(",") if s.strip()]
    return ExtractCvResponse(
        skills=skills[:15],
        experience_years=data.get("experience_years"),
        education=data.get("education"),
        current_position=data.get("current_position"),
        location=data.get("location"),
    )


@app.post("/extract-cv", response_model=ExtractCvResponse)
async def extract_cv(req: ExtractCvRequest):
    """Extracts structured data from raw CV text (already extracted by the caller)."""
    if not settings.groq_api_key:
        return ExtractCvResponse(skills=[], experience_years=None,
                                 education=None, current_position=None, location=None)
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=422, detail="Le texte du CV est vide")
    try:
        return await _run_cv_extraction(req.text, source="text")
    except HTTPException:
        raise
    except Exception as e:
        logger.error("CV extraction failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/extract-cv-file", response_model=ExtractCvResponse)
async def extract_cv_file(file: UploadFile = File(...)):
    """
    Extracts structured data from an uploaded CV file.
    - Native PDF  → pdfplumber (fast, precise)
    - Scanned PDF → pytesseract OCR at 300 DPI (automatic fallback)
    - Plain text  → UTF-8 decode
    """
    if not settings.groq_api_key:
        return ExtractCvResponse(skills=[], experience_years=None,
                                 education=None, current_position=None, location=None)
    try:
        content = await file.read()
        filename = file.filename or "file.pdf"
        text, method = extract_text_from_bytes(content, filename)

        logger.info(
            "CV '%s' extracted via %s — %d characters",
            filename, method, len(text),
        )

        if not text.strip():
            raise HTTPException(
                status_code=422,
                detail=(
                    "Impossible d'extraire le texte du CV. "
                    "Vérifiez que le fichier n'est pas protégé ou corrompu."
                ),
            )

        return await _run_cv_extraction(text, source=method)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("CV file extraction failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate-description", response_model=GenerateDescriptionResponse)
async def generate_description(req: GenerateDescriptionRequest):
    """Generates a job posting description and requirements using Groq Llama."""
    client = _require_groq()
    context_parts = [f"Titre du poste : {req.title}"]
    if req.department:
        context_parts.append(f"Département : {req.department}")
    if req.contract_type:
        context_parts.append(f"Type de contrat : {req.contract_type}")
    if req.location:
        context_parts.append(f"Localisation : {req.location}")
    if req.min_experience is not None:
        context_parts.append(f"Expérience minimum : {req.min_experience} an(s)")
    context = "\n".join(context_parts)

    prompt = f"""Tu es un expert RH. Génère une offre d'emploi professionnelle en français pour :

{context}

Retourne UNIQUEMENT un objet JSON valide :
{{
  "description": "<description du poste en 3-4 paragraphes : contexte, missions principales, environnement de travail>",
  "requirements": "<liste des exigences et compétences requises, une par ligne avec tiret '-'>"
}}

La description doit être motivante, claire et professionnelle. Les exigences doivent être précises et réalistes.
"""
    try:
        response = await client.chat.completions.create(
            model=settings.groq_model_smart,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            response_format={"type": "json_object"},
        )
        data = _json.loads(response.choices[0].message.content)
        return GenerateDescriptionResponse(
            description=data.get("description", ""),
            requirements=data.get("requirements", ""),
        )
    except Exception as e:
        logger.error("Description generation failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate-interview-questions", response_model=GenerateInterviewQuestionsResponse)
async def generate_interview_questions(req: GenerateInterviewQuestionsRequest):
    """Generates tailored interview questions using Groq Llama fast."""
    client = _require_groq()
    context_parts = [f"Poste : {req.job_title}"]
    if req.job_description:
        context_parts.append(f"Description : {req.job_description[:500]}")
    if req.requirements:
        context_parts.append(f"Exigences : {req.requirements[:300]}")
    if req.candidate_skills:
        context_parts.append(f"Compétences candidat : {req.candidate_skills}")
    if req.candidate_position:
        context_parts.append(f"Poste actuel candidat : {req.candidate_position}")
    if req.candidate_experience_years is not None:
        context_parts.append(f"Expérience candidat : {req.candidate_experience_years} an(s)")
    context = "\n".join(context_parts)

    prompt = f"""Tu es un expert RH. Génère 8 questions d'entretien pertinentes en français pour :

{context}

Retourne UNIQUEMENT un objet JSON valide :
{{
  "questions": [
    "Question 1 ?",
    "Question 2 ?",
    "Question 3 ?"
  ]
}}

Inclure : 3 questions techniques, 2 questions comportementales, 2 questions de motivation, 1 question de mise en situation.
"""
    try:
        response = await client.chat.completions.create(
            model=settings.groq_model_fast,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            response_format={"type": "json_object"},
        )
        data = _json.loads(response.choices[0].message.content)
        questions = data.get("questions", [])
        return GenerateInterviewQuestionsResponse(questions=questions[:10])
    except Exception as e:
        logger.error("Interview questions generation failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate-fiche-fonction", response_model=GenerateFicheFonctionResponse)
async def generate_fiche_fonction(req: GenerateFicheFonctionRequest):
    """
    Generates all textual content for a Ventec-style fiche de fonction (job function sheet).
    The behavioral competencies are standard and hardcoded in the Java export layer.
    This endpoint only generates the variable content specific to the position.
    """
    client = _require_groq()

    context_parts = [f"Titre du poste : {req.title}"]
    if req.department:    context_parts.append(f"Département : {req.department}")
    if req.contract_type: context_parts.append(f"Type de contrat : {req.contract_type}")
    if req.filiale:       context_parts.append(f"Filiale / Entité : {req.filiale}")
    if req.description:   context_parts.append(f"Description existante :\n{req.description[:800]}")
    if req.requirements:  context_parts.append(f"Exigences existantes :\n{req.requirements[:600]}")
    context = "\n".join(context_parts)

    prompt = f"""Tu es un expert RH chez Ventec. Génère le contenu d'une fiche de fonction \
professionnelle en français pour le poste suivant :

{context}

Retourne UNIQUEMENT un objet JSON valide avec exactement cette structure :
{{
  "missions": [
    "Mission principale 1",
    "Mission principale 2",
    "Mission principale 3"
  ],
  "activites_principales": [
    "Activité détaillée 1",
    "Activité détaillée 2",
    "Activité détaillée 3",
    "Activité détaillée 4",
    "Activité détaillée 5"
  ],
  "indicateurs_performance": [
    "Indicateur mesurable 1",
    "Indicateur mesurable 2",
    "Indicateur mesurable 3"
  ],
  "niveau_formation": "BAC+X en Domaine ou équivalent",
  "experience_requise": "Description précise de l'expérience requise",
  "competences_techniques": [
    {{"label": "Compétence technique ou fonctionnelle 1", "poids": 5}},
    {{"label": "Compétence technique ou fonctionnelle 2", "poids": 5}},
    {{"label": "Compétence technique ou fonctionnelle 3", "poids": 5}},
    {{"label": "Compétence technique ou fonctionnelle 4", "poids": 5}},
    {{"label": "Compétence technique ou fonctionnelle 5", "poids": 5}},
    {{"label": "Compétence technique ou fonctionnelle 6", "poids": 5}},
    {{"label": "Compétence technique ou fonctionnelle 7", "poids": 5}}
  ],
  "interlocuteurs_internes": [
    "Service ou département interne 1",
    "Service ou département interne 2"
  ],
  "interlocuteurs_externes": [
    "Partenaire ou organisme externe 1",
    "Partenaire ou organisme externe 2"
  ]
}}

Règles strictes :
- missions : 3 à 5 missions principales, formulation concise et orientée résultat
- activites_principales : 6 à 10 activités opérationnelles précises
- indicateurs_performance : 4 à 6 KPIs mesurables et pertinents pour le poste
- niveau_formation : diplôme requis (ex: "BAC+5 en Informatique ou en Systèmes d'Information")
- experience_requise : durée et type d'expérience (ex: "Débutant(e) accepté(e) ou 1 à 2 ans d'expérience en développement logiciel")
- competences_techniques : exactement 7 compétences techniques/fonctionnelles clés du poste, toutes avec poids = 5
- interlocuteurs_internes : 2 à 4 services internes avec lesquels le poste interagit
- interlocuteurs_externes : 2 à 4 organismes/partenaires externes
- Toutes les valeurs en français professionnel
- Ne retourne QUE le JSON, sans aucun texte avant ou après
"""

    try:
        response = await client.chat.completions.create(
            model=settings.groq_model_smart,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            response_format={"type": "json_object"},
        )
        data = _json.loads(response.choices[0].message.content)

        competences_raw = data.get("competences_techniques", [])
        competences = []
        for c in competences_raw:
            if isinstance(c, dict):
                competences.append(CompetenceCritere(
                    label=str(c.get("label", "")),
                    poids=int(c.get("poids", 5)),
                ))

        return GenerateFicheFonctionResponse(
            missions=data.get("missions", []),
            activites_principales=data.get("activites_principales", []),
            indicateurs_performance=data.get("indicateurs_performance", []),
            niveau_formation=data.get("niveau_formation", ""),
            experience_requise=data.get("experience_requise", ""),
            competences_techniques=competences,
            interlocuteurs_internes=data.get("interlocuteurs_internes", []),
            interlocuteurs_externes=data.get("interlocuteurs_externes", []),
        )
    except Exception as e:
        logger.error("Fiche de fonction generation failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


_CHECKLIST_DEFAULT = [
    {"name": "Curriculum Vitae",                                    "copies": 1, "observation": ""},
    {"name": "Photo d'identité récente",                            "copies": 3, "observation": ""},
    {"name": "Photocopie CIN légalisée",                            "copies": 2, "observation": ""},
    {"name": "Photocopie carte CNSS",                               "copies": 1, "observation": "Si déjà inscrit"},
    {"name": "N° CIMR",                                             "copies": 1, "observation": "Si déjà inscrit"},
    {"name": "Relevé d'Identité Bancaire",                          "copies": 1, "observation": ""},
    {"name": "Fiche anthropométrique",                              "copies": 1, "observation": ""},
    {"name": "Photocopie des diplômes",                             "copies": 1, "observation": ""},
    {"name": "Certificat de travail / Attestation de stage",        "copies": 1, "observation": "Expérimenté ou débutant"},
    {"name": "Radio pulmonaire (petit format)",                     "copies": 1, "observation": ""},
    {"name": "Bulletin d'adhésion Assurance + Fiche Administrative","copies": 1, "observation": "Jour de l'intégration"},
    {"name": "Contrat de travail",                                  "copies": 2, "observation": ""},
]


@app.post("/generate-checklist", response_model=GenerateChecklistResponse)
async def generate_checklist(req: GenerateChecklistRequest):
    """
    Generates a personalised administrative document checklist for a hired candidate.
    Uses Groq (Llama) for context-aware personalisation.
    Falls back to the standard Ventec list if Groq is not configured or fails.
    """
    if not _groq_client:
        logger.warning("Groq API key not set — returning default checklist")
        return GenerateChecklistResponse(documents=[ChecklistItem(**d) for d in _CHECKLIST_DEFAULT])

    is_chantier = any(kw in (req.job_title + " " + (req.department or "")).lower()
                      for kw in ("chantier", "terrain", "site", "travaux", "btp",
                                 "génie civil", "construction", "ouvrier"))

    prompt = f"""Tu es un assistant RH chez Ventec (entreprise marocaine).
Génère la liste personnalisée des documents administratifs à fournir pour un candidat recruté.

Informations:
- Candidat : {req.candidate_name or ""}
- Poste : {req.job_title}
- Type de contrat : {req.contract_type or "CDI"}
- Département : {req.department or ""}
- Personnel chantier/terrain : {"oui" if is_chantier else "non"}

Documents standards Ventec CDI/CDD (à adapter) :
1. Curriculum Vitae — 1 exemplaire
2. Photo d'identité récente — 3 exemplaires
3. Photocopie CIN légalisée — 2 exemplaires
4. Photocopie carte CNSS — 1 exemplaire — si déjà inscrit
5. N° CIMR — 1 exemplaire — si déjà inscrit
6. Relevé d'Identité Bancaire — 1 exemplaire
7. Fiche anthropométrique — 1 exemplaire
8. Photocopie des diplômes — 1 exemplaire
9. Certificat de travail du dernier employeur — 1 exemplaire — pour expérimenté
10. Attestations de stage — 1 exemplaire — pour débutant
11. Radio pulmonaire (petit format) — 1 exemplaire
12. Analyse de sang NFS (numérotation formule sanguine) — 1 exemplaire — CHANTIER UNIQUEMENT
13. Analyse de sang IGE (immunoglobuline non spécifique) — 1 exemplaire — CHANTIER UNIQUEMENT
14. Bulletin d'adhésion Assurance + Fiche Administrative — 1 exemplaire — à remplir le jour de l'intégration
15. Contrat de travail — 2 exemplaires

Règles strictes :
- Inclure "Analyse de sang NFS" et "Analyse de sang IGE" UNIQUEMENT si personnel chantier = oui
- Inclure "Certificat de travail" OU "Attestations de stage", pas les deux (selon le profil du poste)
- Adapter les observations selon le contexte du poste (courtes, max 8 mots, ou vide)
- Adapter le nombre d'exemplaires si nécessaire

Retourne UNIQUEMENT un objet JSON valide :
{{
  "documents": [
    {{"name": "Curriculum Vitae", "copies": 1, "observation": ""}},
    {{"name": "Photo d'identité récente", "copies": 3, "observation": ""}}
  ]
}}"""

    try:
        client = _require_groq()
        response = await client.chat.completions.create(
            model=settings.groq_model_fast,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )
        data = _json.loads(response.choices[0].message.content)
        raw_items = data.get("documents", [])
        documents = [
            ChecklistItem(
                name=str(item.get("name", "")),
                copies=int(item.get("copies", 1)),
                observation=str(item.get("observation", "")),
            )
            for item in raw_items
            if item.get("name")
        ]
        return GenerateChecklistResponse(documents=documents)

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Groq checklist generation failed: %s — returning default", e)
        return GenerateChecklistResponse(documents=[ChecklistItem(**d) for d in _CHECKLIST_DEFAULT])
