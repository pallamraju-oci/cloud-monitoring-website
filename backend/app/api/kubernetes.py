from fastapi import APIRouter, Depends, Query
from typing import Optional
from app.auth import get_current_user
from app.config import settings
from utils.mock_data import get_mock_nodes, get_mock_pods, get_mock_namespaces, get_mock_events

router = APIRouter()

_k8s_service = None


def _k8s():
    global _k8s_service
    if _k8s_service is None:
        from app.services.k8s_service import K8sService
        _k8s_service = K8sService()
    return _k8s_service


@router.get("/nodes")
async def list_nodes(current_user: dict = Depends(get_current_user)):
    if settings.USE_MOCK_DATA:
        return {"nodes": get_mock_nodes()}
    try:
        return {"nodes": _k8s().get_nodes()}
    except Exception as e:
        print(f"[K8s] get_nodes failed: {e}")
        return {"nodes": get_mock_nodes()}


@router.get("/namespaces")
async def list_namespaces(current_user: dict = Depends(get_current_user)):
    if settings.USE_MOCK_DATA:
        return {"namespaces": get_mock_namespaces()}
    try:
        return {"namespaces": _k8s().get_namespaces()}
    except Exception as e:
        print(f"[K8s] get_namespaces failed: {e}")
        return {"namespaces": get_mock_namespaces()}


@router.get("/pods")
async def list_pods(
    namespace: Optional[str] = Query(None),
    environment: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    if settings.USE_MOCK_DATA:
        pods = get_mock_pods(namespace=namespace, environment=environment)
    else:
        try:
            pods = _k8s().get_pods(namespace=namespace)
            if environment:
                pods = [p for p in pods if p.get("environment") == environment]
        except Exception as e:
            print(f"[K8s] get_pods failed: {e}")
            pods = get_mock_pods(namespace=namespace, environment=environment)
    return {"pods": pods, "total": len(pods)}


@router.get("/events")
async def list_events(current_user: dict = Depends(get_current_user)):
    if settings.USE_MOCK_DATA:
        return {"events": get_mock_events()}
    try:
        return {"events": _k8s().get_events()}
    except Exception as e:
        print(f"[K8s] get_events failed: {e}")
        return {"events": get_mock_events()}


@router.get("/summary")
async def k8s_summary(current_user: dict = Depends(get_current_user)):
    if settings.USE_MOCK_DATA:
        nodes = get_mock_nodes()
        pods = get_mock_pods()
        namespaces = get_mock_namespaces()
    else:
        try:
            nodes = _k8s().get_nodes()
        except Exception as e:
            print(f"[K8s] summary/nodes failed: {e}")
            nodes = get_mock_nodes()
        try:
            pods = _k8s().get_pods()
        except Exception as e:
            print(f"[K8s] summary/pods failed: {e}")
            pods = get_mock_pods()
        try:
            namespaces = _k8s().get_namespaces()
        except Exception as e:
            print(f"[K8s] summary/namespaces failed: {e}")
            namespaces = get_mock_namespaces()

    return {
        "total_nodes":   len(nodes),
        "ready_nodes":   sum(1 for n in nodes if n["status"] == "Ready"),
        "total_pods":    len(pods),
        "running_pods":  sum(1 for p in pods if p["status"] == "Running"),
        "failed_pods":   sum(1 for p in pods if p["status"] in ["CrashLoopBackOff", "OOMKilled", "Error"]),
        "pending_pods":  sum(1 for p in pods if p["status"] == "Pending"),
        "namespaces":    len(namespaces),
    }
