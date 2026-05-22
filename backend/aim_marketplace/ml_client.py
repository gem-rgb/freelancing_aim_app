"""
ML Service Client — Django backend integration layer.

Provides a clean interface for Django services to call the FastAPI ML microservice.
Falls back gracefully when the ML service is unavailable.
"""
import logging
import httpx
from django.conf import settings

logger = logging.getLogger(__name__)

ML_SERVICE_URL = getattr(settings, 'ML_SERVICE_URL', 'http://localhost:8100')
ML_SERVICE_TIMEOUT = getattr(settings, 'ML_SERVICE_TIMEOUT', 30.0)


class MLServiceClient:
    """Synchronous HTTP client for the ML microservice."""

    def __init__(self):
        self.base_url = ML_SERVICE_URL
        self.timeout = ML_SERVICE_TIMEOUT

    def _post(self, path: str, data: dict) -> dict | None:
        """POST to ML service, return JSON or None on failure."""
        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.post(f"{self.base_url}{path}", json=data)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"ML service error {e.response.status_code}: {e.response.text}")
            return None
        except httpx.ConnectError:
            logger.warning(f"ML service unavailable at {self.base_url}")
            return None
        except Exception as e:
            logger.error(f"ML service call failed: {e}")
            return None

    def _get(self, path: str) -> dict | None:
        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.get(f"{self.base_url}{path}")
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.warning(f"ML service GET failed: {e}")
            return None

    # ── Health ──

    def health_check(self) -> bool:
        result = self._get("/health")
        return result is not None and result.get("status") == "ok"

    # ── Resume Processing ──

    def parse_resume_text(self, raw_text: str, target_role: str = "manager") -> dict | None:
        """Parse resume from extracted text."""
        return self._post("/ml/resume/parse-text", {
            "raw_text": raw_text,
            "target_role": target_role,
        })

    def compute_candidate_similarity(self, vector_a: list, vector_b: list) -> dict | None:
        """Compute similarity between two candidate vectors."""
        return self._post("/ml/resume/similarity", {
            "vector_a": vector_a,
            "vector_b": vector_b,
        })

    # ── Interview Generation ──

    def generate_interview(
        self,
        candidate_skills: list,
        missing_skills: list,
        overall_score: float,
        num_questions: int = 8,
        difficulty: int = 5,
    ) -> dict | None:
        """Generate interview questions for a candidate."""
        return self._post("/ml/interview/generate", {
            "candidate_skills": candidate_skills,
            "missing_skills": missing_skills,
            "overall_score": overall_score,
            "num_questions": num_questions,
            "difficulty_level": difficulty,
        })

    # ── Cheat Detection ──

    def analyze_answer(
        self,
        answer_text: str,
        question_text: str,
        typing_speed_wpm: float | None = None,
        time_to_answer_seconds: int | None = None,
    ) -> dict | None:
        """Analyze a single answer for cheat/AI indicators."""
        return self._post("/ml/cheat/analyze-answer", {
            "answer_text": answer_text,
            "question_text": question_text,
            "typing_speed_wpm": typing_speed_wpm,
            "time_to_answer_seconds": time_to_answer_seconds,
        })

    def analyze_session(self, answers: list[dict]) -> dict | None:
        """Analyze an entire interview session."""
        return self._post("/ml/cheat/analyze-session", {
            "answers": answers,
        })

    # ── Fraud Detection ──

    def create_fingerprint(self, content_text: str, title: str = "", description: str = "") -> dict | None:
        """Generate content fingerprint with embedding."""
        return self._post("/ml/fraud/fingerprint", {
            "content_text": content_text,
            "title": title,
            "description": description,
        })

    def check_similarity(self, embedding_a: list, embedding_b: list) -> dict | None:
        """Check semantic similarity between two products."""
        return self._post("/ml/fraud/similarity", {
            "embedding_a": embedding_a,
            "embedding_b": embedding_b,
        })

    def bulk_similarity(self, query_embedding: list, candidate_embeddings: list, threshold: float = 0.85) -> dict | None:
        """Check query against multiple candidates."""
        return self._post("/ml/fraud/bulk-similarity", {
            "query_embedding": query_embedding,
            "candidate_embeddings": candidate_embeddings,
            "threshold": threshold,
        })

    def analyze_listing_risk(
        self,
        title: str,
        description: str,
        price: float,
        seller_account_age_days: int = 0,
        seller_trust_score: float = 50.0,
    ) -> dict | None:
        """Analyze listing for fraud risk."""
        return self._post("/ml/fraud/listing-risk", {
            "title": title,
            "description": description,
            "price": price,
            "seller_account_age_days": seller_account_age_days,
            "seller_trust_score": seller_trust_score,
        })


# Singleton instance
ml_client = MLServiceClient()
