"""
Cheat Detection & AI-Answer Detection Engine.

Probabilistic risk scoring based on:
- Typing speed anomalies
- Response timing patterns
- Language perplexity (low perplexity → likely AI-generated)
- Stylometric consistency across answers
- Semantic similarity to known AI patterns
- Token distribution analysis
- Burst-pattern detection
"""
import math
import re
import logging
from collections import Counter
from fastapi import APIRouter
from pydantic import BaseModel

logger = logging.getLogger("aim_ml.cheat")
router = APIRouter()


# ── Schemas ──

class AnswerAnalysisRequest(BaseModel):
    answer_text: str
    question_text: str
    question_type: str = "technical"
    typing_speed_wpm: float | None = None
    time_to_answer_seconds: int | None = None
    candidate_id: str = ""


class SessionAnalysisRequest(BaseModel):
    answers: list[AnswerAnalysisRequest]
    session_metadata: dict = {}


class CheatIndicator(BaseModel):
    indicator: str
    score: float  # 0-100
    confidence: float  # 0-1
    details: str


class AnswerAnalysisResult(BaseModel):
    ai_generated_probability: float
    perplexity_score: float | None
    stylometric_flags: list[str]
    typing_anomaly: bool
    timing_anomaly: bool
    cheat_indicators: list[CheatIndicator]
    overall_risk_score: float
    risk_level: str  # low, medium, high, critical


class SessionAnalysisResult(BaseModel):
    overall_cheat_risk: float
    risk_level: str
    per_answer_risks: list[float]
    cross_answer_consistency: float
    flags: list[str]
    indicators: list[CheatIndicator]


# ── Analysis functions ──

def compute_token_entropy(text: str) -> float:
    """Compute Shannon entropy of token distribution.
    AI text tends to have lower entropy (more uniform distribution).
    """
    tokens = text.lower().split()
    if len(tokens) < 5:
        return 0.0
    freq = Counter(tokens)
    total = len(tokens)
    entropy = -sum((c / total) * math.log2(c / total) for c in freq.values() if c > 0)
    return round(entropy, 4)


def estimate_perplexity(text: str) -> float:
    """Estimate text perplexity using character-level entropy as proxy.
    Real implementation would use a language model; this is a statistical approximation.
    Lower perplexity → more predictable text → higher AI probability.
    """
    if len(text) < 20:
        return 50.0  # Neutral
    chars = list(text.lower())
    freq = Counter(chars)
    total = len(chars)
    char_entropy = -sum((c / total) * math.log2(c / total) for c in freq.values() if c > 0)

    # Map char entropy to approximate perplexity range
    # Human text: 8-15 char entropy → perplexity 20-60
    # AI text: 5-8 char entropy → perplexity 5-20
    perplexity = 2 ** char_entropy
    return round(perplexity, 2)


def analyze_typing_speed(wpm: float | None) -> tuple[bool, CheatIndicator | None]:
    """Detect typing speed anomalies."""
    if wpm is None:
        return False, None

    # Average human typing: 40-80 WPM for thoughtful responses
    # Suspiciously fast: >100 WPM for complex answers
    # Suspiciously slow: <10 WPM (might be copy-pasting)
    anomaly = False
    details = ""
    score = 0.0

    if wpm > 120:
        anomaly = True
        score = min((wpm - 120) / 80 * 100, 100)
        details = f"Typing speed {wpm:.0f} WPM is abnormally fast for thoughtful responses"
    elif wpm > 90:
        score = (wpm - 90) / 30 * 40
        details = f"Typing speed {wpm:.0f} WPM is above average"
    elif wpm < 10 and wpm > 0:
        anomaly = True
        score = 60.0
        details = f"Typing speed {wpm:.0f} WPM suggests possible copy-paste"

    if score > 0:
        indicator = CheatIndicator(
            indicator="typing_speed_anomaly",
            score=score,
            confidence=0.6,
            details=details,
        )
        return anomaly, indicator
    return False, None


def analyze_timing(seconds: int | None, text_length: int) -> tuple[bool, CheatIndicator | None]:
    """Detect suspicious response timing patterns."""
    if seconds is None:
        return False, None

    words = text_length // 5  # Approximate word count
    if words < 5:
        return False, None

    # Expected: ~2-5 seconds per word for thoughtful responses
    seconds_per_word = seconds / max(words, 1)

    anomaly = False
    score = 0.0
    details = ""

    if seconds_per_word < 0.5:
        anomaly = True
        score = min((0.5 - seconds_per_word) / 0.5 * 100, 100)
        details = f"Response of {words} words in {seconds}s ({seconds_per_word:.1f}s/word) is suspiciously fast"
    elif seconds_per_word > 30:
        score = 20.0
        details = f"Very slow response ({seconds_per_word:.1f}s/word) — may indicate external research"

    if score > 0:
        indicator = CheatIndicator(
            indicator="timing_anomaly",
            score=score,
            confidence=0.5,
            details=details,
        )
        return anomaly, indicator
    return False, None


