"""
Shared parsing and validation helpers.
"""
import json
import re

from fastapi import HTTPException

from app.core.clients import _gemini_client, _groq_client, _sambanova_client

_JSON_BLOCK_RE = re.compile(r'\{[\s\S]*\}')
_EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')


def _clean_email(value) -> str | None:
    """Return value only if it is a valid email — reject URLs, LinkedIn links, etc."""
    if not value or not isinstance(value, str):
        return None
    value = value.strip()
    if _EMAIL_RE.match(value):
        return value
    return None


def _fix_json_newlines(s: str) -> str:
    """
    Fix bare (unescaped) newlines inside JSON string values.
    LLMs occasionally emit literal newlines in strings even in json_object mode,
    which is invalid JSON. This walks the string character-by-character so it
    only touches newlines that are actually inside a quoted value.
    """
    result = []
    in_string = False
    escape_next = False
    for ch in s:
        if escape_next:
            result.append(ch)
            escape_next = False
            continue
        if ch == '\\' and in_string:
            escape_next = True
            result.append(ch)
            continue
        if ch == '"':
            in_string = not in_string
            result.append(ch)
            continue
        if in_string and ch == '\n':
            result.append('\\n')
            continue
        if in_string and ch == '\r':
            result.append('\\r')
            continue
        result.append(ch)
    return ''.join(result)


def _parse_cv_json(raw: str) -> dict:
    """Parse JSON from an LLM response, with markdown-fence fallback."""
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        m = _JSON_BLOCK_RE.search(raw)
        if m:
            return json.loads(m.group())
        raise


def safe_json_loads(raw: str) -> dict:
    """
    Robust JSON parser for LLM output. Tries three strategies in order:
      1. Direct json.loads
      2. Fix bare newlines inside string values, then parse
      3. Extract the outermost {} block with regex, then parse (handles markdown fences)
    Raises JSONDecodeError only when all three strategies fail.
    """
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass
    try:
        return json.loads(_fix_json_newlines(raw))
    except json.JSONDecodeError:
        pass
    m = _JSON_BLOCK_RE.search(raw)
    if m:
        try:
            return json.loads(m.group())
        except json.JSONDecodeError:
            try:
                return json.loads(_fix_json_newlines(m.group()))
            except json.JSONDecodeError:
                pass
    raise json.JSONDecodeError("Could not parse LLM JSON output after all repair attempts", raw, 0)


def _build_cv_result(data: dict) -> dict:
    """Normalise raw LLM extraction dict into a clean structured result."""
    skills = data.get("skills", [])
    if isinstance(skills, str):
        skills = [s.strip() for s in skills.split(",") if s.strip()]
    return {
        "first_name": data.get("first_name"),
        "last_name": data.get("last_name"),
        "email": _clean_email(data.get("email")),
        "phone": data.get("phone"),
        "skills": skills[:15],
        "experience_years": data.get("experience_years"),
        "education": data.get("education"),
        "current_position": data.get("current_position"),
        "location": data.get("location"),
    }


def _is_transient_error(e: Exception) -> bool:
    """
    Returns True for errors worth retrying: rate-limits, 5xx, connection/timeout.
    Returns False for permanent errors (401, 400) that retrying won't fix.
    """
    e_str = str(e)
    msg = e_str.lower()
    if "429" in e_str or "rate_limit" in msg or "too many requests" in msg or "rate limit" in msg:
        return True
    if "500" in e_str or "502" in e_str or "503" in e_str:
        return True
    if "internal server error" in msg or "bad gateway" in msg or "service unavailable" in msg:
        return True
    if "connection" in msg or "timeout" in msg or "timed out" in msg or "network" in msg:
        return True
    cls = type(e).__name__.lower()
    if "connection" in cls or "timeout" in cls or "server" in cls:
        return True
    return False


def _require_any():
    """Return the first available LLM client across all providers."""
    if _gemini_client:
        return _gemini_client
    if _groq_client:
        return _groq_client
    if _sambanova_client:
        return _sambanova_client
    raise HTTPException(status_code=503, detail="No LLM provider configured")
