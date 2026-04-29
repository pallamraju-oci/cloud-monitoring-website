from fastapi import APIRouter, Depends, Query
from typing import Optional
from app.auth import get_current_user
from app.config import settings
from utils.mock_data import get_mock_compute_instances

router = APIRouter()

# Singleton so the OCI session is reused across requests
_oci_service = None

def _oci():
    global _oci_service
    if _oci_service is None:
        from app.services.oci_service import OCIService
        _oci_service = OCIService()
    return _oci_service


def _get_instances(environment: Optional[str] = None, compartment: Optional[str] = None):
    if settings.USE_MOCK_DATA:
        data = get_mock_compute_instances()
    else:
        try:
            data = _oci().get_instances()
        except Exception as exc:
            print(f"[compute] OCI call failed, using mock: {exc}")
            data = get_mock_compute_instances()

    if environment:
        data = [i for i in data if i.get("environment") == environment]
    if compartment:
        data = [i for i in data if i.get("compartment") == compartment]
    return data


@router.get("/compartments")
async def list_compartments(current_user: dict = Depends(get_current_user)):
    """Return the configured compartment labels (for frontend filter dropdowns)."""
    return {"compartments": settings.compartment_list}


@router.get("/instances")
async def list_instances(
    environment: Optional[str] = Query(None),
    compartment: Optional[str] = Query(None, description="Filter by compartment label"),
    current_user: dict = Depends(get_current_user),
):
    return {"instances": _get_instances(environment, compartment)}


@router.get("/instances/{instance_id}")
async def get_instance(
    instance_id: str,
    current_user: dict = Depends(get_current_user),
):
    instances = _get_instances()
    for inst in instances:
        if inst["id"] == instance_id or inst["display_name"] == instance_id:
            return inst
    from fastapi import HTTPException
    raise HTTPException(status_code=404, detail="Instance not found")


@router.get("/summary")
async def compute_summary(current_user: dict = Depends(get_current_user)):
    instances = _get_instances()
    return {
        "total": len(instances),
        "running": sum(1 for i in instances if i["lifecycle_state"] == "RUNNING"),
        "stopped": sum(1 for i in instances if i["lifecycle_state"] == "STOPPED"),
        "avg_cpu": round(
            sum(i["cpu_utilization"] for i in instances if i["lifecycle_state"] == "RUNNING")
            / max(sum(1 for i in instances if i["lifecycle_state"] == "RUNNING"), 1),
            1,
        ),
        "avg_memory": round(
            sum(i["memory_utilization"] for i in instances if i["lifecycle_state"] == "RUNNING")
            / max(sum(1 for i in instances if i["lifecycle_state"] == "RUNNING"), 1),
            1,
        ),
    }
