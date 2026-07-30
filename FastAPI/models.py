from pydantic import BaseModel
from typing import Optional, List


class FilterRequest(BaseModel):
    filter_job_id: str
    job_posting_id: str
    job_description: str
    requirements: str
    candidate_ids: List[str]
    min_age: Optional[int] = None
    max_age: Optional[int] = None
    free_filter_prompt: Optional[str] = None
    extracted_job_data: Optional[str] = None  # JSON string with structured job requirements


# ── Extract job posting from document ──────────────────────
class ExtractJobPostingResponse(BaseModel):
    required_skills: List[str] = []
    tools: List[str] = []
    required_education: Optional[str] = None
    required_experience: Optional[str] = None
    missions: List[str] = []
    nice_to_have: List[str] = []
    description: Optional[str] = None
    requirements: Optional[str] = None


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


class QuestionItem(BaseModel):
    question: str
    answer: Optional[str] = None


class GenerateInterviewQuestionsResponse(BaseModel):
    questions: List[QuestionItem]


# ── Generate document checklist ─────────────────────────────
class ChecklistItem(BaseModel):
    name: str
    copies: int = 1
    observation: str = ""


class GenerateChecklistRequest(BaseModel):
    job_title: str
    contract_type: Optional[str] = None
    department: Optional[str] = None
    candidate_name: Optional[str] = None


class GenerateChecklistResponse(BaseModel):
    documents: List[ChecklistItem]


# ── Generate fiche de fonction (job function sheet) ─────────
class CompetenceCritere(BaseModel):
    label: str
    poids: int = 5


class GenerateFicheFonctionRequest(BaseModel):
    title: str
    department: Optional[str] = None
    contract_type: Optional[str] = None
    filiale: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[str] = None


class GenerateFicheFonctionResponse(BaseModel):
    missions: List[str]
    activites_principales: List[str]
    indicateurs_performance: List[str]
    niveau_formation: str
    experience_requise: str
    competences_techniques: List[CompetenceCritere]
    interlocuteurs_internes: List[str]
    interlocuteurs_externes: List[str]
