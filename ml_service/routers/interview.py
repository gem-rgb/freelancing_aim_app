"""
Interview Question Generation — Adaptive AI-ready questioning engine.

Generates context-aware interview questions based on:
- Resume content and extracted skills
- Claimed experience level
- Role requirements
- Candidate weaknesses (missing skills)
- Question difficulty scaling
"""
import random
import logging
from fastapi import APIRouter
from pydantic import BaseModel

logger = logging.getLogger("aim_ml.interview")
router = APIRouter()


# ── Schemas ──

class InterviewRequest(BaseModel):
    candidate_skills: list[str] = []
    candidate_experience: list[dict] = []
    candidate_education: list[dict] = []
    missing_skills: list[str] = []
    overall_score: float = 50.0
    target_role: str = "manager"
    num_questions: int = 8
    difficulty_level: int = 5  # 1-10


class GeneratedQuestion(BaseModel):
    question_text: str
    question_type: str
    difficulty: int
    context: str
    expected_topics: list[str]
    generated_by: str = "rules_engine_v1"


class InterviewPlan(BaseModel):
    questions: list[GeneratedQuestion]
    total_questions: int
    difficulty_distribution: dict
    coverage: dict


# ── Question Templates ──

QUESTION_BANK = {
    "technical": [
        {
            "template": "Explain how you would detect a {scam_type} scam on a digital marketplace. What signals would you look for?",
            "params": {"scam_type": ["phishing", "advance-fee", "identity theft", "pyramid scheme", "fake product"]},
            "expected_topics": ["pattern recognition", "red flags", "evidence collection"],
            "min_difficulty": 3,
        },
        {
            "template": "A seller has uploaded content that appears similar to an existing listing. Walk me through how you would verify if this is a legitimate product or a reupload.",
            "params": {},
            "expected_topics": ["fingerprinting", "metadata analysis", "ownership verification"],
            "min_difficulty": 5,
        },
        {
            "template": "Describe how you would analyze encrypted data chunks for fraud indicators without having access to the complete dataset.",
            "params": {},
            "expected_topics": ["partial verification", "statistical analysis", "pattern detection"],
            "min_difficulty": 7,
        },
        {
            "template": "How would you use {method} to improve fraud detection accuracy in a marketplace verification system?",
            "params": {"method": ["machine learning", "behavioral analysis", "network graph analysis", "anomaly detection"]},
            "expected_topics": ["methodology", "implementation", "accuracy measurement"],
            "min_difficulty": 6,
        },
    ],
    "behavioral": [
        {
            "template": "Tell me about a time you had to make a difficult decision with incomplete information. How did you handle the ambiguity?",
            "params": {},
            "expected_topics": ["decision making", "risk assessment", "outcome reflection"],
            "min_difficulty": 3,
        },
        {
            "template": "Describe a situation where you disagreed with a colleague's assessment. How did you resolve the conflict while maintaining the working relationship?",
            "params": {},
            "expected_topics": ["conflict resolution", "communication", "compromise"],
            "min_difficulty": 4,
        },
        {
            "template": "How do you prioritize tasks when you have multiple urgent assignments with competing deadlines?",
            "params": {},
            "expected_topics": ["time management", "prioritization framework", "communication"],
            "min_difficulty": 2,
        },
    ],
    "ethical": [
        {
            "template": "A highly-rated seller with many successful transactions is flagged for a minor policy violation. A new seller with the same violation was immediately suspended. How would you handle this inconsistency?",
            "params": {},
            "expected_topics": ["fairness", "consistency", "policy enforcement"],
            "min_difficulty": 5,
        },
        {
            "template": "You discover that a colleague manager has been approving listings without proper verification to boost their completion metrics. What do you do?",
            "params": {},
            "expected_topics": ["integrity", "escalation", "documentation"],
            "min_difficulty": 6,
        },
    ],
    "scam_detection": [
        {
            "template": "SCENARIO: A user reports that a seller is charging ₦50,000 for 'guaranteed forex signals' with screenshots showing 500% returns. The seller has 4.8/5 rating from 23 reviews. All reviews were posted within the last 2 weeks. Analyze this situation.",
            "params": {},
            "expected_topics": ["review manipulation", "unrealistic claims", "temporal patterns", "social proof fraud"],
            "min_difficulty": 6,
        },
        {
            "template": "SCENARIO: Two different sellers upload information products with near-identical descriptions but different titles and pricing. Seller A joined 6 months ago; Seller B joined yesterday. What is your assessment and recommended action?",
            "params": {},
            "expected_topics": ["duplicate detection", "account age analysis", "middleman identification"],
            "min_difficulty": 5,
        },
    ],
    "security_reasoning": [
        {
            "template": "How would you design a verification process that prevents any single manager from accessing enough information to reconstruct the complete product being verified?",
            "params": {},
            "expected_topics": ["data segmentation", "need-to-know", "chunk isolation", "consensus mechanism"],
            "min_difficulty": 8,
        },
        {
            "template": "What are the key security considerations when implementing an escrow system that holds 40% of seller earnings?",
            "params": {},
            "expected_topics": ["fund security", "release conditions", "dispute handling", "audit trails"],
            "min_difficulty": 6,
        },
    ],
    "moderation_sim": [
        {
            "template": "SIMULATION: You are reviewing chunk 3 of 5 from a listing titled 'Advanced Social Media Growth'. Your chunk contains instructions that could be interpreted as either legitimate marketing tactics or manipulation techniques. The previous 2 chunk reviewers marked it 'clean'. How do you proceed?",
            "params": {},
            "expected_topics": ["independent judgment", "context analysis", "escalation criteria", "consensus vs independence"],
            "min_difficulty": 7,
        },
    ],
}


