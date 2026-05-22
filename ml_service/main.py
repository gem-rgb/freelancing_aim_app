"""
AIM ML Microservice — FastAPI application entry point.

Provides endpoints for:
- Resume parsing & skill extraction
- Candidate qualification scoring
- Interview question generation
- Answer evaluation & cheat detection
- Product fingerprint similarity scoring
- Fraud risk scoring
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings

logger = logging.getLogger("aim_ml")
logging.basicConfig(level=logging.DEBUG if settings.DEBUG else logging.INFO)

# ── Global model registry (loaded once at startup) ──
models = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load ML models on startup, release on shutdown."""
    logger.info("Loading ML models...")

    # 1. spaCy NLP model
    try:
        import spacy
        models["nlp"] = spacy.load(settings.SPACY_MODEL)
        logger.info(f"spaCy model '{settings.SPACY_MODEL}' loaded")
    except Exception as e:
        logger.warning(f"spaCy model load failed (will use fallback): {e}")
        models["nlp"] = None

    # 2. Sentence transformer for embeddings
    try:
        from sentence_transformers import SentenceTransformer
        models["embedder"] = SentenceTransformer(settings.SENTENCE_MODEL)
        logger.info(f"Sentence model '{settings.SENTENCE_MODEL}' loaded")
    except Exception as e:
        logger.warning(f"Sentence model load failed (will use fallback): {e}")
        models["embedder"] = None

    # 3. Redis connection for caching
    try:
        import redis.asyncio as aioredis
        models["redis"] = aioredis.from_url(settings.REDIS_URL, decode_responses=False)
        logger.info("Redis connected")
    except Exception as e:
        logger.warning(f"Redis connection failed: {e}")
        models["redis"] = None

    logger.info("ML service ready")
    yield

    # Cleanup
    if models.get("redis"):
        await models["redis"].aclose()
    models.clear()
    logger.info("ML models unloaded")


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Import routers ──
from routers import resume_router, interview_router, cheat_router, fraud_router

app.include_router(resume_router, prefix="/ml/resume", tags=["Resume Processing"])
app.include_router(interview_router, prefix="/ml/interview", tags=["Interview Generation"])
app.include_router(cheat_router, prefix="/ml/cheat", tags=["Cheat Detection"])
app.include_router(fraud_router, prefix="/ml/fraud", tags=["Fraud Detection"])


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "models_loaded": {
            "nlp": models.get("nlp") is not None,
            "embedder": models.get("embedder") is not None,
            "redis": models.get("redis") is not None,
        },
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
