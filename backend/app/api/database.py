from fastapi import APIRouter, Depends, Query
from typing import Optional
from app.auth import get_current_user
from app.config import settings
from utils.mock_data import get_mock_databases

router = APIRouter()


@router.get("/systems")
async def list_databases(
    environment: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    if settings.USE_MOCK_DATA:
        data = get_mock_databases()
    else:
        try:
            from app.services.oci_service import OCIService
            data = OCIService().get_databases()
        except Exception:
            data = get_mock_databases()

    if environment:
        data = [d for d in data if d.get("environment") == environment]
    return {"databases": data}


@router.get("/summary")
async def db_summary(current_user: dict = Depends(get_current_user)):
    dbs = get_mock_databases()
    return {
        "total": len(dbs),
        "available": sum(1 for d in dbs if d["lifecycle_state"] == "AVAILABLE"),
        "stopped": sum(1 for d in dbs if d["lifecycle_state"] == "STOPPED"),
        "avg_cpu": round(
            sum(d["cpu_utilization"] for d in dbs if d["lifecycle_state"] == "AVAILABLE")
            / max(sum(1 for d in dbs if d["lifecycle_state"] == "AVAILABLE"), 1),
            1,
        ),
        "avg_storage_used": round(
            sum(d["storage_used_percent"] for d in dbs) / max(len(dbs), 1), 1
        ),
    }
