import time
from fastapi import APIRouter, Depends, Query
from typing import Optional
from app.auth import get_current_user
from app.config import settings
from utils.mock_data import get_mock_logs, get_log_summary

router = APIRouter()

_log_service = None
_k8s_service = None
_k8s_created_at = 0.0
_SVC_TTL = 600


def _logs():
    global _log_service
    if _log_service is None:
        from app.services.log_service import LogService
        _log_service = LogService()
    return _log_service


def _k8s():
    global _k8s_service, _k8s_created_at
    if _k8s_service is None or (time.time() - _k8s_created_at) > _SVC_TTL:
        from app.services.k8s_service import K8sService
        _k8s_service = K8sService()
        _k8s_created_at = time.time()
    return _k8s_service


def _k8s_events_as_logs(limit: int, level: str = None, search: str = None) -> list:
    """Convert K8s events to log-shaped dicts as a fallback log source."""
    events = _k8s().get_events()
    logs = []
    for e in events:
        sev = "ERROR" if e.get("type") == "Warning" else "INFO"
        if level and sev != level.upper():
            continue
        msg = e.get("message", "")
        if search and search.lower() not in msg.lower():
            continue
        logs.append({
            "timestamp": e.get("last_time", ""),
            "level":     sev,
            "severity":  sev,
            "service":   e.get("object", "kubernetes").split("/")[0],
            "message":   msg,
            "namespace": e.get("namespace", ""),
            "source":    "kubernetes",
        })
    return logs[:limit]


def _get_logs(level=None, service=None, environment=None, search=None, limit=100):
    if settings.USE_MOCK_DATA:
        return get_mock_logs(level=level, service=service, environment=environment, search=search, limit=limit)
    # Try OCI Logging first
    try:
        results = _logs().get_logs(level=level, service=service, environment=environment, search=search, limit=limit)
        if results:
            return results
    except Exception as e:
        print(f"[Logs] OCI Logging failed: {e}")
    # Fall back to K8s events
    try:
        return _k8s_events_as_logs(limit=limit, level=level, search=search)
    except Exception as e:
        print(f"[Logs] K8s events fallback failed: {e}")
    return get_mock_logs(level=level, service=service, environment=environment, search=search, limit=limit)


@router.get("/")
async def list_logs(
    level: Optional[str] = Query(None, description="ERROR | WARNING | INFO"),
    service: Optional[str] = Query(None),
    environment: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    current_user: dict = Depends(get_current_user),
):
    logs = _get_logs(level=level, service=service, environment=environment, search=search, limit=limit)
    return {"logs": logs, "count": len(logs)}


@router.get("/summary")
async def logs_summary(current_user: dict = Depends(get_current_user)):
    if settings.USE_MOCK_DATA:
        return get_log_summary()
    try:
        logs = _get_logs(limit=500)
        summary = {"error": 0, "warning": 0, "info": 0, "by_service": {}}
        for log in logs:
            raw = str(log.get("severity", log.get("level", "INFO"))).upper()
            key = "error" if "ERROR" in raw else "warning" if "WARN" in raw else "info"
            summary[key] += 1
            svc = log.get("service", log.get("source", "unknown"))
            if svc not in summary["by_service"]:
                summary["by_service"][svc] = {"error": 0, "warning": 0, "info": 0}
            summary["by_service"][svc][key] += 1
        return summary
    except Exception as e:
        print(f"[Logs] summary failed: {e}")
        return get_log_summary()


@router.get("/services")
async def log_services(current_user: dict = Depends(get_current_user)):
    if settings.USE_MOCK_DATA:
        summary = get_log_summary()
    else:
        try:
            summary = await logs_summary(current_user=current_user)
        except Exception:
            summary = get_log_summary()

    services = [
        {
            "name":   svc,
            **counts,
            "total":  counts["error"] + counts["warning"] + counts["info"],
            "health": "critical" if counts["error"] > 5 else "warning" if counts["error"] > 0 or counts["warning"] > 3 else "healthy",
        }
        for svc, counts in summary["by_service"].items()
    ]
    return {"services": sorted(services, key=lambda x: x["error"], reverse=True)}
