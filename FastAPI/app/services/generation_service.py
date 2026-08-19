"""
Generation service.
All LLM-powered text generation: job descriptions, interview questions,
fiche de fonction, document checklists, and email-to-posting matching.
"""
import json
import logging
import re
from typing import Optional

from app.core.fallback import _call_with_fallback
from app.utils.helpers import safe_json_loads
from app.models.schemas import (
    GenerateDescriptionResponse,
    GenerateInterviewQuestionsResponse, QuestionItem,
    GenerateChecklistResponse, ChecklistItem,
    GenerateFicheFonctionResponse, CompetenceCritere, ActivityItem,
    ExtractJobPostingResponse,
    MatchPostingResponse,
)

logger = logging.getLogger(__name__)

_CHECKLIST_DEFAULT = [
    {"name": "Curriculum Vitae",                                     "copies": 1, "observation": ""},
    {"name": "Photo d'identité récente",                             "copies": 3, "observation": ""},
    {"name": "Photocopie CIN légalisée",                             "copies": 2, "observation": ""},
    {"name": "Photocopie carte CNSS",                                "copies": 1, "observation": "Si déjà inscrit"},
    {"name": "N° CIMR",                                              "copies": 1, "observation": "Si déjà inscrit"},
    {"name": "Relevé d'Identité Bancaire",                           "copies": 1, "observation": ""},
    {"name": "Fiche anthropométrique",                               "copies": 1, "observation": ""},
    {"name": "Photocopie des diplômes",                              "copies": 1, "observation": ""},
    {"name": "Attestations de stage",                                "copies": 1, "observation": "Pour débutant"},
    {"name": "Certificat de travail du dernier employeur",           "copies": 1, "observation": "Expérimenté"},
    {"name": "Radio pulmonaire (petit format)",                      "copies": 1, "observation": ""},
    {"name": "Bulletin d'adhésion Assurance + Fiche Administrative", "copies": 1, "observation": "À remplir le jour de l'intégration"},
    {"name": "Contrat de travail",                                   "copies": 2, "observation": ""},
]

_STOP_WORDS = {
    "candidature", "candidat", "objet", "poste", "pour", "de", "du",
    "le", "la", "les", "un", "une", "des", "en", "et", "au", "aux",
    "je", "ma", "mon", "offre", "emploi", "stage",
}


def _domain_tokens(text: str) -> set[str]:
    return {
        w for w in re.split(r'[\s\-_/,;.]+', text.lower())
        if len(w) >= 2 and w not in _STOP_WORDS
    }


def _heuristic_match(subject: str, postings: list) -> Optional[tuple]:
    """
    Fallback token-overlap matcher used when the LLM call fails.
    Returns (posting_id, posting_title, confidence) or None.
    """
    subject_tokens = _domain_tokens(subject)
    if not subject_tokens:
        return None

    best_id = None
    best_title = None
    best_score = 0.0

    for p in postings:
        posting_tokens = _domain_tokens(
            p.title + " " + (p.department or "") + " " + (p.description or "")[:300]
        )
        if not posting_tokens:
            continue
        overlap = subject_tokens & posting_tokens
        score = len(overlap) / max(len(subject_tokens), 1)
        if score > best_score:
            best_score = score
            best_id = p.id
            best_title = p.title

    if best_score >= 0.3 and best_id:
        return best_id, best_title, round(best_score * 0.7, 2)  # confidence deflated for heuristic
    return None


async def generate_description(req) -> GenerateDescriptionResponse:
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
    raw = await _call_with_fallback(
        [{"role": "user", "content": prompt}],
        model_type="smart", use_json=True, label="generate-description", temperature=0.7,
    )
    data = safe_json_loads(raw)
    return GenerateDescriptionResponse(
        description=data.get("description", ""),
        requirements=data.get("requirements", ""),
    )


