"""
LLM scoring module.
Sends candidate CV text + job description to Groq (Llama smart), receives a score (0-100) and summary.

CRITICAL non-discrimination rule:
  - The prompt NEVER includes candidate name, age, gender, nationality, or photo.
  - Only skills, experience, and education are passed.
  - The LLM is explicitly instructed to ignore any demographic information.
"""
import json
import logging
import re
import unicodedata
from datetime import date
from typing import Optional

from openai import AsyncOpenAI

from config import settings

logger = logging.getLogger(__name__)

# ─── Protected-characteristic filter ────────────────────────────────────────
# Gender, religion, nationality, marital status are illegal hiring criteria.
# Any sentence in free_filter_prompt that references these is silently stripped.
_DISCRIM_RE = re.compile(
    r'(?:'
    r'\b(?:homme|femme|male|female|masculin|féminin|genre|sexe)\b'
    r'|\b(?:religion|musulman[e]?|chrétien[ne]?|juif|juive|bouddhiste|athée)\b'
    r'|\b(?:nationalité|marocain[e]?|français[e]?|étranger[ère]?)\b'
    r'|\b(?:marié[e]?|célibataire|veuf|divorcé[e]?|état\s+civil)\b'
    r'|\b(?:enceinte|grossesse|maternité|paternité)\b'
    r')',
    re.IGNORECASE,
)


def _sanitize_free_prompt(prompt: str) -> str:
    """Strip sentences containing protected-characteristic criteria. Returns cleaned prompt."""
    if not prompt:
        return prompt
    parts = re.split(r'(?<=[.!?\n,;])\s*', prompt)
    kept = []
    for part in parts:
        if _DISCRIM_RE.search(part):
            logger.warning("Discriminatory criterion ignored: %r", part.strip())
        else:
            kept.append(part)
    return ' '.join(kept).strip()


# ─── Deterministic eliminatory pre-checks ────────────────────────────────────

def _nfc(text: str) -> str:
    """Normalize Unicode to NFC so pdfplumber NFD output matches precomposed patterns."""
    return unicodedata.normalize("NFC", text)


# Student patterns — written to survive both accented (NFC) and unaccented (OCR drift) text.
# Matched against NFC-normalized text so `é/è` always precomposed before comparison.
_STUDENT_RE = re.compile(
    r'(?:'
    r'(?:eleve|élève)\s*[-]?\s*ing[eé]nieure?'        # "élève ingénieur" / "eleve ingenieur"
    r'|en\s+cours\s+de\s+(?:formation|cycle|scolarit[eé]|[eé]tudes)'
    r'|\d\s*(?:[eè]re?|[eè]me)\s+ann[eé]e\s+(?:en\s+)?(?:cycle|ing[eé]nieur|master|bac)'
    r'|(?:premi[eè]re?|deuxi[eè]me?|troisi[eè]me?|quatri[eè]me?|cinqui[eè]me?)'
      r'\s+ann[eé]e\s+(?:en\s+)?(?:cycle|ing[eé]nieur|master)'
    r'|(?:en\s+)?(?:deuxi[eè]me?|premi[eè]re?|troisi[eè]me?)\s+ann[eé]e\s+en\s+cycle'  # "en deuxième année en cycle"
    r')',
    re.IGNORECASE | re.UNICODE,
)

# Detect highest completed diploma level in CV text (run on NFC text)
_EDU_LEVEL_5_RE = re.compile(r"\b(?:master|ing[eé]nieur\s+diplom[eé]|diplom[eé]\s+d'ing[eé]nieur|bac\s*\+\s*5)\b", re.IGNORECASE | re.UNICODE)
_EDU_LEVEL_3_RE = re.compile(r'\b(?:licence|licence\s+professionnelle|bac\s*\+\s*3)\b', re.IGNORECASE | re.UNICODE)
_EDU_LEVEL_2_RE = re.compile(r'\b(?:bts|brevet\s+de\s+technicien\s+sup[eé]rieur|dut|diplôme\s+universitaire\s+de\s+technologie|bac\s*\+\s*2)\b', re.IGNORECASE | re.UNICODE)

