import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings
from app.api import auth, compute, kubernetes, database, logs, metrics, alerts

app = FastAPI(
    title="OciPulse API",
    description="Lightweight OCI observability platform",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(compute.router, prefix="/api/compute", tags=["Compute"])
app.include_router(kubernetes.router, prefix="/api/kubernetes", tags=["Kubernetes"])
app.include_router(database.router, prefix="/api/database", tags=["Database"])
app.include_router(logs.router, prefix="/api/logs", tags=["Logs"])
app.include_router(metrics.router, prefix="/api/metrics", tags=["Metrics"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["Alerts"])


@app.get("/api/health", tags=["Health"])
async def health():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "mock_mode": settings.USE_MOCK_DATA,
        "app": settings.APP_NAME,
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "path": str(request.url)},
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
