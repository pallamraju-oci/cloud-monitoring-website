from datetime import datetime, timezone
from typing import Any, Dict


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def health_score_label(score: int) -> str:
    if score >= 80:
        return "healthy"
    if score >= 50:
        return "warning"
    return "critical"


def severity_from_utilization(value: float, warn: float = 70.0, crit: float = 85.0) -> str:
    if value >= crit:
        return "critical"
    if value >= warn:
        return "warning"
    return "healthy"


def paginate(items: list, page: int = 1, page_size: int = 50) -> Dict[str, Any]:
    total = len(items)
    start = (page - 1) * page_size
    end = start + page_size
    return {
        "items": items[start:end],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size,
    }