# Detect school-type constraint keywords in free_filter_prompt
_SCHOOL_CONSTRAINT_RE = re.compile(
    r'(?:école\s+d\'?ing[eé]nieur|ensa[a-z]*|ensam|emi\b|ehtp|insa\b|'
    r'(?:doit|faut|obligatoire|uniquement|seulement)\s+.{0,40}(?:école|ing[eé]nieur|ensa|ensam))',
    re.IGNORECASE | re.UNICODE,
)
# Patterns that indicate the candidate studied at a regular university (faculté)
_FST_RE = re.compile(
    r'\b(?:fst\b|fsjes\b|fsjest?\b|facult[eé]\s+des\s+sciences|'
    r'universit[eé]\s+(?:hassan|mohammed|ibn|cadi|sidi|abdelmalek))',
    re.IGNORECASE | re.UNICODE,
)
_GRANDE_ECOLE_RE = re.compile(
    r'\b(?:ensa[a-z]*|ensam\b|emi\b|ehtp\b|insa[a-z]*|'
    r'[eé]cole\s+(?:nationale|poly|centrale|sup[eé]rieure))',
    re.IGNORECASE | re.UNICODE,
)


def _required_bac_level(required_education: str) -> Optional[int]:
    """Extract required Bac+ level from the education string."""
    m = re.search(r'bac\s*\+\s*(\d)', required_education, re.IGNORECASE)
    if m:
        return int(m.group(1))
    low = required_education.lower()
    if any(w in low for w in ('master', 'ingénieur', 'bac+5')):
        return 5
    if any(w in low for w in ('licence', 'bac+3')):
        return 3
    return None


def _candidate_bac_level(cv_text: str) -> Optional[int]:
    """Detect the highest completed diploma level in the CV."""
    if _EDU_LEVEL_5_RE.search(cv_text):
        return 5
    if _EDU_LEVEL_3_RE.search(cv_text):
        return 3
    if _EDU_LEVEL_2_RE.search(cv_text):
        return 2
    return None


def _school_type_eliminatory(cv_text: str, free_filter_prompt: Optional[str]) -> Optional[str]:
    """
    If HR explicitly requires an école d'ingénieur and the candidate studied
    at a regular faculté (FST, FSJES, etc.), return an elimination reason.
    """
    if not free_filter_prompt:
        return None
    if not _SCHOOL_CONSTRAINT_RE.search(free_filter_prompt):
        return None
    # HR requires a grande école — check if candidate studied at faculté instead
    candidate_has_grande_ecole = bool(_GRANDE_ECOLE_RE.search(cv_text))
    candidate_has_faculte = bool(_FST_RE.search(cv_text))
    if candidate_has_faculte and not candidate_has_grande_ecole:
        return (
            "Le candidat a étudié dans une faculté (université classique) alors que "
            "le responsable RH exige un diplôme d'une école d'ingénieur (ENSA, ENSAM, EMI…). "
            "Critère éliminatoire non satisfait (score = 0)."
        )
    return None


def _eliminatory_check(
    cv_text: str,
    required_education: Optional[str],
    free_filter_prompt: Optional[str],
) -> Optional[str]:
    """
    Returns an elimination reason string if the candidate is hard-eliminated,
    or None if they should proceed to LLM scoring.
    Priority: student → level → school type.
    """
    # Normalize to NFC — pdfplumber may emit NFD (decomposed accents) which
    # breaks regex matches on precomposed chars like é, è, ê.
    cv = _nfc(cv_text)

    # 1. Still a student?
    if _STUDENT_RE.search(cv):
        return (
            "Le candidat est encore étudiant (non diplômé). "
            "Un candidat en cours de cycle de formation ne peut pas être retenu pour ce poste."
        )

    # 2. Education level too low?
    if required_education:
        req = _required_bac_level(required_education)
        cand = _candidate_bac_level(cv)
        if req and cand and cand < req:
            return (
                f"Le candidat possède un diplôme Bac+{cand} "
                f"alors que le poste exige un Bac+{req}. "
                f"Niveau de formation insuffisant — critère éliminatoire (score = 0)."
            )

    # 3. Wrong school type (if HR specified école d'ingénieur)?
    school_reason = _school_type_eliminatory(cv, free_filter_prompt)
    if school_reason:
        return school_reason

    return None

client = AsyncOpenAI(
    api_key=settings.groq_api_key,
    base_url="https://api.groq.com/openai/v1",
)

