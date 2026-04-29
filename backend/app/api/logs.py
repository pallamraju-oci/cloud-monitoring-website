from fastapi import APIRouter, Depends, Query
from typing import Optional
from app.auth import get_current_user
from app.config import settings
from utils.mock_data import get_mock_logs, get_log_summary

router = APIRouter()


@router.get("/")
async def list_logs(
    level: Optional[str] = Query(None, description="ERROR | WARNING | INFO"),
    service: Optional[str] = Query(None),
    environment: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    current_user: dict = Depends(get_current_user),
):
    if settings.USE_MOCK_DATA:
        logs = get_mock_logs(level=level, service=service, environment=environment, search=search, limit=limit)
    else:
        try:
            from app.services.log_service import LogService
            logs = LogService().get_logs(level=level, service=service, environment=environment, search=search, limit=limit)
        except Exception:
            logs = get_mock_logs(level=level, service=service, environment=environment, search=search, limit=limit)

    return {"logs": logs, "count": len(logs)}


@router.get("/summary")
async def logs_summary(current_user: dict = Depends(get_current_user)):
    return get_log_summary()


@router.get("/services")
async def log_services(current_user: dict = Depends(get_current_user)):
    summary = get_log_summary()
    services = [
        {
            "name": svc,
            **counts,
            "total": counts["error"] + counts["warning"] + counts["info"],
            "health": "critical" if counts["error"] > 5 else "warning" if counts["error"] > 0 or counts["warning"] > 3 else "healthy",
        }
        for svc, counts in summary["by_service"].items()
    ]
    return {"services": sorted(services, key=lambda x: x["error"], reverse=True)}
