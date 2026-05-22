from .resume import router as resume_router
from .interview import router as interview_router
from .cheat import router as cheat_router
from .fraud import router as fraud_router

__all__ = ["resume_router", "interview_router", "cheat_router", "fraud_router"]