SYSTEM_PROMPT = """Tu es un assistant RH STRICT chargé d'évaluer des candidats pour Ventec Maroc.

══════════════════════════════════════════════════════
ÉTAPE 1 — CRITÈRES ÉLIMINATOIRES (VÉRIFICATION OBLIGATOIRE EN PREMIER)
══════════════════════════════════════════════════════
Avant d'évaluer quoi que ce soit, vérifie ces critères dans l'ordre.
Si UN SEUL critère éliminatoire n'est pas satisfait → score = 0, POINT FINAL.
Aucune compétence, aucune expérience ne peut compenser un critère éliminatoire non respecté.

CRITÈRES ÉLIMINATOIRES AUTOMATIQUES :

[A] NIVEAU DE DIPLÔME :
  TABLEAU DES ÉQUIVALENCES (obligatoire — ne jamais ignorer) :
    - Licence / Licence Professionnelle / LP / L3 = Bac+3
    - BTS (Brevet de Technicien Supérieur) = Bac+2
    - DUT (Diplôme Universitaire de Technologie) = Bac+2
    - Master / Master Pro / Master Recherche / MBA / M2 = Bac+5
    - Ingénieur diplômé / Diplôme d'Ingénieur = Bac+5
  Règles d'élimination :
  - Si le poste exige Bac+5 et que le candidat a seulement Bac+3 (Licence) ou Bac+2 (BTS/DUT) → score = 0.
  - Si le poste exige Bac+3 et que le candidat a seulement Bac+2 (BTS/DUT) → score = 0.
  - Un candidat ayant exactement le niveau requis (Licence pour Bac+3, Master pour Bac+5) SATISFAIT le critère.
  - Des intitulés différents mais équivalents (ex. "Licence Professionnelle en Génie Civil" = "Bac+3 en Génie civil") SATISFONT le critère.

[B] CANDIDAT ENCORE ÉTUDIANT (non diplômé) :
  - Si le CV mentionne "élève ingénieur", "en cours de formation", "en 1ère/2ème/3ème année",
    ou toute formulation indiquant EXPLICITEMENT que le candidat n'est PAS encore diplômé → score = 0.
  - Un élève ingénieur en cours de cycle n'est PAS un ingénieur diplômé.
  - RÈGLE CRITIQUE SUR LES DATES : Une formation indiquée avec une plage d'années (ex. "2023 – 2025")
    dont l'année de fin est STRICTEMENT ANTÉRIEURE à l'année actuelle (fournie dans le message)
    signifie que la formation EST TERMINÉE → le candidat EST diplômé → NE PAS éliminer.
  - Exemple : "Master 2023–2025" avec année actuelle = 2026 → diplôme OBTENU, critère [B] non applicable.
  - N'éliminer sur [B] que si le CV indique EXPLICITEMENT "en cours", "en formation", une année de fin
    FUTURE, ou une formulation active comme "1ère année de master" sans date de fin passée.

[C] CRITÈRES SPÉCIFIQUES DU RESPONSABLE RH :
  - Tous les critères listés dans "CRITÈRES ÉLIMINATOIRES DU RESPONSABLE RH" sont des filtres ABSOLUS.
  - Si le candidat ne satisfait pas l'un d'eux → score = 0 immédiatement.
  - Exemples : école requise (ENSA, ENSAM…), secteur requis, certification obligatoire, etc.

  RÈGLE ABSOLUE — ÉCOLE D'INGÉNIEUR :
  Un "Diplôme d'Ingénieur d'État" ou "Ingénieur d'État" est délivré EXCLUSIVEMENT par des écoles
  d'ingénieur accréditées. Si un candidat possède ce diplôme (peu importe la formulation exacte
  dans le CV), il satisfait AUTOMATIQUEMENT tout critère demandant une "école d'ingénieur".
  Écoles d'ingénieur marocaines reconnues (liste non exhaustive) :
    ENSA (toutes villes), ENSAM, EMI, EHTP, INSA, et tout établissement dont le nom contient
    "École Nationale Supérieure" ou "École Nationale des Sciences Appliquées".
  NE JAMAIS rejeter un candidat ayant un "Diplôme d'Ingénieur d'État" d'une de ces écoles
  sous prétexte que le terme "école d'ingénieur" n'est pas écrit mot pour mot dans le CV.

══════════════════════════════════════════════════════
ÉTAPE 2 — ÉVALUATION DES COMPÉTENCES (seulement si étape 1 est 100% passée)
══════════════════════════════════════════════════════
Si et seulement si TOUS les critères éliminatoires sont satisfaits :
- Adéquation des compétences techniques au poste : 50%
- Pertinence de l'expérience professionnelle : 30%
- Niveau et domaine de formation : 20%

RÈGLES NON-DISCRIMINATION (priorité absolue sur tout autre critère) :
- IGNORE tout critère basé sur : le sexe, le genre, la religion, la nationalité, l'état civil, l'origine.
- Si un critère éliminatoire mentionne le sexe (homme/femme/male/female) ou toute caractéristique protégée,
  tu DOIS l'ignorer complètement et ne PAS l'appliquer, quelle que soit la formulation.
- N'utilise jamais le prénom ou le nom pour déduire le sexe, la religion ou l'origine d'un candidat.

══════════════════════════════════════════════════════
FORMAT JSON DE RÉPONSE (obligatoire) :
{
  "score": <entier entre 0 et 100>,
  "summary": "<2-3 phrases en français : si score=0, cite EXPLICITEMENT le critère éliminatoire non respecté ; sinon explique le score>"
}"""