async def generate_interview_questions(req) -> GenerateInterviewQuestionsResponse:
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

    prompt = f"""Tu es un recruteur RH expérimenté. Tu dois générer 8 questions d'entretien RH en français pour évaluer ce candidat.

{context}

STYLE DES QUESTIONS :
- Questions générales et accessibles, adaptées à un entretien RH (pas un entretien technique approfondi)
- Centrées sur le parcours, les motivations, le comportement, et les compétences générales du domaine
- Pour les questions qui touchent légèrement à un aspect technique du domaine (ex : outils RH, processus de recrutement, gestion des compétences), ajoute un champ "answer" avec une réponse attendue courte et claire
- Pour les questions purement comportementales ou de motivation, laisse "answer" à null

Répartition : 2 questions de présentation/parcours, 2 questions de motivation, 2 questions comportementales, 2 questions sur le domaine métier (avec réponse suggérée).

Retourne UNIQUEMENT ce JSON :
{{
  "questions": [
    {{"question": "Pouvez-vous vous présenter et nous parler de votre parcours ?", "answer": null}},
    {{"question": "Quels outils SIRH avez-vous utilisés ?", "answer": "Les principaux SIRH sont SAP SuccessFactors, Workday, Lucca, ou ADP. L'important est la capacité d'adaptation à de nouveaux outils."}}
  ]
}}
"""
    response_raw = await _call_with_fallback(
        [{"role": "user", "content": prompt}],
        model_type="fast", use_json=True, label="generate-interview-questions", temperature=0.7,
    )
    data = safe_json_loads(response_raw)
    raw = data.get("questions", [])
    questions = []
    for q in raw:
        if isinstance(q, dict):
            question_text = q.get("question") or q.get("text") or q.get("content") or q.get("q") or ""
            if not question_text:
                continue
            answer_text = q.get("answer") or q.get("reponse") or q.get("suggested_answer") or None
            if answer_text and str(answer_text).strip().lower() in ("null", "none", ""):
                answer_text = None
            questions.append(QuestionItem(
                question=str(question_text).strip(),
                answer=str(answer_text).strip() if answer_text else None,
            ))
        elif isinstance(q, str) and q.strip():
            questions.append(QuestionItem(question=q.strip(), answer=None))
    return GenerateInterviewQuestionsResponse(questions=questions[:10])


