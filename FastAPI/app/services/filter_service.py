"""
Candidate filter service.
Fetches candidates from the Spring Boot backend, applies deterministic pre-filter,
then runs LLM scoring and sends results back via callback.
"""
import asyncio
import logging
from typing import List, Optional

import httpx

from app.config import settings
from app.services.scorer import score_multiple_candidates

logger = logging.getLogger(__name__)


def apply_deterministic_filter(
    candidates: List[dict],
    min_experience: Optional[int] = None,
    min_age: Optional[int] = None,
    max_age: Optional[int] = None,
) -> List[dict]:
    """
    Deterministic pre-filter applied BEFORE any LLM call.
    Experience shortfalls are NOT hard-filtered here — the LLM scorer applies a
    sliding penalty cap so candidates below the minimum still appear with a
    proportionally reduced score rather than being silently dropped.
    Age bounds are accepted for API symmetry but are soft criteria handled by the LLM scorer.
    """
    return list(candidates)


async def _fetch_candidates(candidate_ids: list[str]) -> list[dict]:
    """
    Fetches anonymized candidate CV data from the public /ai/candidates endpoint.
    Returns list of {candidate_id, cv_text, experience_years}.
    Note: endpoint returns NO name, NO age, NO sex — non-discrimination by design.

    Concurrency is capped at 3 to avoid saturating Spring Boot's thread pool
    (max-size=10) when it is simultaneously processing bulk CV uploads.
    Retries up to 5 times with exponential backoff on HTTP 429.
    """
    sem = asyncio.Semaphore(3)

    async def fetch_one(client: httpx.AsyncClient, cid: str) -> dict:
        async with sem:
            for attempt in range(5):
                delay = 2 * (attempt + 1)  # 2s, 4s, 6s, 8s, 10s
                try:
                    resp = await client.get(f"{settings.backend_url}/ai/candidates/{cid}")
                    if resp.status_code == 200:
                        data = resp.json()
                        return {
                            "candidate_id": cid,
                            "cv_text": data.get("cvExtractedText") or "",
                            "experience_years": data.get("experienceYears"),
                            "skills": data.get("skills") or "",
                            "education": data.get("education") or "",
                            "current_position": data.get("currentPosition") or "",
                        }
                    elif resp.status_code == 429:
                        logger.warning(
                            "Backend throttled fetching candidate %s (attempt %d/5) — retrying in %ds",
                            cid, attempt + 1, delay,
                        )
                        await asyncio.sleep(delay)
                    else:
                        logger.warning("Unexpected HTTP %d fetching candidate %s", resp.status_code, cid)
                        return {"candidate_id": cid, "cv_text": "", "experience_years": None}
                except Exception as e:
                    logger.warning("Failed to fetch candidate %s: %s", cid, e)
                    return {"candidate_id": cid, "cv_text": "", "experience_years": None}
            logger.error("Candidate %s: backend kept returning 429 after 5 retries — scoring with empty CV", cid)
            return {"candidate_id": cid, "cv_text": "", "experience_years": None}

    async with httpx.AsyncClient(timeout=60.0) as client:
        return list(await asyncio.gather(*[fetch_one(client, cid) for cid in candidate_ids]))


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


async def run_filter(req) -> None:
    """
    Background task: fetch candidates, apply deterministic filter, LLM score, callback.
    """
    callback_url = f"{settings.backend_url}/callback/filter/{req.filter_job_id}"
    try:
        # 1. Fetch candidate CV data from backend
        candidates_data = await _fetch_candidates(req.candidate_ids)

        # 2. Deterministic filter (experience + age if provided)
        filtered = apply_deterministic_filter(
            candidates_data,
            min_experience=req.min_experience,
            min_age=req.min_age,
            max_age=req.max_age,
        )

        if not filtered:
            await _send_callback(callback_url, "DONE", [])
            return

        # 3. LLM scoring with full job context
        scoring_input = [
            {
                "candidate_id": c["candidate_id"],
                "cv_text": c.get("cv_text", ""),
                "experience_years": c.get("experience_years"),
            }
            for c in filtered
        ]
        results = await score_multiple_candidates(
            scoring_input,
            req.job_description,
            req.requirements,
            extracted_job_data=req.extracted_job_data,
            free_filter_prompt=req.free_filter_prompt,
            min_experience=req.min_experience,
        )

        successful = [r for r in results if not r.get("_failed")]
        failed    = [r for r in results if r.get("_failed")]

        error_msg = None
        if failed:
            error_msg = (
                f"Évaluation IA temporairement indisponible pour {len(failed)} candidat(s) "
                f"(service surchargé). Relancez le scoring pour les évaluer."
            )

        await _send_callback(callback_url, "DONE", successful, error_message=error_msg)

    except Exception as e:
        logger.error("Filter job %s failed: %s", req.filter_job_id, e)
        await _send_callback(callback_url, "FAILED", [], error_message=str(e))
