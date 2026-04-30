import time
from fastapi import APIRouter, Depends, Query
from app.auth import get_current_user
from app.config import settings
from utils.mock_data import get_mock_metrics, get_dashboard_summary, get_mock_topology

router = APIRouter()

_oci_service = None
_k8s_service = None
_oci_created_at = 0.0
_k8s_created_at = 0.0
_SVC_TTL = 600


def _oci():
    global _oci_service, _oci_created_at
    if _oci_service is None or (time.time() - _oci_created_at) > _SVC_TTL:
        from app.services.oci_service import OCIService
        _oci_service = OCIService()
        _oci_created_at = time.time()
    return _oci_service


def _k8s():
    global _k8s_service, _k8s_created_at
    if _k8s_service is None or (time.time() - _k8s_created_at) > _SVC_TTL:
        from app.services.k8s_service import K8sService
        _k8s_service = K8sService()
        _k8s_created_at = time.time()
    return _k8s_service


@router.get("/timeseries")
async def timeseries(
    hours: int = Query(24, ge=1, le=168),
    current_user: dict = Depends(get_current_user),
):
    # Historical timeseries requires OCI Monitoring retention data — return mock
    return get_mock_metrics(hours=hours)


@router.get("/dashboard")
async def dashboard(current_user: dict = Depends(get_current_user)):
    if settings.USE_MOCK_DATA:
        return get_dashboard_summary()
    try:
        instances = _oci().get_instances()
        running = [i for i in instances if i["lifecycle_state"] == "RUNNING"]
        nodes = _k8s().get_nodes()
        pods = _k8s().get_pods()
        dbs = _oci().get_databases()

        from app.services.alert_service import evaluate_compute_alerts, evaluate_pod_alerts
        alerts = evaluate_compute_alerts(running) + evaluate_pod_alerts(pods)
        critical = sum(1 for a in alerts if a["severity"] == "critical")
        warning  = sum(1 for a in alerts if a["severity"] == "warning")

        avg_cpu = round(sum(i.get("cpu_utilization", 0) for i in running) / max(len(running), 1), 1)
        avg_mem = round(sum(i.get("memory_utilization", 0) for i in running) / max(len(running), 1), 1)
        failed_pods = sum(1 for p in pods if p["status"] in ["CrashLoopBackOff", "OOMKilled", "Error"])

        return {
            "compute": {
                "total":   len(instances),
                "running": len(running),
                "stopped": sum(1 for i in instances if i["lifecycle_state"] == "STOPPED"),
                "avg_cpu": avg_cpu,
                "avg_memory": avg_mem,
            },
            "kubernetes": {
                "total_pods":   len(pods),
                "running_pods": sum(1 for p in pods if p["status"] == "Running"),
                "failed_pods":  failed_pods,
                "pending_pods": sum(1 for p in pods if p["status"] == "Pending"),
                "total_nodes":  len(nodes),
                "ready_nodes":  sum(1 for n in nodes if n["status"] == "Ready"),
            },
            "databases": {
                "total":     len(dbs),
                "available": sum(1 for d in dbs if d["lifecycle_state"] == "AVAILABLE"),
                "stopped":   sum(1 for d in dbs if d["lifecycle_state"] == "STOPPED"),
            },
            "alerts": {
                "active":   len(alerts),
                "critical": critical,
                "warning":  warning,
            },
            "logs": {"errors_last_hour": 0, "warnings_last_hour": 0},
            "health_score": max(
                0,
                100
                - (critical * 15)
                - (warning * 5)
                - (failed_pods * 8)
                - (max(0, avg_cpu - 75) * 2)
                - (max(0, avg_mem - 80) * 1),
            ),
        }
    except Exception as e:
        print(f"[Metrics] dashboard failed: {e}")
        return get_dashboard_summary()


@router.get("/topology")
async def topology(current_user: dict = Depends(get_current_user)):
    if settings.USE_MOCK_DATA:
        return get_mock_topology()
    try:
        nodes = _k8s().get_nodes()
        pods  = _k8s().get_pods()

        service_map: dict = {}
        for pod in pods:
            app_name = pod.get("app", pod["name"].split("-")[0])
            svc_name = f"{app_name}-svc"
            if svc_name not in service_map:
                service_map[svc_name] = {"name": svc_name, "type": "ClusterIP", "port": 8080, "pods": []}
            service_map[svc_name]["pods"].append(pod["name"])

        return {
            "nodes":    nodes,
            "pods":     pods,
            "services": list(service_map.values())[:20],
        }
    except Exception as e:
        print(f"[Metrics] topology failed: {e}")
        return get_mock_topology()
