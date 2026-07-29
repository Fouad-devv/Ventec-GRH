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
from typing import Optional

from openai import AsyncOpenAI

from config import settings

logger = logging.getLogger(__name__)

client = AsyncOpenAI(
    api_key=settings.groq_api_key,
    base_url="https://api.groq.com/openai/v1",
)

SYSTEM_PROMPT = """Tu es un assistant RH expert en évaluation de candidats.
Ta tâche est d'évaluer la pertinence d'un CV par rapport à une offre d'emploi.

RÈGLES IMPÉRATIVES :
1. Évalue UNIQUEMENT les compétences techniques, l'expérience professionnelle et la formation.
2. N'utilise JAMAIS le nom, l'âge, le sexe, la nationalité ou toute information démographique dans ton évaluation.
3. Toute information personnelle dans le CV doit être ignorée.
4. Sois objectif et factuel.

Retourne un objet JSON valide avec exactement ces champs :
{
  "score": <nombre entre 0 et 100>,
  "summary": "<2-3 phrases expliquant le score en français>"
}"""


async def score_candidate(
    cv_text: str,
    job_description: str,
    requirements: str,
    candidate_id: str,
    extracted_job_data: Optional[str] = None,
    free_filter_prompt: Optional[str] = None,
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
            structured_parts = []
            if parsed.get("required_skills"):
                structured_parts.append("Compétences requises : " + ", ".join(parsed["required_skills"]))
            if parsed.get("tools"):
                structured_parts.append("Outils/Technologies : " + ", ".join(parsed["tools"]))
            if parsed.get("required_education"):
                structured_parts.append(f"Formation requise : {parsed['required_education']}")
            if parsed.get("required_experience"):
                structured_parts.append(f"Expérience requise : {parsed['required_experience']}")
            if parsed.get("missions"):
                structured_parts.append("Missions : " + " | ".join(parsed["missions"]))
            if parsed.get("nice_to_have"):
                structured_parts.append("Atouts supplémentaires : " + ", ".join(parsed["nice_to_have"]))
            if structured_parts:
                job_context_parts.append("CRITÈRES STRUCTURÉS DU POSTE :\n" + "\n".join(structured_parts))
        except Exception:
            pass

    # HR's free-form filter instructions (evaluated after skills/experience)
    if free_filter_prompt and free_filter_prompt.strip():
        job_context_parts.append(
            f"CRITÈRES SUPPLÉMENTAIRES DU RESPONSABLE RH :\n{free_filter_prompt.strip()}\n"
            "(Ces critères sont à considérer dans l'évaluation globale, "
            "sans jamais prendre en compte des informations personnelles ou discriminatoires.)"
        )

    if not job_context_parts:
        job_context_parts.append("Aucune description du poste fournie.")

    user_message = "\n\n".join(job_context_parts) + f"""

CONTENU DU CV (informations personnelles supprimées) :
{cv_text[:6000]}"""

    try:
        response = await client.chat.completions.create(
            model=settings.groq_model_smart,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        data = json.loads(response.choices[0].message.content)
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
    extracted_job_data: Optional[str] = None,
    free_filter_prompt: Optional[str] = None,
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
            extracted_job_data=extracted_job_data,
            free_filter_prompt=free_filter_prompt,
        )
        for c in candidates
    ]
    return await asyncio.gather(*tasks)