async def generate_fiche_fonction(req) -> GenerateFicheFonctionResponse:
    context_parts = [f"Titre du poste : {req.title}"]
    if req.department:    context_parts.append(f"Département : {req.department}")
    if req.contract_type: context_parts.append(f"Type de contrat : {req.contract_type}")
    if req.filiale:       context_parts.append(f"Filiale / Entité : {req.filiale}")
    if req.description:   context_parts.append(f"Description existante :\n{req.description[:800]}")
    if req.requirements:  context_parts.append(f"Exigences existantes :\n{req.requirements[:600]}")
    context = "\n".join(context_parts)

    prompt = f"""Tu es un expert RH chez Ventec Maroc. Tu dois générer le contenu d'une fiche de fonction \
professionnelle en français, en suivant EXACTEMENT le style et la structure des fiches de fonction Ventec.

Poste à documenter :
{context}

STYLE VENTEC À RESPECTER :
- Les missions sont courtes, concrètes, orientées action (verbe d'action à l'infinitif)
  Exemples pour un poste RH : "Coordonner les activités RH du Groupe", "Assurer le suivi des procédures RH"
- Les activités sont des tâches opérationnelles détaillées et spécifiques au poste
  Exemples : "Mettre en œuvre la politique de recrutement selon les orientations stratégiques",
             "Elaborer et mettre à jour les fiches de fonction des salariés",
             "Participer à l'élaboration du plan de formation annuel"
- L'intérimaire : une phrase complète mentionnant le supérieur hiérarchique direct
  Exemple : "Pendant l'absence du titulaire, l'intérim sera assuré par une personne désignée par le [titre du responsable]."
- collaborateurs_directs : "Néant" si aucun subordonné direct, sinon liste les postes
- Les compétences techniques sont précises et propres au métier (pas génériques)

Retourne UNIQUEMENT un objet JSON valide avec exactement cette structure :
{{
  "missions": [
    "Coordonner les ... du ...",
    "Assurer le suivi de ...",
    "Apporter une expertise en ...",
    "Contribuer à ..."
  ],
  "activites_principales": [
    {{
      "label": "Activité principale 1 du titulaire (verbe d'action à l'infinitif, spécifique au poste) :",
      "sub": [
        "Sous-activité détaillée 1a",
        "Sous-activité détaillée 1b",
        "Sous-activité détaillée 1c"
      ]
    }},
    {{
      "label": "Activité principale 2 :",
      "sub": [
        "Sous-activité détaillée 2a",
        "Sous-activité détaillée 2b"
      ]
    }},
    {{
      "label": "Activité principale 3 :",
      "sub": [
        "Sous-activité détaillée 3a",
        "Sous-activité détaillée 3b"
      ]
    }}
  ],
  "collaborateurs_directs": "Néant",
  "indicateurs_performance": [
    "KPI mesurable 1",
    "KPI mesurable 2",
    "KPI mesurable 3",
    "KPI mesurable 4"
  ],
  "niveau_formation": "BAC+X en Domaine spécifique ou en Domaine équivalent",
  "experience_requise": "Débutant(e) accepté(e) ou X à Y ans d'expérience dans un poste similaire",
  "competences_techniques": [
    {{"label": "Compétence technique spécifique au poste 1", "poids": 5}},
    {{"label": "Compétence technique spécifique au poste 2", "poids": 5}},
    {{"label": "Compétence technique spécifique au poste 3", "poids": 5}},
    {{"label": "Compétence technique spécifique au poste 4", "poids": 5}},
    {{"label": "Compétence technique spécifique au poste 5", "poids": 5}},
    {{"label": "Compétence technique spécifique au poste 6", "poids": 5}},
    {{"label": "Compétence technique spécifique au poste 7", "poids": 5}}
  ],
  "interlocuteurs_internes": [
    "Service ou Département interne 1",
    "Service ou Département interne 2",
    "Service ou Département interne 3"
  ],
  "interlocuteurs_externes": [
    "Organisme ou Partenaire externe 1",
    "Organisme ou Partenaire externe 2"
  ],
  "interimaire": "Pendant l'absence du titulaire, l'intérim sera assuré par une personne désignée par le [titre du responsable hiérarchique direct]."
}}

Règles strictes :
- missions : 3 à 5 missions CONCISES, verbe à l'infinitif, spécifiques au poste (pas génériques)
- activites_principales : 4 à 6 objets avec "label" (activité principale, verbe infinitif, finissant par ":") et "sub" (2 à 4 sous-tâches opérationnelles et spécifiques). EXEMPLE pour un poste RH : {{"label": "Mettre en œuvre la politique de recrutement selon les orientations stratégiques :", "sub": ["Analyser les besoins en recrutement en lien avec les managers", "Assurer la campagne de recrutement et la procédure de sélection", "Rédiger et publier les offres d'emploi sur les canaux appropriés"]}}
- collaborateurs_directs : "Néant" pour un poste sans subordonnés, sinon les titres des postes gérés
- indicateurs_performance : 4 à 6 KPIs mesurables et pertinents pour CE poste précis
- niveau_formation : diplôme et domaine précis (ex: "BAC+5 en Gestion des Ressources Humaines ou en Droit Social")
- experience_requise : précis et adapté au niveau du poste
- competences_techniques : exactement 7, toutes très spécifiques au métier, poids = 5
- interlocuteurs_internes : 2 à 4 services avec lesquels ce poste interagit vraiment
- interlocuteurs_externes : 2 à 4 organismes/partenaires externes réels pour ce métier
- interimaire : phrase complète avec le titre du responsable hiérarchique direct déduit du contexte
- Français professionnel, style Ventec formel
- Ne retourne QUE le JSON, sans texte avant ou après
"""
    response_raw = await _call_with_fallback(
        [{"role": "user", "content": prompt}],
        model_type="smart", use_json=True, label="generate-fiche-fonction", temperature=0.3,
    )
    data = safe_json_loads(response_raw)

    competences_raw = data.get("competences_techniques", [])
    competences = []
    for c in competences_raw:
        if isinstance(c, dict):
            competences.append(CompetenceCritere(
                label=str(c.get("label", "")),
                poids=int(c.get("poids", 5)),
            ))

    activites_raw = data.get("activites_principales", [])
    activites = []
    for a in activites_raw:
        if isinstance(a, dict):
            activites.append(ActivityItem(
                label=str(a.get("label", "")),
                sub=[str(s) for s in a.get("sub", [])],
            ))
        elif isinstance(a, str):
            activites.append(ActivityItem(label=a, sub=[]))

    return GenerateFicheFonctionResponse(
        missions=data.get("missions", []),
        activites_principales=activites,
        collaborateurs_directs=data.get("collaborateurs_directs", "Néant"),
        indicateurs_performance=data.get("indicateurs_performance", []),
        niveau_formation=data.get("niveau_formation", ""),
        experience_requise=data.get("experience_requise", ""),
        competences_techniques=competences,
        interlocuteurs_internes=data.get("interlocuteurs_internes", []),
        interlocuteurs_externes=data.get("interlocuteurs_externes", []),
        interimaire=data.get("interimaire", ""),
    )


