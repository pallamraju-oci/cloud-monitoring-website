from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Optional
from pydantic import BaseModel
from app.auth import get_current_user
from utils.mock_data import get_mock_alerts, get_mock_alert_rules

router = APIRouter()

# In-memory store for demo purposes
_alert_rules = get_mock_alert_rules()


class AlertRuleUpdate(BaseModel):
    name: Optional[str] = None
    threshold: Optional[float] = None
    enabled: Optional[bool] = None
    notify_email: Optional[bool] = None


@router.get("/")
async def list_alerts(current_user: dict = Depends(get_current_user)):
    alerts = get_mock_alerts()
    return {
        "alerts": alerts,
        "active": sum(1 for a in alerts if a["status"] == "active"),
        "resolved": sum(1 for a in alerts if a["status"] == "resolved"),
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
