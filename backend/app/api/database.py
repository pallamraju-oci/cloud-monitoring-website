from fastapi import APIRouter, Depends, Query
from typing import Optional
from app.auth import get_current_user
from app.config import settings
from utils.mock_data import get_mock_databases

router = APIRouter()

_oci_service = None


def _oci():
    global _oci_service
    if _oci_service is None:
        from app.services.oci_service import OCIService
        _oci_service = OCIService()
    return _oci_service


def _get_databases(environment: Optional[str] = None):
    if settings.USE_MOCK_DATA:
        data = get_mock_databases()
    else:
        try:
            data = _oci().get_databases()
        except Exception as e:
            print(f"[OCI] get_databases failed: {e}")
            data = get_mock_databases()
    if environment:
        data = [d for d in data if d.get("environment") == environment]
    return data


@router.get("/systems")
async def list_databases(
    environment: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    return {"databases": _get_databases(environment)}


@router.get("/summary")
async def db_summary(current_user: dict = Depends(get_current_user)):
    dbs = _get_databases()
    available = [d for d in dbs if d["lifecycle_state"] == "AVAILABLE"]
    return {
        "total":     len(dbs),
        "available": len(available),
        "stopped":   sum(1 for d in dbs if d["lifecycle_state"] == "STOPPED"),
        "avg_cpu":   round(
            sum(d.get("cpu_utilization", 0) for d in available) / max(len(available), 1), 1
        ),
        "avg_storage_used": round(
            sum(d.get("storage_used_percent", 0) for d in dbs) / max(len(dbs), 1), 1
        ),
    }