async def generate_checklist(req, has_llm: bool = True) -> GenerateChecklistResponse:
    if not has_llm:
        logger.warning("No LLM provider configured — returning default checklist")
        return GenerateChecklistResponse(documents=[ChecklistItem(**d) for d in _CHECKLIST_DEFAULT])

    context = (req.job_title + " " + (req.department or "")).lower()

    is_chantier = any(kw in context for kw in (
        "chantier", "terrain", "site", "travaux", "btp",
        "génie civil", "construction", "ouvrier", "technicien de chantier",
    ))
    is_senior = any(kw in context for kw in (
        "senior", "confirmé", "expérimenté", "chef", "directeur",
        "responsable", "manager", "lead", "principal", "coordinateur",
    ))
    is_junior = any(kw in context for kw in (
        "junior", "débutant", "stagiaire", "assistant", "aide",
        "trainee", "apprenti", "entry", "profil junior",
    ))

    if is_senior:
        exp_rule = "INCLURE uniquement 'Certificat de travail du dernier employeur' (observation: 'Expérimenté'). NE PAS inclure 'Attestations de stage'."
    elif is_junior:
        exp_rule = "INCLURE uniquement 'Attestations de stage' (observation: 'Pour débutant'). NE PAS inclure 'Certificat de travail du dernier employeur'."
    else:
        exp_rule = "INCLURE les deux : 'Attestations de stage' (observation: 'Pour débutant') ET 'Certificat de travail du dernier employeur' (observation: 'Expérimenté')."

    chantier_rule = (
        "INCLURE 'Analyse de sang NFS (numérotation formule sanguine)' (1 ex, observation vide) ET 'Analyse de sang IGE (immunoglobuline non spécifique)' (1 ex, observation vide)."
        if is_chantier else
        "NE PAS inclure 'Analyse de sang NFS' ni 'Analyse de sang IGE'. Ces documents sont CHANTIER UNIQUEMENT et ce poste n'est pas un poste de chantier."
    )

    prompt = f"""Tu es un assistant RH chez Ventec Maroc.
Génère la liste exacte des documents administratifs à fournir pour ce candidat recruté.

Contexte :
- Candidat : {req.candidate_name or "—"}
- Poste : {req.job_title}
- Type de contrat : {req.contract_type or "CDI"}
- Département : {req.department or "—"}

Documents à toujours inclure (ordre obligatoire) :
1. Curriculum Vitae — 1 ex — observation vide
2. Photo d'identité récente — 3 ex — observation vide
3. Photocopie CIN légalisée — 2 ex — observation vide
4. Photocopie carte CNSS — 1 ex — observation : "Si déjà inscrit"
5. N° CIMR — 1 ex — observation : "Si déjà inscrit"
6. Relevé d'Identité Bancaire — 1 ex — observation vide
7. Fiche anthropométrique — 1 ex — observation vide
8. Photocopie des diplômes — 1 ex — observation vide

Règle expérience (appliquer strictement) :
{exp_rule}

Règle analyses sanguines (appliquer strictement) :
{chantier_rule}

Documents à toujours inclure en fin de liste :
- Radio pulmonaire (petit format) — 1 ex — observation vide
- Bulletin d'adhésion Assurance + Fiche Administrative — 1 ex — observation : "À remplir le jour de l'intégration"
- Contrat de travail — 2 ex — observation vide

IMPORTANT :
- Ne jamais inclure NFS/IGE si le poste n'est pas un poste de chantier
- Ne jamais modifier les noms des documents (copie exacte des libellés ci-dessus)
- Observations : courtes (max 6 mots) ou vides — jamais "null" ou "None"
- Retourner UNIQUEMENT le JSON, sans texte autour

Format JSON attendu :
{{
  "documents": [
    {{"name": "Curriculum Vitae", "copies": 1, "observation": ""}},
    {{"name": "Photo d'identité récente", "copies": 3, "observation": ""}}
  ]
}}"""

    try:
        checklist_raw = await _call_with_fallback(
            [{"role": "user", "content": prompt}],
            model_type="fast", use_json=True, label="generate-checklist", temperature=0.1,
        )
        data = safe_json_loads(checklist_raw)
        raw_items = data.get("documents", [])
        documents = [
            ChecklistItem(
                name=str(item.get("name", "")),
                copies=int(item.get("copies", 1)),
                observation=str(item.get("observation", "") or ""),
            )
            for item in raw_items
            if item.get("name")
        ]
        return GenerateChecklistResponse(documents=documents)
    except Exception as e:
        logger.error("Checklist generation failed: %s — returning default", e)
        return GenerateChecklistResponse(documents=[ChecklistItem(**d) for d in _CHECKLIST_DEFAULT])