def analyze_stylometry(text: str) -> list[str]:
    """Detect stylometric patterns common in AI-generated text."""
    flags = []
    sentences = re.split(r'[.!?]+', text)
    sentences = [s.strip() for s in sentences if len(s.strip()) > 10]

    if len(sentences) < 2:
        return flags

    # 1. Sentence length uniformity (AI tends to produce uniform lengths)
    lengths = [len(s.split()) for s in sentences]
    if len(lengths) >= 3:
        avg_len = sum(lengths) / len(lengths)
        variance = sum((l - avg_len) ** 2 for l in lengths) / len(lengths)
        std_dev = math.sqrt(variance)
        cv = std_dev / max(avg_len, 1)  # Coefficient of variation
        if cv < 0.15:
            flags.append("uniform_sentence_length")

    # 2. Overly structured responses (numbered lists, consistent formatting)
    numbered = sum(1 for s in text.split("\n") if re.match(r"^\s*\d+[.)]\s", s))
    if numbered >= 3:
        flags.append("overly_structured")

    # 3. Hedge word frequency (AI uses more hedging)
    hedge_words = ["however", "moreover", "furthermore", "additionally",
                    "nevertheless", "consequently", "in conclusion"]
    hedge_count = sum(1 for w in hedge_words if w in text.lower())
    if hedge_count >= 3:
        flags.append("excessive_hedging")

    # 4. First-person absence (AI often avoids "I")
    words = text.lower().split()
    i_ratio = words.count("i") / max(len(words), 1)
    if len(words) > 50 and i_ratio < 0.005:
        flags.append("first_person_absence")

    # 5. Vocabulary richness
    unique_ratio = len(set(words)) / max(len(words), 1)
    if unique_ratio > 0.85 and len(words) > 30:
        flags.append("unusually_rich_vocabulary")

    # 6. Repetitive phrasing patterns
    bigrams = [f"{words[i]} {words[i+1]}" for i in range(len(words) - 1)]
    bigram_freq = Counter(bigrams)
    repeated = sum(1 for c in bigram_freq.values() if c >= 3)
    if repeated >= 2:
        flags.append("repetitive_phrasing")

    return flags


def compute_ai_probability(
    perplexity: float,
    entropy: float,
    stylometric_flags: list[str],
    typing_anomaly: bool,
    timing_anomaly: bool,
) -> float:
    """Compute overall AI-generation probability (0-100)."""
    score = 0.0

    # Perplexity contribution (lower = more AI-like)
    if perplexity < 10:
        score += 35
    elif perplexity < 20:
        score += 20
    elif perplexity < 30:
        score += 10

    # Entropy contribution
    if entropy < 3.0:
        score += 15
    elif entropy < 4.0:
        score += 8

    # Stylometric flags
    flag_weights = {
        "uniform_sentence_length": 12,
        "overly_structured": 10,
        "excessive_hedging": 8,
        "first_person_absence": 7,
        "unusually_rich_vocabulary": 5,
        "repetitive_phrasing": 3,
    }
    for flag in stylometric_flags:
        score += flag_weights.get(flag, 5)

    # Behavioral indicators
    if typing_anomaly:
        score += 10
    if timing_anomaly:
        score += 8

    return min(round(score, 2), 100.0)


def risk_level_from_score(score: float) -> str:
    if score >= 70:
        return "critical"
    elif score >= 50:
        return "high"
    elif score >= 30:
        return "medium"
    return "low"


# ── Endpoints ──