async def score_candidate(
    cv_text: str,
    job_description: str,
    requirements: str,
    candidate_id: str,
    extracted_job_data: Optional[str] = None,
    free_filter_prompt: Optional[str] = None,
    experience_years: Optional[int] = None,
    min_experience: Optional[int] = None,
) -> dict:
    """
    Returns {"candidate_id": ..., "score": float, "summary": str}
    """
    if not settings.groq_api_key:
        return {
            "candidate_id": candidate_id,
            "score": 50.0,
            "summary": "Évaluation IA non disponible (clé API manquante).",
        }

    # ── Strip discriminatory criteria before any processing ─────────────────
    if free_filter_prompt:
        free_filter_prompt = _sanitize_free_prompt(free_filter_prompt)
    # ────────────────────────────────────────────────────────────────────────

    # ── Deterministic eliminatory pre-check (no LLM call needed) ────────────
    req_edu: Optional[str] = None
    if extracted_job_data:
        try:
            req_edu = json.loads(extracted_job_data).get("required_education")
        except Exception:
            pass

    elim_reason = _eliminatory_check(cv_text, req_edu, free_filter_prompt)
    if elim_reason:
        logger.info("Candidate %s eliminated deterministically: %s", candidate_id, elim_reason)
        return {"candidate_id": candidate_id, "score": 0.0, "summary": elim_reason}
    # ────────────────────────────────────────────────────────────────────────

    # Build the job context block
    job_context_parts = []
    if job_description:
        job_context_parts.append(f"DESCRIPTION DU POSTE :\n{job_description}")
    if requirements:
        job_context_parts.append(f"EXIGENCES :\n{requirements}")

    # Add structured job data extracted from fiche de poste if available
    if extracted_job_data:
        try:
            parsed = json.loads(extracted_job_data)
            elim_parts = []
            skill_parts = []

            if parsed.get("required_education"):
                elim_parts.append(
                    f"⛔ FORMATION ÉLIMINATOIRE : {parsed['required_education']}. "
                    f"IMPORTANT : le niveau Bac+ a déjà été vérifié et VALIDÉ avant cet appel — "
                    f"ne PAS éliminer sur le niveau Bac+. "
                    f"Applique score = 0 uniquement si le domaine d'études est totalement sans rapport avec le poste "
                    f"(ex. Bac+3 en Droit pour un poste de Génie Civil). "
                    f"Rappel des équivalences : Licence/LP/L3 = Bac+3 ; BTS/DUT = Bac+2 ; "
                    f"Master/Ingénieur diplômé = Bac+5. "
                    f"Des intitulés différents mais de niveau équivalent SATISFONT le critère."
                )
            if parsed.get("required_experience"):
                if min_experience is not None and min_experience > 0:
                    # Exact min handled by the explicit warning below — keep as info only
                    skill_parts.append(f"Expérience attendue : {parsed['required_experience']}")
                else:
                    elim_parts.append(f"⛔ EXPÉRIENCE ÉLIMINATOIRE : {parsed['required_experience']}")

            if parsed.get("required_skills"):
                skill_parts.append("Compétences requises : " + ", ".join(parsed["required_skills"]))
            if parsed.get("tools"):
                skill_parts.append("Outils/Technologies : " + ", ".join(parsed["tools"]))
            if parsed.get("missions"):
                skill_parts.append("Missions : " + " | ".join(parsed["missions"]))
            if parsed.get("nice_to_have"):
                skill_parts.append("Atouts supplémentaires : " + ", ".join(parsed["nice_to_have"]))

            if elim_parts:
                job_context_parts.append(
                    "CRITÈRES ÉLIMINATOIRES DU POSTE (score = 0 si non respecté) :\n"
                    + "\n".join(elim_parts)
                )
            if skill_parts:
                job_context_parts.append("COMPÉTENCES ET MISSIONS DU POSTE :\n" + "\n".join(skill_parts))
        except Exception:
            pass

    # HR's free-form instructions — always treated as eliminatory hard filters
    if free_filter_prompt and free_filter_prompt.strip():
        job_context_parts.append(
            "⛔ CRITÈRES ÉLIMINATOIRES DU RESPONSABLE RH (score = 0 si non respecté) :\n"
            f"{free_filter_prompt.strip()}\n\n"
            "RAPPEL ABSOLU : Chaque instruction ci-dessus est un filtre ÉLIMINATOIRE. "
            "Si le candidat ne satisfait pas même UN SEUL de ces critères, le score DOIT être 0. "
            "Ne jamais donner un score positif à un candidat qui échoue à un critère éliminatoire, "
            "même s'il a de très bonnes compétences techniques."
        )

    # ── Experience penalty: sliding cap based on absolute gap in years ───────────
    # Formula: max(35, 75 - gap × 10)
    #   gap 1 yr  → cap 65  |  gap 2 yrs → cap 55
    #   gap 3 yrs → cap 45  |  gap 4+ yrs → cap 35
    #   meets minimum → no cap (LLM scores freely; more exp above min = higher score)
    experience_cap = None
    experience_gap = None
    if (
        min_experience is not None and min_experience > 0
        and experience_years is not None
        and experience_years < min_experience
    ):
        experience_gap = min_experience - experience_years
        experience_cap = max(35, 75 - experience_gap * 10)
        # Insert FIRST so LLM reads it before EXIGENCES (which mention experience in text)
        job_context_parts.insert(0,
            f"RÈGLE ABSOLUE — EXPÉRIENCE (lire EN PREMIER avant toute autre instruction) :\n"
            f"  • Expérience du candidat : {experience_years} an(s)\n"
            f"  • Minimum requis du poste : {min_experience} an(s)\n"
            f"  • Écart : {experience_gap} an(s)\n"
            f"Le manque d'expérience est un critère de PÉNALISATION PROGRESSIVE — "
            f"il N'EST PAS éliminatoire. Ne jamais donner score = 0 pour ce seul motif. "
            f"Évaluez compétences et formation normalement (score entre 40 et 100). "
            f"Dans le résumé, indiquez l'écart avec les valeurs exactes ci-dessus — "
            f"ne pas les recalculer depuis le CV."
        )
    # ─────────────────────────────────────────────────────────────────────────────

    if not job_context_parts:
        job_context_parts.append("Aucune description du poste fournie.")

    today_str = date.today().strftime("%d/%m/%Y")
    user_message = f"DATE ACTUELLE : {today_str}\n\n" + "\n\n".join(job_context_parts) + f"""

CONTENU DU CV (informations personnelles supprimées) :
{cv_text[:6000]}"""

    try:
        response = await client.chat.completions.create(
            model=settings.groq_model_smart,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.0,
            response_format={"type": "json_object"},
        )
        data = json.loads(response.choices[0].message.content)
        score = float(data.get("score", 50))
        summary = str(data.get("summary", ""))

        if experience_cap is not None:
            if score <= 0.0:
                # LLM wrongly eliminated for experience — rebuild summary and use cap
                score = float(experience_cap)
                summary = (
                    f"{summary.strip()} "
                    f"[Correction automatique : l'expérience insuffisante n'est pas éliminatoire. "
                    f"Score ajusté à {experience_cap}/100 — "
                    f"{experience_years} an(s) d'expérience, {min_experience} an(s) requis, "
                    f"écart de {experience_gap} an(s).]"
                )
            else:
                score = min(score, experience_cap)
                # Append factual note if gap not already correctly stated
                fact = (
                    f" Expérience : {experience_years} an(s) / {min_experience} an(s) requis "
                    f"(écart de {experience_gap} an(s)) — score plafonné à {experience_cap}/100."
                )
                summary = summary.rstrip().rstrip('.') + fact

        return {"candidate_id": candidate_id, "score": min(max(score, 0), 100), "summary": summary}
    except Exception as e:
        logger.error("LLM scoring failed for candidate %s: %s", candidate_id, e)
        return {"candidate_id": candidate_id, "score": 0.0, "summary": f"Erreur lors de l'évaluation: {e}"}


async def score_multiple_candidates(
    candidates: list[dict],
    job_description: str,
    requirements: str,
    extracted_job_data: Optional[str] = None,
    free_filter_prompt: Optional[str] = None,
    min_experience: Optional[int] = None,
) -> list[dict]:
    """
    candidates: [{"candidate_id": str, "cv_text": str, "experience_years": int|None}, ...]
    Returns: [{"candidate_id": str, "score": float, "summary": str}, ...]
    """
    import asyncio
    tasks = [
        score_candidate(
            cv_text=c.get("cv_text", ""),
            job_description=job_description,
            requirements=requirements,
            candidate_id=c["candidate_id"],
            extracted_job_data=extracted_job_data,
            free_filter_prompt=free_filter_prompt,
            experience_years=c.get("experience_years"),
            min_experience=min_experience,
        )
        for c in candidates
    ]
    return await asyncio.gather(*tasks)
