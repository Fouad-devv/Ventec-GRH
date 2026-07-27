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
