from fastapi import APIRouter, Depends, Query
from typing import Optional
from app.auth import get_current_user
from app.config import settings
from utils.mock_data import get_mock_nodes, get_mock_pods, get_mock_namespaces, get_mock_events

router = APIRouter()


def _source(use_mock_fn, real_fn=None, **kwargs):
    if settings.USE_MOCK_DATA or real_fn is None:
        return use_mock_fn(**kwargs)
    try:
        return real_fn(**kwargs)
    except Exception:
        return use_mock_fn(**kwargs)


@router.get("/nodes")
async def list_nodes(current_user: dict = Depends(get_current_user)):
    return {"nodes": _source(get_mock_nodes)}


@router.get("/namespaces")
async def list_namespaces(current_user: dict = Depends(get_current_user)):
    return {"namespaces": _source(get_mock_namespaces)}


@router.get("/pods")
async def list_pods(
    namespace: Optional[str] = Query(None),
    environment: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    pods = _source(get_mock_pods, namespace=namespace, environment=environment)
    return {"pods": pods, "total": len(pods)}


@router.get("/events")
async def list_events(current_user: dict = Depends(get_current_user)):
    return {"events": _source(get_mock_events)}


@router.get("/summary")
async def k8s_summary(current_user: dict = Depends(get_current_user)):
    nodes = _source(get_mock_nodes)
    pods = _source(get_mock_pods)
    return {
        "total_nodes": len(nodes),
        "ready_nodes": sum(1 for n in nodes if n["status"] == "Ready"),
        "total_pods": len(pods),
        "running_pods": sum(1 for p in pods if p["status"] == "Running"),
        "failed_pods": sum(1 for p in pods if p["status"] in ["CrashLoopBackOff", "OOMKilled", "Error"]),
        "pending_pods": sum(1 for p in pods if p["status"] == "Pending"),
        "namespaces": len(_source(get_mock_namespaces)),
    }
