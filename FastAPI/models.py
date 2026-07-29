from pydantic import BaseModel
from typing import Optional, List


class FilterRequest(BaseModel):
    filter_job_id: str
    job_posting_id: str
    job_description: str
    requirements: str
    candidate_ids: List[str]


class FilterResultEntry(BaseModel):
    candidate_id: str
    score: float          # 0-100
    summary: str


class FilterCallbackPayload(BaseModel):
    status: str           # DONE | FAILED
    result: Optional[List[FilterResultEntry]] = None
    error_message: Optional[str] = None


class ExtractCvRequest(BaseModel):
    text: str


class ExtractCvResponse(BaseModel):
    skills: List[str]
    experience_years: Optional[int]
    education: Optional[str]
    current_position: Optional[str]
    location: Optional[str]


# ── Generate job description ────────────────────────────────
class GenerateDescriptionRequest(BaseModel):
    title: str
    department: Optional[str] = None
    contract_type: Optional[str] = None
    location: Optional[str] = None
    min_experience: Optional[int] = None


class GenerateDescriptionResponse(BaseModel):
    description: str
    requirements: str


# ── Generate interview questions ────────────────────────────
class GenerateInterviewQuestionsRequest(BaseModel):
    job_title: str
    job_description: Optional[str] = None
    requirements: Optional[str] = None
    candidate_skills: Optional[str] = None
    candidate_position: Optional[str] = None
    candidate_experience_years: Optional[int] = None


class GenerateInterviewQuestionsResponse(BaseModel):
    questions: List[str]


# ── Generate document checklist ─────────────────────────────
class GenerateChecklistRequest(BaseModel):
    job_title: str
    contract_type: Optional[str] = None
    department: Optional[str] = None


class GenerateChecklistResponse(BaseModel):
    documents: List[str]
