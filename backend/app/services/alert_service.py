"""
Alert service: evaluates rules against live data and sends email notifications.
"""
import asyncio
from datetime import datetime
from typing import List, Dict
from app.config import settings


async def send_email_alert(subject: str, body: str) -> bool:
    if not settings.SMTP_USERNAME:
        print(f"[Alert] (SMTP not configured) Would send: {subject}")
        return False
    try:
        import aiosmtplib
        from email.mime.text import MIMEText
        msg = MIMEText(body, "html")
        msg["Subject"] = subject
        msg["From"] = settings.ALERT_EMAIL_FROM
        msg["To"] = settings.ALERT_EMAIL_TO
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USERNAME,
            password=settings.SMTP_PASSWORD,
            start_tls=True,
        )
        return True
    except Exception as e:
        print(f"[Alert] Failed to send email: {e}")
        return False


def evaluate_compute_alerts(instances: List[Dict]) -> List[Dict]:
    alerts = []
    for inst in instances:
        if inst["cpu_utilization"] >= settings.CPU_ALERT_THRESHOLD:
            alerts.append(
                {
                    "type": "HIGH_CPU",
                    "severity": "critical",
                    "resource": inst["display_name"],
                    "message": f"CPU at {inst['cpu_utilization']}% (threshold {settings.CPU_ALERT_THRESHOLD}%)",
                    "triggered_at": datetime.utcnow().isoformat(),
                }
            )
        if inst["memory_utilization"] >= settings.MEMORY_ALERT_THRESHOLD:
            alerts.append(
                {
                    "type": "HIGH_MEMORY",
                    "severity": "warning",
                    "resource": inst["display_name"],
                    "message": f"Memory at {inst['memory_utilization']}% (threshold {settings.MEMORY_ALERT_THRESHOLD}%)",
                    "triggered_at": datetime.utcnow().isoformat(),
                }
            )
    return alerts


def evaluate_pod_alerts(pods: List[Dict]) -> List[Dict]:
    alerts = []
    for pod in pods:
        if pod["status"] in ["CrashLoopBackOff", "OOMKilled", "Error"]:
            alerts.append(
                {
                    "type": "POD_CRASH",
                    "severity": "critical",
                    "resource": pod["name"],
                    "message": f"Pod status: {pod['status']} in namespace {pod['namespace']}",
                    "triggered_at": datetime.utcnow().isoformat(),
                }
            )
        elif pod["restarts"] > 5:
            alerts.append(
                {
                    "type": "POD_RESTARTS",
                    "severity": "warning",
                    "resource": pod["name"],
                    "message": f"Pod restarted {pod['restarts']} times",
                    "triggered_at": datetime.utcnow().isoformat(),
                }
            )
    return alerts
