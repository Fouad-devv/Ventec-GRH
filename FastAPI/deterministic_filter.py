"""
Deterministic pre-filter applied BEFORE any LLM call.
Only experience_years and contract_type are used — age and sex NEVER reach the LLM.

This module receives candidate data from the backend. The backend sends only
safe fields (no name, no age, no gender). The deterministic filter checks:
  1. Minimum experience requirement
  2. Availability (placeholder — always True if not provided)

Returns: list of candidate_ids that pass the filter.
"""
from typing import List, Optional


def passes_experience_filter(experience_years: Optional[int], min_experience: Optional[int]) -> bool:
    if min_experience is None or min_experience == 0:
        return True
    if experience_years is None:
        return True  # unknown experience — let LLM decide
    return experience_years >= min_experience


def apply_deterministic_filter(
    candidates: List[dict],
    min_experience: Optional[int] = None,
) -> List[dict]:
    """
    candidates: list of dicts with keys:
      - candidate_id (str)
      - experience_years (int | None)
    Returns filtered list (same structure).
    """
    return [
        c for c in candidates
        if passes_experience_filter(c.get("experience_years"), min_experience)
    ]
