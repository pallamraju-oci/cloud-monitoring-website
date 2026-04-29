from pydantic_settings import BaseSettings
from typing import List, Optional
from pydantic import field_validator


class Settings(BaseSettings):
    APP_NAME: str = "OciPulse"
    DEBUG: bool = False
    SECRET_KEY: str = "change-me-in-production-use-long-random-string"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    # ── OCI Auth ───────────────────────────────────────────────────────────────
    # "config_file"        → reads ~/.oci/config (API key auth, dev/local)
    # "instance_principal" → uses VM's IAM dynamic group (recommended on OCI VMs)
    # "resource_principal" → for OCI Functions / container instances
    OCI_AUTH_TYPE: str = "instance_principal"

    OCI_CONFIG_FILE: str = "~/.oci/config"
    OCI_PROFILE: str = "DEFAULT"
    OCI_REGION: str = "ap-mumbai-1"

    # ── Compartments ───────────────────────────────────────────────────────────
    # Single compartment (legacy / simple setup)
    OCI_COMPARTMENT_ID: str = ""

    # Multiple compartments — comma-separated OCIDs.
    # e.g.  OCI_COMPARTMENT_IDS=ocid1.compartment.oc1..aaa,ocid1.compartment.oc1..bbb
    # If set, this overrides OCI_COMPARTMENT_ID and all compartments are queried.
    OCI_COMPARTMENT_IDS: str = ""

    # Human-friendly labels for each compartment (same order, comma-separated)
    # e.g.  OCI_COMPARTMENT_LABELS=prod,stage,shared-infra
    OCI_COMPARTMENT_LABELS: str = ""

    @property
    def compartment_list(self) -> List[dict]:
        """Returns [{"id": "ocid1...", "label": "prod"}, ...] from env vars."""
        if self.OCI_COMPARTMENT_IDS.strip():
            ids = [c.strip() for c in self.OCI_COMPARTMENT_IDS.split(",") if c.strip()]
        elif self.OCI_COMPARTMENT_ID.strip():
            ids = [self.OCI_COMPARTMENT_ID.strip()]
        else:
            return []
        labels = [l.strip() for l in self.OCI_COMPARTMENT_LABELS.split(",") if l.strip()]
        return [
            {"id": cid, "label": labels[i] if i < len(labels) else f"compartment-{i+1}"}
            for i, cid in enumerate(ids)
        ]

    # ── Kubernetes ─────────────────────────────────────────────────────────────
    K8S_CONFIG_FILE: str = "~/.kube/config"
    K8S_IN_CLUSTER: bool = False

    # ── Feature flags ──────────────────────────────────────────────────────────
    USE_MOCK_DATA: bool = True

    # ── SMTP Alerts ────────────────────────────────────────────────────────────
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    ALERT_EMAIL_FROM: str = ""
    ALERT_EMAIL_TO: str = ""

    # ── Alert thresholds ───────────────────────────────────────────────────────
    CPU_ALERT_THRESHOLD: float = 80.0
    MEMORY_ALERT_THRESHOLD: float = 85.0
    ERROR_RATE_ALERT_THRESHOLD: float = 10.0

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()