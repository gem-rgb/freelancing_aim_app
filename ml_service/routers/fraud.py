"""
Product Fraud Detection — Fingerprint similarity, duplicate scoring, risk analysis.

Uses sentence-transformers embeddings to detect:
- Content duplication via semantic similarity
- Reupload patterns via metadata analysis
- Risk scoring for suspicious listings
"""
import hashlib
import logging
from fastapi import APIRouter
from pydantic import BaseModel

logger = logging.getLogger("aim_ml.fraud")
router = APIRouter()


# ── Schemas ──

class FingerprintRequest(BaseModel):
    content_text: str
    title: str = ""
    description: str = ""
    metadata: dict = {}


class FingerprintResult(BaseModel):
    content_hash: str
    metadata_hash: str
    embedding: list[float]
    text_stats: dict


class SimilarityRequest(BaseModel):
    embedding_a: list[float]
    embedding_b: list[float]
    metadata_a: dict = {}
    metadata_b: dict = {}


class SimilarityResult(BaseModel):
    semantic_similarity: float
    metadata_similarity: float
    combined_score: float
    is_likely_duplicate: bool
    risk_factors: list[str]


class BulkSimilarityRequest(BaseModel):
    query_embedding: list[float]
    candidate_embeddings: list[list[float]]
    candidate_ids: list[str] = []
    threshold: float = 0.85


class BulkSimilarityResult(BaseModel):
    matches: list[dict]
    total_checked: int
    above_threshold: int


class ListingRiskRequest(BaseModel):
    title: str
    description: str
    price: float
    seller_account_age_days: int = 0
    seller_total_listings: int = 0
    seller_trust_score: float = 50.0
    category: str = ""


class ListingRiskResult(BaseModel):
    risk_score: float
    risk_level: str
    risk_factors: list[dict]
    recommendation: str


# ── Analysis functions ──

def compute_content_hash(text: str) -> str:
    """SHA-256 hash of normalized content."""
    normalized = " ".join(text.lower().split())
    return hashlib.sha256(normalized.encode()).hexdigest()


def compute_metadata_hash(title: str, description: str) -> str:
    """Hash of listing metadata for quick comparison."""
    combined = f"{title.lower().strip()}|{description.lower().strip()[:200]}"
    return hashlib.sha256(combined.encode()).hexdigest()