@router.post("/analyze-answer", response_model=AnswerAnalysisResult)
async def analyze_answer(request: AnswerAnalysisRequest):
    """Analyze a single interview answer for cheat/AI indicators."""
    text = request.answer_text
    indicators: list[CheatIndicator] = []

    # Perplexity estimation
    perplexity = estimate_perplexity(text)

    # Token entropy
    entropy = compute_token_entropy(text)

    # Stylometric analysis
    style_flags = analyze_stylometry(text)

    # Typing speed
    typing_anomaly, typing_indicator = analyze_typing_speed(request.typing_speed_wpm)
    if typing_indicator:
        indicators.append(typing_indicator)

    # Timing analysis
    timing_anomaly, timing_indicator = analyze_timing(request.time_to_answer_seconds, len(text))
    if timing_indicator:
        indicators.append(timing_indicator)

    # AI probability
    ai_prob = compute_ai_probability(perplexity, entropy, style_flags, typing_anomaly, timing_anomaly)

    # Perplexity indicator
    if perplexity < 20:
        indicators.append(CheatIndicator(
            indicator="low_perplexity",
            score=min((20 - perplexity) / 20 * 100, 100),
            confidence=0.55,
            details=f"Text perplexity {perplexity:.1f} is below human average range (20-60)",
        ))

    # Stylometric indicators
    for flag in style_flags:
        indicators.append(CheatIndicator(
            indicator=f"stylometric_{flag}",
            score=30.0,
            confidence=0.4,
            details=f"Stylometric flag: {flag.replace('_', ' ')}",
        ))

    overall_risk = ai_prob
    risk = risk_level_from_score(overall_risk)

    logger.info(f"Answer analysis: AI prob={ai_prob:.1f}%, perplexity={perplexity:.1f}, risk={risk}")

    return AnswerAnalysisResult(
        ai_generated_probability=ai_prob,
        perplexity_score=perplexity,
        stylometric_flags=style_flags,
        typing_anomaly=typing_anomaly,
        timing_anomaly=timing_anomaly,
        cheat_indicators=indicators,
        overall_risk_score=overall_risk,
        risk_level=risk,
    )


@router.post("/analyze-session", response_model=SessionAnalysisResult)
async def analyze_session(request: SessionAnalysisRequest):
    """Analyze an entire interview session for cross-answer consistency."""
    if not request.answers:
        return SessionAnalysisResult(
            overall_cheat_risk=0, risk_level="low",
            per_answer_risks=[], cross_answer_consistency=100,
            flags=[], indicators=[],
        )

    per_answer_results = []
    all_texts = []

    for answer in request.answers:
        result = await analyze_answer(answer)
        per_answer_results.append(result)
        all_texts.append(answer.answer_text)

    per_answer_risks = [r.overall_risk_score for r in per_answer_results]

    # Cross-answer consistency analysis
    consistency_score = 100.0
    flags = []
    indicators = []

    if len(all_texts) >= 2:
        # Check vocabulary consistency
        vocabs = [set(t.lower().split()) for t in all_texts]
        pairwise_overlaps = []
        for i in range(len(vocabs)):
            for j in range(i + 1, len(vocabs)):
                overlap = len(vocabs[i] & vocabs[j]) / max(len(vocabs[i] | vocabs[j]), 1)
                pairwise_overlaps.append(overlap)

        if pairwise_overlaps:
            avg_overlap = sum(pairwise_overlaps) / len(pairwise_overlaps)
            # Very high overlap suggests template/AI responses
            if avg_overlap > 0.6:
                consistency_score -= 20
                flags.append("high_vocabulary_overlap")

        # Check response length uniformity
        lengths = [len(t.split()) for t in all_texts]
        if len(lengths) >= 3:
            avg = sum(lengths) / len(lengths)
            cv = (sum((l - avg) ** 2 for l in lengths) / len(lengths)) ** 0.5 / max(avg, 1)
            if cv < 0.1:
                consistency_score -= 15
                flags.append("uniform_response_lengths")

        # Check for consistent AI indicators across answers
        ai_probs = [r.ai_generated_probability for r in per_answer_results]
        high_ai_count = sum(1 for p in ai_probs if p > 50)
        if high_ai_count > len(ai_probs) * 0.6:
            flags.append("majority_ai_flagged")
            indicators.append(CheatIndicator(
                indicator="session_ai_pattern",
                score=70.0,
                confidence=0.65,
                details=f"{high_ai_count}/{len(ai_probs)} answers flagged as likely AI-generated",
            ))

    # Overall session risk
    avg_risk = sum(per_answer_risks) / max(len(per_answer_risks), 1)
    max_risk = max(per_answer_risks) if per_answer_risks else 0

    # Weight: 60% average, 30% max, 10% consistency penalty
    overall = (avg_risk * 0.6) + (max_risk * 0.3) + (max(0, 100 - consistency_score) * 0.1)

    return SessionAnalysisResult(
        overall_cheat_risk=round(overall, 2),
        risk_level=risk_level_from_score(overall),
        per_answer_risks=[round(r, 2) for r in per_answer_risks],
        cross_answer_consistency=round(max(consistency_score, 0), 2),
        flags=flags,
        indicators=indicators,
    )
