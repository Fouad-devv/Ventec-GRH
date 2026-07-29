"""
LLM scoring module.
Sends candidate CV text + job description to Claude Sonnet, receives a score (0-100) and summary.

CRITICAL non-discrimination rule:
  - The prompt NEVER includes candidate name, age, gender, nationality, or photo.
  - Only skills, experience, and education are passed.
  - The LLM is explicitly instructed to ignore any demographic information.
"""
import json
import logging

import anthropic

from config import settings

logger = logging.getLogger(__name__)

client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

SYSTEM_PROMPT = """Tu es un assistant RH expert en évaluation de candidats.
Ta tâche est d'évaluer la pertinence d'un CV par rapport à une offre d'emploi.

RÈGLES IMPÉRATIVES :
1. Évalue UNIQUEMENT les compétences techniques, l'expérience professionnelle et la formation.
2. N'utilise JAMAIS le nom, l'âge, le sexe, la nationalité ou toute information démographique dans ton évaluation.
3. Toute information personnelle dans le CV doit être ignorée.
4. Sois objectif et factuel.

Retourne un objet JSON valide avec exactement ces champs, sans texte avant ni après :
{
  "score": <nombre entre 0 et 100>,
  "summary": "<2-3 phrases expliquant le score en français>"
}"""


async def score_candidate(
    cv_text: str,
    job_description: str,
    requirements: str,
    candidate_id: str,
) -> dict:
    """
    Returns {"candidate_id": ..., "score": float, "summary": str}
    """
    if not settings.anthropic_api_key:
        return {
            "candidate_id": candidate_id,
            "score": 50.0,
            "summary": "Évaluation IA non disponible (clé API manquante).",
        }

    user_message = f"""OFFRE D'EMPLOI :
{job_description or "Aucune description fournie."}

EXIGENCES :
{requirements or "Aucune exigence spécifiée."}

CONTENU DU CV (informations personnelles supprimées) :
{cv_text[:6000]}"""

    try:
        message = await client.messages.create(
            model=settings.claude_sonnet_model,
            max_tokens=512,
            temperature=0.2,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )
        text = message.content[0].text
        start = text.find("{")
        end = text.rfind("}") + 1
        data = json.loads(text[start:end] if start >= 0 and end > start else text)
        score = float(data.get("score", 50))
        summary = str(data.get("summary", ""))
        return {"candidate_id": candidate_id, "score": min(max(score, 0), 100), "summary": summary}
    except Exception as e:
        logger.error("LLM scoring failed for candidate %s: %s", candidate_id, e)
        return {"candidate_id": candidate_id, "score": 0.0, "summary": f"Erreur lors de l'évaluation: {e}"}


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