def generate_question_from_template(template_entry: dict, difficulty: int) -> GeneratedQuestion:
    """Generate a concrete question from a template with parameter substitution."""
    template = template_entry["template"]
    params = template_entry.get("params", {})

    # Substitute parameters
    for param_name, options in params.items():
        template = template.replace(f"{{{param_name}}}", random.choice(options))

    # Determine question type from the bank key
    q_type = "technical"
    for qt, questions in QUESTION_BANK.items():
        if template_entry in questions:
            q_type = qt
            break

    return GeneratedQuestion(
        question_text=template,
        question_type=q_type,
        difficulty=max(template_entry.get("min_difficulty", difficulty), difficulty),
        context="",
        expected_topics=template_entry.get("expected_topics", []),
        generated_by="rules_engine_v1",
    )


def generate_weakness_questions(missing_skills: list[str], difficulty: int) -> list[GeneratedQuestion]:
    """Generate probing questions about candidate's missing skills."""
    questions = []
    for skill in missing_skills[:3]:
        q = GeneratedQuestion(
            question_text=f"Your resume doesn't mention experience with {skill}. Can you describe any related experience or how you would approach developing this competency?",
            question_type="technical",
            difficulty=max(3, difficulty - 1),
            context=f"Probing missing skill: {skill}",
            expected_topics=[skill, "learning ability", "transferable skills"],
            generated_by="weakness_targeting_v1",
        )
        questions.append(q)
    return questions


@router.post("/generate", response_model=InterviewPlan)
async def generate_interview(request: InterviewRequest):
    """Generate a complete adaptive interview question set."""
    questions: list[GeneratedQuestion] = []
    difficulty = request.difficulty_level

    # Adaptive difficulty based on overall score
    if request.overall_score > 80:
        difficulty = min(difficulty + 2, 10)
    elif request.overall_score < 40:
        difficulty = max(difficulty - 2, 1)

    # Question type distribution
    num_q = request.num_questions
    distribution = {
        "technical": max(2, num_q // 3),
        "behavioral": max(1, num_q // 5),
        "ethical": 1,
        "scam_detection": max(1, num_q // 4),
        "security_reasoning": 1,
        "moderation_sim": 1 if num_q >= 6 else 0,
    }

    # Ensure total matches request
    total_planned = sum(distribution.values())
    if total_planned > num_q:
        # Trim from largest category
        excess = total_planned - num_q
        for key in sorted(distribution, key=lambda k: distribution[k], reverse=True):
            reduction = min(distribution[key] - 1, excess)
            distribution[key] -= reduction
            excess -= reduction
            if excess <= 0:
                break

    # Generate from each category
    for q_type, count in distribution.items():
        pool = QUESTION_BANK.get(q_type, [])
        if not pool:
            continue
        selected = random.sample(pool, min(count, len(pool)))
        for template in selected:
            questions.append(generate_question_from_template(template, difficulty))

    # Add weakness-targeting questions
    if request.missing_skills:
        weakness_qs = generate_weakness_questions(request.missing_skills, difficulty)
        questions.extend(weakness_qs[:2])

    # Shuffle and number
    random.shuffle(questions)
    questions = questions[:request.num_questions]

    actual_distribution = {}
    for q in questions:
        actual_distribution[q.question_type] = actual_distribution.get(q.question_type, 0) + 1

    coverage = {
        "skills_covered": len(set(t for q in questions for t in q.expected_topics)),
        "weakness_questions": sum(1 for q in questions if q.generated_by == "weakness_targeting_v1"),
        "avg_difficulty": sum(q.difficulty for q in questions) / max(len(questions), 1),
    }

    logger.info(f"Generated {len(questions)} questions, avg difficulty {coverage['avg_difficulty']:.1f}")

    return InterviewPlan(
        questions=questions,
        total_questions=len(questions),
        difficulty_distribution=actual_distribution,
        coverage=coverage,
    )
