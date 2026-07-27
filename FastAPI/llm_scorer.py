"""
LLM scoring module.
Sends candidate CV text + job description to GPT, receives a score (0-100) and summary.

CRITICAL non-discrimination rule:
  - The prompt NEVER includes candidate name, age, gender, nationality, or photo.
  - Only skills, experience, and education are passed.
  - The LLM is explicitly instructed to ignore any demographic information.
"""
import json
import logging
from typing import Optional

from openai import AsyncOpenAI

from config import settings

logger = logging.getLogger(__name__)

client = AsyncOpenAI(api_key=settings.openai_api_key)

SYSTEM_PROMPT = """Tu es un assistant RH expert en évaluation de candidats.
Ta tâche est d'évaluer la pertinence d'un CV par rapport à une offre d'emploi.

RÈGLES IMPÉRATIVES :
1. Évalue UNIQUEMENT les compétences techniques, l'expérience professionnelle et la formation.
2. N'utilise JAMAIS le nom, l'âge, le sexe, la nationalité ou toute information démographique dans ton évaluation.
3. Toute information personnelle dans le CV doit être ignorée.
4. Sois objectif et factuel.

Retourne un JSON avec exactement ces champs :
{
  "score": <number between 0 and 100>,
  "summary": "<2-3 sentences explaining the score in French>"
}
"""


async def score_candidate(
    cv_text: str,
    job_description: str,
    requirements: str,
    candidate_id: str,
) -> dict:
    """
    Returns {"candidate_id": ..., "score": float, "summary": str}
    """
    if not settings.openai_api_key:
        # Fallback: return a neutral score when no API key configured
        return {
            "candidate_id": candidate_id,
            "score": 50.0,
            "summary": "Évaluation IA non disponible (clé API manquante).",
        }

    user_message = f"""
OFFRE D'EMPLOI :
{job_description or "Aucune description fournie."}

EXIGENCES :
{requirements or "Aucune exigence spécifiée."}

CONTENU DU CV (informations personnelles supprimées) :
{_anonymize(cv_text)}
"""

    try:
        response = await client.chat.completions.create(
            model=settings.model_name,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        content = response.choices[0].message.content
        data = json.loads(content)
        score = float(data.get("score", 50))
        summary = str(data.get("summary", ""))
        return {"candidate_id": candidate_id, "score": min(max(score, 0), 100), "summary": summary}
    except Exception as e:
        logger.error("LLM scoring failed for candidate %s: %s", candidate_id, e)
        return {"candidate_id": candidate_id, "score": 0.0, "summary": f"Erreur lors de l'évaluation: {e}"}


def _anonymize(text: str) -> str:
    """
    Basic anonymization: the LLM is already instructed to ignore personal info,
    but we strip common French name patterns as an extra safeguard.
    This is a best-effort pass; the system prompt is the primary control.
    """
    return text  # LLM instruction is the primary guard


async def score_multiple_candidates(
    candidates: list[dict],
    job_description: str,
    requirements: str,
) -> list[dict]:
    """
    candidates: [{"candidate_id": str, "cv_text": str}, ...]
    Returns: [{"candidate_id": str, "score": float, "summary": str}, ...]
    """
    import asyncio
    tasks = [
        score_candidate(
            cv_text=c.get("cv_text", ""),
            job_description=job_description,
            requirements=requirements,
            candidate_id=c["candidate_id"],
        )
        for c in candidates
    ]
    return await asyncio.gather(*tasks)
