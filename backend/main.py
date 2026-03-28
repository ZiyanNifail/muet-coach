from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from contextlib import asynccontextmanager
import logging
import os

from routers import auth, presentations, reports, courses, admin, submissions

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── APScheduler: 90-day retention cleanup (T4.07) ────────────────────────
    scheduler = None
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        from services.storage_service import run_retention_cleanup

        scheduler = AsyncIOScheduler()
        scheduler.add_job(
            run_retention_cleanup,
            trigger="interval",
            weeks=1,
            id="retention_cleanup",
            replace_existing=True,
        )
        scheduler.start()
        logger.info("APScheduler started — retention cleanup job scheduled weekly.")
    except ImportError:
        logger.warning("apscheduler not installed — retention cleanup disabled. Run: pip install apscheduler")
    except Exception as exc:
        logger.warning("APScheduler failed to start: %s", exc)

    print("Presentation Coach API starting up...")
    yield

    if scheduler and scheduler.running:
        scheduler.shutdown()
    print("Presentation Coach API shutting down.")


app = FastAPI(
    title="Presentation Coach API",
    description="AI-driven multimodal presentation coaching backend",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS — allow Next.js frontend in development and production
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    os.getenv("FRONTEND_URL", ""),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in origins if o],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router,          prefix="/api/auth",          tags=["auth"])
app.include_router(presentations.router, prefix="/api/presentations",  tags=["presentations"])
app.include_router(reports.router,       prefix="/api/reports",        tags=["reports"])
app.include_router(courses.router,       prefix="/api/courses",        tags=["courses"])
app.include_router(submissions.router,   prefix="/api/submissions",    tags=["submissions"])
app.include_router(admin.router,         prefix="/api/admin",          tags=["admin"])


@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse(url="/docs")


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.get("/api/health/db")
async def health_db():
    """Diagnostic endpoint — checks Supabase connectivity."""
    from services.supabase_client import test_connection
    ok, message = test_connection()
    if ok:
        return {"status": "ok", "message": message}
    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=503,
        content={"status": "error", "message": message},
    )
