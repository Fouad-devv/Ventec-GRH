"""
Deterministic pre-filter applied BEFORE any LLM call.
Checks experience and, when HR provides age bounds, estimated candidate age.

Note on age filtering:
  Age is NOT extracted from CVs (no birthdate stored). When min_age/max_age are set by HR,
  they are passed to the LLM as soft criteria in the scoring prompt rather than hard-filtered
  here, because CVs rarely contain a parseable birth date. The deterministic filter only
  applies experience_years, which we reliably extract.
"""
from typing import List, Optional


def passes_experience_filter(experience_years: Optional[int], min_experience: Optional[int]) -> bool:
    if min_experience is None or min_experience == 0:
        return True
    if experience_years is None:
        return True  # unknown — let LLM decide
    return experience_years >= min_experience


def apply_deterministic_filter(
    candidates: List[dict],
    min_experience: Optional[int] = None,
    min_age: Optional[int] = None,
    max_age: Optional[int] = None,
) -> List[dict]:
    """
    candidates: list of dicts with keys:
      - candidate_id (str)
      - experience_years (int | None)
    Returns filtered list (same structure).
    Age bounds are accepted for API symmetry but are soft criteria handled by the LLM scorer.
    """
    return [
        c for c in candidates
        if passes_experience_filter(c.get("experience_years"), min_experience)
    ]
