"""
Resume Processing Pipeline — NLP extraction, scoring, vectorization.

Pipeline:
1. Raw text extraction (PDF/DOCX/TXT)
2. spaCy NER for entities (skills, orgs, dates)
3. Section detection (education, experience, certs)
4. Skill extraction with taxonomy matching
5. Candidate embedding via sentence-transformers
6. Qualification scoring against role requirements
"""
import io
import re
import logging
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel

logger = logging.getLogger("aim_ml.resume")
router = APIRouter()


# ── Schemas ──

class ResumeTextRequest(BaseModel):
    raw_text: str
    target_role: str = "manager"


class ExtractionResult(BaseModel):
    skills: list[str]
    education: list[dict]
    experience: list[dict]
    certifications: list[str]
    contact_info: dict
    summary: str


class QualificationScore(BaseModel):
    overall_score: float
    qualification_score: float
    experience_score: float
    risk_score: float
    skill_match_details: list[dict]
    missing_skills: list[str]
    candidate_vector: list[float]


class ResumeResponse(BaseModel):
    extraction: ExtractionResult
    scoring: QualificationScore


# ── Skill taxonomy for manager role ──
MANAGER_REQUIRED_SKILLS = {
    "core": [
        "fraud detection", "scam analysis", "content moderation",
        "verification", "risk assessment", "security analysis",
        "digital forensics", "compliance",
    ],
    "technical": [
        "data analysis", "python", "sql", "machine learning",
        "cybersecurity", "blockchain", "crypto", "osint",
    ],
    "soft": [
        "leadership", "communication", "critical thinking",
        "problem solving", "team management", "decision making",
    ],
}


# ── Text extraction ──

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from PDF using PyPDF2 with pdfplumber fallback."""
    text = ""
    try:
        from PyPDF2 import PdfReader
        reader = PdfReader(io.BytesIO(file_bytes))
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    except Exception:
        pass

    if len(text.strip()) < 50:
        try:
            import pdfplumber
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
        except Exception:
            pass

    return text.strip()


def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract text from DOCX."""
    from docx import Document
    doc = Document(io.BytesIO(file_bytes))
    return "\n".join(p.text for p in doc.paragraphs if p.text.strip())


# ── NLP extraction engine ──

def extract_entities_spacy(text: str, nlp) -> dict:
    """Use spaCy NER to extract named entities."""
    doc = nlp(text[:100000])  # Limit for performance
    entities = {
        "persons": [], "organizations": [], "dates": [],
        "locations": [], "skills_raw": [],
    }
    for ent in doc.ents:
        if ent.label_ == "PERSON":
            entities["persons"].append(ent.text)
        elif ent.label_ == "ORG":
            entities["organizations"].append(ent.text)
        elif ent.label_ in ("DATE", "TIME"):
            entities["dates"].append(ent.text)
        elif ent.label_ in ("GPE", "LOC"):
            entities["locations"].append(ent.text)
    return entities


def detect_sections(text: str) -> dict:
    """Detect resume sections via regex pattern matching."""
    section_patterns = {
        "education": r"(?i)(education|academic|qualification|degree|university|college)",
        "experience": r"(?i)(experience|employment|work\s*history|professional|career)",
        "skills": r"(?i)(skill|competenc|technical|proficienc|expertise)",
        "certifications": r"(?i)(certif|license|accredit|credential)",
        "summary": r"(?i)(summary|objective|profile|about)",
    }
    lines = text.split("\n")
    sections = {k: [] for k in section_patterns}
    current_section = "summary"

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        for section_name, pattern in section_patterns.items():
            if re.search(pattern, stripped) and len(stripped) < 60:
                current_section = section_name
                break
        if current_section in sections:
            sections[current_section].append(stripped)

    return {k: "\n".join(v) for k, v in sections.items()}