def compute_text_stats(text: str) -> dict:
    """Compute statistical features of text for comparison."""
    words = text.split()
    sentences = [s.strip() for s in text.split(".") if s.strip()]
    unique_words = set(w.lower() for w in words)

    return {
        "word_count": len(words),
        "sentence_count": len(sentences),
        "unique_word_ratio": round(len(unique_words) / max(len(words), 1), 4),
        "avg_word_length": round(sum(len(w) for w in words) / max(len(words), 1), 2),
        "avg_sentence_length": round(len(words) / max(len(sentences), 1), 2),
        "char_count": len(text),
    }


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two vectors."""
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = sum(x ** 2 for x in a) ** 0.5
    norm_b = sum(x ** 2 for x in b) ** 0.5
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def compute_metadata_similarity(meta_a: dict, meta_b: dict) -> float:
    """Compute metadata overlap score."""
    if not meta_a or not meta_b:
        return 0.0
    keys = set(meta_a.keys()) | set(meta_b.keys())
    if not keys:
        return 0.0
    matches = sum(1 for k in keys if str(meta_a.get(k, "")).lower() == str(meta_b.get(k, "")).lower() and k in meta_a and k in meta_b)
    return matches / len(keys)


# ── Scam pattern detection ──

SCAM_PATTERNS = [
    {"pattern": r"(?i)guaranteed\s+(returns?|profit|income)", "weight": 25, "label": "guaranteed_returns"},
    {"pattern": r"(?i)(100|200|300|500|1000)\s*%\s*(return|profit|roi)", "weight": 30, "label": "unrealistic_roi"},
    {"pattern": r"(?i)get\s+rich\s+quick", "weight": 20, "label": "get_rich_quick"},
    {"pattern": r"(?i)(secret|hidden|exclusive)\s+(method|technique|strategy)", "weight": 15, "label": "exclusivity_claims"},
    {"pattern": r"(?i)no\s+(risk|loss|experience)\s+(required|needed|necessary)", "weight": 20, "label": "no_risk_claims"},
    {"pattern": r"(?i)(limited\s+time|act\s+now|only\s+\d+\s+left)", "weight": 10, "label": "urgency_pressure"},
    {"pattern": r"(?i)(passive\s+income|make\s+money\s+while\s+you\s+sleep)", "weight": 15, "label": "passive_income_claims"},
]


def detect_scam_patterns(text: str) -> list[dict]:
    """Detect known scam language patterns."""
    import re
    findings = []
    for pattern_def in SCAM_PATTERNS:
        matches = re.findall(pattern_def["pattern"], text)
        if matches:
            findings.append({
                "pattern": pattern_def["label"],
                "weight": pattern_def["weight"],
                "occurrences": len(matches),
                "examples": [str(m) for m in matches[:3]],
            })
    return findings


# ── Endpoints ──

@router.post("/fingerprint", response_model=FingerprintResult)
async def create_fingerprint(request: FingerprintRequest):
    """Generate content fingerprint with hash + embedding."""
    full_text = f"{request.title} {request.description} {request.content_text}"

    content_hash = compute_content_hash(request.content_text)
    metadata_hash = compute_metadata_hash(request.title, request.description)
    text_stats = compute_text_stats(full_text)

    # Generate semantic embedding
    embedding = []
    from main import models
    embedder = models.get("embedder")
    if embedder:
        try:
            embedding = embedder.encode(full_text[:2000]).tolist()
        except Exception as e:
            logger.warning(f"Embedding failed: {e}")

    return FingerprintResult(
        content_hash=content_hash,
        metadata_hash=metadata_hash,
        embedding=embedding,
        text_stats=text_stats,
    )


@router.post("/similarity", response_model=SimilarityResult)
async def check_similarity(request: SimilarityRequest):
    """Compare two product fingerprints for duplicate detection."""
    semantic_sim = cosine_similarity(request.embedding_a, request.embedding_b)
    metadata_sim = compute_metadata_similarity(request.metadata_a, request.metadata_b)

    # Combined score: 70% semantic, 30% metadata
    combined = (semantic_sim * 0.7) + (metadata_sim * 0.3)

    risk_factors = []
    if semantic_sim > 0.95:
        risk_factors.append("near_identical_content")
    elif semantic_sim > 0.85:
        risk_factors.append("highly_similar_content")
    if metadata_sim > 0.8:
        risk_factors.append("matching_metadata")

    from config import settings
    is_duplicate = combined >= settings.DUPLICATE_SIMILARITY_THRESHOLD

    return SimilarityResult(
        semantic_similarity=round(semantic_sim, 4),
        metadata_similarity=round(metadata_sim, 4),
        combined_score=round(combined, 4),
        is_likely_duplicate=is_duplicate,
        risk_factors=risk_factors,
    )


@router.post("/bulk-similarity", response_model=BulkSimilarityResult)
async def bulk_similarity(request: BulkSimilarityRequest):
    """Compare a query embedding against multiple candidates."""
    matches = []
    for i, candidate in enumerate(request.candidate_embeddings):
        sim = cosine_similarity(request.query_embedding, candidate)
        if sim >= request.threshold:
            cid = request.candidate_ids[i] if i < len(request.candidate_ids) else str(i)
            matches.append({"id": cid, "similarity": round(sim, 4)})

    matches.sort(key=lambda m: m["similarity"], reverse=True)

    return BulkSimilarityResult(
        matches=matches,
        total_checked=len(request.candidate_embeddings),
        above_threshold=len(matches),
    )


@router.post("/listing-risk", response_model=ListingRiskResult)
async def analyze_listing_risk(request: ListingRiskRequest):
    """Comprehensive risk scoring for a new listing."""
    risk_score = 0.0
    risk_factors = []

    # 1. Scam pattern detection in text
    full_text = f"{request.title} {request.description}"
    scam_patterns = detect_scam_patterns(full_text)
    pattern_risk = sum(p["weight"] for p in scam_patterns)
    if scam_patterns:
        risk_score += min(pattern_risk, 40)
        risk_factors.append({
            "factor": "scam_language_patterns",
            "score": min(pattern_risk, 40),
            "details": f"Detected {len(scam_patterns)} scam language patterns",
        })

    # 2. Account age risk
    if request.seller_account_age_days < 7:
        age_risk = 20
        risk_score += age_risk
        risk_factors.append({"factor": "new_account", "score": age_risk, "details": f"Account is {request.seller_account_age_days} days old"})
    elif request.seller_account_age_days < 30:
        age_risk = 10
        risk_score += age_risk
        risk_factors.append({"factor": "young_account", "score": age_risk, "details": f"Account is {request.seller_account_age_days} days old"})

    # 3. Trust score risk
    if request.seller_trust_score < 30:
        trust_risk = 20
        risk_score += trust_risk
        risk_factors.append({"factor": "low_trust", "score": trust_risk, "details": f"Seller trust score: {request.seller_trust_score}"})

    # 4. Price anomaly (very high or very low)
    if request.price > 200000:
        price_risk = 15
        risk_score += price_risk
        risk_factors.append({"factor": "high_price", "score": price_risk, "details": f"Price ₦{request.price:,.0f} is unusually high"})
    elif request.price < 500:
        price_risk = 10
        risk_score += price_risk
        risk_factors.append({"factor": "suspiciously_low_price", "score": price_risk, "details": f"Price ₦{request.price:,.0f} may be bait pricing"})

    # 5. Description quality
    word_count = len(request.description.split())
    if word_count < 20:
        desc_risk = 10
        risk_score += desc_risk
        risk_factors.append({"factor": "thin_description", "score": desc_risk, "details": f"Description has only {word_count} words"})

    risk_score = min(risk_score, 100)
    risk_level = "critical" if risk_score >= 70 else "high" if risk_score >= 50 else "medium" if risk_score >= 30 else "low"

    recommendations = {
        "low": "Listing appears legitimate. Standard verification recommended.",
        "medium": "Some risk indicators detected. Enhanced verification recommended.",
        "high": "Multiple risk indicators detected. Manual review required before listing approval.",
        "critical": "Listing has significant fraud indicators. Should be flagged for immediate admin review.",
    }

    return ListingRiskResult(
        risk_score=round(risk_score, 2),
        risk_level=risk_level,
        risk_factors=risk_factors,
        recommendation=recommendations[risk_level],
    )