async def extract_job_posting(text: str) -> ExtractJobPostingResponse:
    prompt = f"""Tu es un expert RH. Analyse cette fiche de poste et extrait les informations structurées.

Retourne UNIQUEMENT un objet JSON valide :
{{
  "required_skills": ["compétence1", "compétence2"],
  "tools": ["outil1", "outil2"],
  "required_education": "<niveau de formation requis ou null>",
  "required_experience": "<description de l'expérience requise ou null>",
  "missions": ["mission1", "mission2"],
  "nice_to_have": ["compétence optionnelle1"],
  "description": "<description du poste reformatée en 2-3 paragraphes>",
  "requirements": "<liste des exigences, une par ligne avec tiret '-'>"
}}

Règles :
- required_skills : compétences techniques indispensables (max 15)
- tools : logiciels, frameworks, équipements mentionnés (max 10)
- required_education : ex "Bac+5 Informatique" ou null
- required_experience : ex "3 à 5 ans en développement Java"
- missions : 3 à 6 missions principales extraites du document
- nice_to_have : compétences souhaitées mais non obligatoires (max 8)
- description et requirements : reformater le contenu du document de manière claire et professionnelle
- Retourne QUE le JSON, sans texte avant ou après

Fiche de poste :
{text[:10000]}
"""
    raw = await _call_with_fallback(
        [{"role": "user", "content": prompt}],
        model_type="smart", use_json=True, label="extract-job-posting", temperature=0.1,
    )
    data = safe_json_loads(raw)

    def _to_str(val) -> str | None:
        if val is None:
            return None
        if isinstance(val, list):
            cleaned = [str(item).lstrip("- ").strip() for item in val if item]
            return "\n".join(f"- {item}" for item in cleaned if item)
        return str(val)

    def _to_list(val) -> list:
        if not val:
            return []
        if isinstance(val, str):
            lines = [v.lstrip("- •").strip() for v in val.splitlines() if v.strip()]
            return lines if lines else [val.strip()]
        return [str(v) for v in val if v]

    return ExtractJobPostingResponse(
        required_skills=_to_list(data.get("required_skills")),
        tools=_to_list(data.get("tools")),
        required_education=_to_str(data.get("required_education")),
        required_experience=_to_str(data.get("required_experience")),
        missions=_to_list(data.get("missions")),
        nice_to_have=_to_list(data.get("nice_to_have")),
        description=_to_str(data.get("description")),
        requirements=_to_str(data.get("requirements")),
    )