def extract_skills(text: str, nlp=None) -> list[str]:
    """Extract skills using taxonomy matching + NLP."""
    text_lower = text.lower()
    found_skills = set()

    # Taxonomy matching
    all_skills = (
        MANAGER_REQUIRED_SKILLS["core"]
        + MANAGER_REQUIRED_SKILLS["technical"]
        + MANAGER_REQUIRED_SKILLS["soft"]
    )
    for skill in all_skills:
        if skill.lower() in text_lower:
            found_skills.add(skill)

    # Extended skill patterns
    skill_patterns = [
        r"(?i)\b(python|java|javascript|sql|nosql|mongodb|postgresql)\b",
        r"(?i)\b(machine learning|deep learning|nlp|computer vision)\b",
        r"(?i)\b(aws|gcp|azure|docker|kubernetes)\b",
        r"(?i)\b(agile|scrum|kanban|project management)\b",
        r"(?i)\b(osint|threat intelligence|penetration testing)\b",
    ]
    for pattern in skill_patterns:
        matches = re.findall(pattern, text)
        found_skills.update(m.lower() if isinstance(m, str) else m[0].lower() for m in matches)

    return sorted(found_skills)


def extract_education(section_text: str) -> list[dict]:
    """Extract education entries."""
    entries = []
    lines = section_text.split("\n")
    degree_patterns = r"(?i)(bachelor|master|phd|doctorate|diploma|associate|b\.?s\.?|m\.?s\.?|b\.?a\.?|m\.?a\.?|mba)"

    current_entry = {}
    for line in lines:
        if re.search(degree_patterns, line):
            if current_entry:
                entries.append(current_entry)
            current_entry = {"degree": line.strip(), "institution": "", "year": ""}
        elif current_entry:
            year_match = re.search(r"(19|20)\d{2}", line)
            if year_match:
                current_entry["year"] = year_match.group()
            elif not current_entry["institution"]:
                current_entry["institution"] = line.strip()

    if current_entry:
        entries.append(current_entry)
    return entries


def extract_experience(section_text: str) -> list[dict]:
    """Extract work experience entries."""
    entries = []
    lines = section_text.split("\n")

    current_entry = {}
    for line in lines:
        date_match = re.search(r"(19|20)\d{2}\s*[-–]\s*(present|(19|20)\d{2})", line, re.IGNORECASE)
        if date_match:
            if current_entry:
                entries.append(current_entry)
            current_entry = {"title": line.strip(), "duration": date_match.group(), "description": ""}
        elif current_entry:
            current_entry["description"] += " " + line.strip()

    if current_entry:
        entries.append(current_entry)
    return entries


def score_candidate(skills: list[str], education: list, experience: list, target_role: str = "manager") -> QualificationScore:
    """Score candidate against role requirements."""
    # Skill matching
    required = MANAGER_REQUIRED_SKILLS
    all_required = required["core"] + required["technical"] + required["soft"]
    matched = [s for s in skills if s.lower() in [r.lower() for r in all_required]]
    missing = [s for s in all_required if s.lower() not in [sk.lower() for sk in skills]]

    skill_score = (len(matched) / max(len(all_required), 1)) * 100

    # Education scoring
    edu_score = 0
    for edu in education:
        degree = edu.get("degree", "").lower()
        if any(d in degree for d in ["phd", "doctorate"]):
            edu_score = max(edu_score, 100)
        elif any(d in degree for d in ["master", "m.s", "m.a", "mba"]):
            edu_score = max(edu_score, 80)
        elif any(d in degree for d in ["bachelor", "b.s", "b.a"]):
            edu_score = max(edu_score, 60)
        else:
            edu_score = max(edu_score, 30)

    # Experience scoring
    exp_score = min(len(experience) * 20, 100)

    # Core skill weighting
    core_matched = [s for s in matched if s.lower() in [c.lower() for c in required["core"]]]
    core_ratio = len(core_matched) / max(len(required["core"]), 1)

    # Risk scoring (higher = more risk)
    risk = 0
    if len(skills) < 3:
        risk += 30
    if len(education) == 0:
        risk += 20
    if len(experience) == 0:
        risk += 25
    if core_ratio < 0.2:
        risk += 25

    # Overall composite
    overall = (skill_score * 0.40) + (edu_score * 0.20) + (exp_score * 0.25) + (core_ratio * 100 * 0.15)

    return QualificationScore(
        overall_score=round(min(overall, 100), 2),
        qualification_score=round(skill_score, 2),
        experience_score=round(exp_score, 2),
        risk_score=round(min(risk, 100), 2),
        skill_match_details=[
            {"skill": s, "matched": s.lower() in [sk.lower() for sk in skills], "category": "core" if s in required["core"] else "technical" if s in required["technical"] else "soft"}
            for s in all_required
        ],
        missing_skills=missing[:15],
        candidate_vector=[],  # Populated by embedding step
    )


