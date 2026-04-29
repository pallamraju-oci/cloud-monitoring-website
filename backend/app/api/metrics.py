from fastapi import APIRouter, Depends, Query
from app.auth import get_current_user
from utils.mock_data import get_mock_metrics, get_dashboard_summary, get_mock_topology

router = APIRouter()


@router.get("/timeseries")
async def timeseries(
    hours: int = Query(24, ge=1, le=168),
    current_user: dict = Depends(get_current_user),
):
    return get_mock_metrics(hours=hours)


@router.get("/dashboard")
async def dashboard(current_user: dict = Depends(get_current_user)):
    return get_dashboard_summary()


@router.get("/topology")
async def topology(current_user: dict = Depends(get_current_user)):
    return get_mock_topology()