async def match_posting(req) -> MatchPostingResponse:
    if not req.postings:
        return MatchPostingResponse()

    subject_tokens = _domain_tokens(req.subject)
    if subject_tokens:
        any_overlap = any(
            subject_tokens & _domain_tokens(
                p.title + " " + (p.department or "") + " " + (p.description or "")[:300]
            )
            for p in req.postings
        )
        if not any_overlap:
            logger.info(
                "match-posting '%s' → NO domain overlap with any posting — returning NO_MATCH",
                req.subject[:80],
            )
            return MatchPostingResponse()

    postings_list = "\n".join(
        f"{i + 1}. [id={p.id}] {p.title}"
        + (f" — Département : {p.department}" if p.department else "")
        + (f"\n   {p.description[:250]}" if p.description else "")
        for i, p in enumerate(req.postings)
    )

    prompt = f"""Tu es un système RH chargé de trier les candidatures reçues par email.

Voici l'objet de l'email de candidature reçu :
"{req.subject}"

Voici la liste des offres d'emploi actuellement ouvertes :
{postings_list}

Ta tâche : identifier l'offre dont le DOMAINE MÉTIER correspond à l'objet de l'email.

RÈGLES STRICTES — à respecter absolument :
1. Ne retourne un posting_id QUE si l'objet de l'email est clairement lié au domaine du poste.
   Exemples de correspondance valide :
   - "Candidature développeur web" → poste "Développeur web full stack"
   - "Candidature RH / ressources humaines" → poste "Responsable RH"
   - "Candidature comptable" → poste "Comptable junior"
   Exemples de NON-correspondance :
   - "Candidature RH" → poste "Développeur web"  (domaines différents)
   - "Candidature informatique" → poste "Responsable RH"  (domaines différents)

2. Si plusieurs offres sont disponibles mais qu'aucune ne correspond au domaine mentionné
   dans l'objet → retourne null. Ne jamais forcer un match par défaut.

3. La confiance doit refléter la pertinence réelle du domaine :
   - 0.9+ : correspondance explicite et directe (même intitulé de poste)
   - 0.75–0.89 : correspondance claire mais formulation différente
   - 0.65–0.74 : correspondance probable mais ambiguë
   - < 0.65 : doute trop fort → retourner null

Réponds UNIQUEMENT en JSON valide, sans texte autour, dans ce format exact :
{{"posting_id": "uuid-exact-de-l-offre", "posting_title": "titre exact", "confidence": 0.85}}

Si aucune offre ne correspond au domaine de l'email, retourne :
{{"posting_id": null, "posting_title": null, "confidence": 0.0}}"""

    try:
        raw = await _call_with_fallback(
            [{"role": "user", "content": prompt}],
            model_type="smart",
            use_json=True,
            label="match-posting",
            temperature=0.0,
        )
        data = safe_json_loads(raw)
        posting_id    = data.get("posting_id")
        posting_title = data.get("posting_title")
        confidence    = float(data.get("confidence", 0.0))
        logger.info(
            "match-posting '%s' → posting_id=%s confidence=%.2f",
            req.subject[:80], posting_id, confidence,
        )
        if posting_id and posting_title and confidence >= 0.0:
            return MatchPostingResponse(
                posting_id=posting_id,
                posting_title=posting_title,
                confidence=confidence,
            )
        return MatchPostingResponse()
    except Exception as e:
        logger.error("match-posting LLM failed for '%s': %s — using heuristic fallback", req.subject[:80], e)
        fallback_match = _heuristic_match(req.subject, req.postings)
        if fallback_match is not None:
            posting_id, posting_title, confidence = fallback_match
            return MatchPostingResponse(
                posting_id=posting_id,
                posting_title=posting_title,
                confidence=confidence,
            )
        return MatchPostingResponse()