# ── Endpoints ──

@router.post("/parse", response_model=ResumeResponse)
async def parse_resume(file: UploadFile = File(...), target_role: str = Form("manager")):
    """
    Full resume processing pipeline:
    1. Text extraction → 2. NLP entity extraction → 3. Section parsing →
    4. Skill extraction → 5. Scoring → 6. Vectorization
    """
    content = await file.read()

    # Step 1: Extract text
    if file.filename.endswith(".pdf"):
        raw_text = extract_text_from_pdf(content)
    elif file.filename.endswith(".docx"):
        raw_text = extract_text_from_docx(content)
    else:
        raw_text = content.decode("utf-8", errors="ignore")

    if len(raw_text.strip()) < 20:
        raise HTTPException(400, "Could not extract text from resume")

    # Step 2: NLP extraction
    from main import models
    nlp = models.get("nlp")
    entities = extract_entities_spacy(raw_text, nlp) if nlp else {}

    # Step 3: Section detection
    sections = detect_sections(raw_text)

    # Step 4: Skill extraction
    skills = extract_skills(raw_text, nlp)

    # Step 5: Education & experience
    education = extract_education(sections.get("education", ""))
    experience = extract_experience(sections.get("experience", ""))
    certs_text = sections.get("certifications", "")
    certifications = [line.strip() for line in certs_text.split("\n") if line.strip() and len(line.strip()) > 3]

    # Step 6: Scoring
    scoring = score_candidate(skills, education, experience, target_role)

    # Step 7: Vectorization
    embedder = models.get("embedder")
    if embedder:
        try:
            vector = embedder.encode(raw_text[:2000]).tolist()
            scoring.candidate_vector = vector
        except Exception as e:
            logger.warning(f"Embedding failed: {e}")

    extraction = ExtractionResult(
        skills=skills,
        education=education,
        experience=experience,
        certifications=certifications,
        contact_info={
            "emails": re.findall(r"[\w.+-]+@[\w-]+\.[\w.]+", raw_text),
            "phones": re.findall(r"[\+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{7,15}", raw_text),
            "locations": entities.get("locations", []),
        },
        summary=sections.get("summary", "")[:500],
    )

    logger.info(f"Resume parsed: {len(skills)} skills, score={scoring.overall_score}")
    return ResumeResponse(extraction=extraction, scoring=scoring)


@router.post("/parse-text", response_model=ResumeResponse)
async def parse_resume_text(request: ResumeTextRequest):
    """Parse resume from raw text (for pre-extracted content)."""
    raw_text = request.raw_text
    from main import models
    nlp = models.get("nlp")

    sections = detect_sections(raw_text)
    skills = extract_skills(raw_text, nlp)
    education = extract_education(sections.get("education", ""))
    experience = extract_experience(sections.get("experience", ""))
    certs_text = sections.get("certifications", "")
    certifications = [line.strip() for line in certs_text.split("\n") if line.strip() and len(line.strip()) > 3]
    scoring = score_candidate(skills, education, experience, request.target_role)

    embedder = models.get("embedder")
    if embedder:
        try:
            scoring.candidate_vector = embedder.encode(raw_text[:2000]).tolist()
        except Exception:
            pass

    return ResumeResponse(
        extraction=ExtractionResult(
            skills=skills, education=education, experience=experience,
            certifications=certifications,
            contact_info={"emails": re.findall(r"[\w.+-]+@[\w-]+\.[\w.]+", raw_text)},
            summary=sections.get("summary", "")[:500],
        ),
        scoring=scoring,
    )


@router.post("/similarity")
async def candidate_similarity(vector_a: list[float], vector_b: list[float]):
    """Compute cosine similarity between two candidate vectors."""
    import numpy as np
    a, b = np.array(vector_a), np.array(vector_b)
    if np.linalg.norm(a) == 0 or np.linalg.norm(b) == 0:
        return {"similarity": 0.0}
    similarity = float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))
    return {"similarity": round(similarity, 4)}
