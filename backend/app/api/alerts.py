import time
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from pydantic import BaseModel
from app.auth import get_current_user
from app.config import settings
from utils.mock_data import get_mock_alerts, get_mock_alert_rules

router = APIRouter()

_alert_rules = get_mock_alert_rules()

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


class AlertRuleUpdate(BaseModel):
    name: Optional[str] = None
    threshold: Optional[float] = None
    enabled: Optional[bool] = None
    notify_email: Optional[bool] = None


@router.get("/")
async def list_alerts(current_user: dict = Depends(get_current_user)):
    if settings.USE_MOCK_DATA:
        alerts = get_mock_alerts()
    else:
        try:
            from app.services.alert_service import evaluate_compute_alerts, evaluate_pod_alerts
            instances = _oci().get_instances()
            pods = _k8s().get_pods()
            running = [i for i in instances if i["lifecycle_state"] == "RUNNING"]
            alerts = evaluate_compute_alerts(running) + evaluate_pod_alerts(pods)
            # Normalise to the same shape the frontend expects
            for a in alerts:
                a.setdefault("status", "active")
                a.setdefault("id", f"{a['type']}-{a['resource']}")
        except Exception as e:
            print(f"[Alerts] failed: {e}")
            alerts = get_mock_alerts()

    return {
        "alerts":   alerts,
        "active":   sum(1 for a in alerts if a.get("status", "active") == "active"),
        "resolved": sum(1 for a in alerts if a.get("status") == "resolved"),
    }


@router.get("/rules")
async def list_rules(current_user: dict = Depends(get_current_user)):
    return {"rules": _alert_rules}


@router.put("/rules/{rule_id}")
async def update_rule(
    rule_id: str,
    update: AlertRuleUpdate,
    current_user: dict = Depends(get_current_user),
):
    for rule in _alert_rules:
        if rule["id"] == rule_id:
            if update.name is not None:
                rule["name"] = update.name
            if update.threshold is not None:
                rule["threshold"] = update.threshold
            if update.enabled is not None:
                rule["enabled"] = update.enabled
            if update.notify_email is not None:
                rule["notify_email"] = update.notify_email
            return {"rule": rule}
    raise HTTPException(status_code=404, detail="Rule not found")


@router.post("/rules/{rule_id}/test")
async def test_alert(rule_id: str, current_user: dict = Depends(get_current_user)):
    rule = next((r for r in _alert_rules if r["id"] == rule_id), None)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    return {"message": f"Test alert sent for rule: {rule['name']}", "rule_id": rule_id}
