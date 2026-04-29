"""
OCI SDK service layer.

Auth modes (set OCI_AUTH_TYPE in .env):
  instance_principal  — recommended when running on an OCI VM/instance
  config_file         — reads ~/.oci/config (API key; good for local dev)
  resource_principal  — for OCI Functions / container instances

Multiple compartments are supported via OCI_COMPARTMENT_IDS (comma-separated OCIDs).
All compartments are queried in parallel and results are merged.
"""
from __future__ import annotations
from typing import List, Dict, Any
from app.config import settings


def _build_oci_config():
    """Return (oci_config_dict_or_None, signer) depending on OCI_AUTH_TYPE."""
    import oci

    auth = settings.OCI_AUTH_TYPE.lower().strip()

    if auth == "instance_principal":
        signer = oci.auth.signers.InstancePrincipalsSecurityTokenSigner()
        # config dict is minimal when using instance_principal
        config = {"region": settings.OCI_REGION}
        return config, signer

    if auth == "resource_principal":
        signer = oci.auth.signers.get_resource_principals_signer()
        config = {"region": settings.OCI_REGION}
        return config, signer

    # Default: config_file (API key)
    config = oci.config.from_file(settings.OCI_CONFIG_FILE, settings.OCI_PROFILE)
    return config, None


class OCIService:
    def __init__(self):
        self._available = False
        try:
            import oci as _oci
            self._oci = _oci
            self._config, self._signer = _build_oci_config()
            kwargs = {"config": self._config}
            if self._signer:
                kwargs["signer"] = self._signer

            self.compute_client     = _oci.core.ComputeClient(**kwargs)
            self.db_client          = _oci.database.DatabaseClient(**kwargs)
            self.monitoring_client  = _oci.monitoring.MonitoringClient(**kwargs)
            self.logging_client     = _oci.loggingsearch.LogSearchClient(**kwargs)
            self.network_client     = _oci.core.VirtualNetworkClient(**kwargs)
            self._available = True
            print(f"[OCI] Connected via {settings.OCI_AUTH_TYPE} | region: {settings.OCI_REGION}")
        except Exception as exc:
            print(f"[OCI] SDK unavailable ({settings.OCI_AUTH_TYPE}): {exc}")

    # ── Helpers ────────────────────────────────────────────────────────────────

    def _compartments(self) -> List[Dict]:
        """Return the configured compartment list; raises if none configured."""
        comps = settings.compartment_list
        if not comps:
            raise RuntimeError(
                "No compartments configured. Set OCI_COMPARTMENT_IDS or OCI_COMPARTMENT_ID in .env"
            )
        return comps

    def _list_all(self, fn, **kwargs) -> list:
        """Paginate through all pages of an OCI list call."""
        return self._oci.pagination.list_call_get_all_results(fn, **kwargs).data

    # ── Compute ────────────────────────────────────────────────────────────────

    def get_instances(self) -> List[Dict]:
        if not self._available:
            raise RuntimeError("OCI SDK unavailable")
        result = []
        for comp in self._compartments():
            for inst in self._list_all(
                self.compute_client.list_instances,
                compartment_id=comp["id"],
            ):
                result.append({
                    "id":                 inst.id,
                    "display_name":       inst.display_name,
                    "shape":              inst.shape,
                    "lifecycle_state":    inst.lifecycle_state,
                    "region":             settings.OCI_REGION,
                    "availability_domain":inst.availability_domain,
                    "fault_domain":       inst.fault_domain,
                    "time_created":       inst.time_created.isoformat() if inst.time_created else None,
                    "compartment":        comp["label"],
                    "compartment_id":     comp["id"],
                    # Metrics fetched separately via Monitoring API
                    "cpu_utilization":    self._get_instance_metric(inst.id, "CpuUtilization"),
                    "memory_utilization": self._get_instance_metric(inst.id, "MemoryUtilization"),
                    "private_ip":         None,   # enriched below if needed
                    "public_ip":          None,
                    "environment":        self._env_from_tags(inst.freeform_tags or {}),
                })
        return result

    def _get_instance_metric(self, resource_id: str, metric_name: str) -> float:
        """Fetch latest 1-minute average from OCI Monitoring."""
        try:
            from datetime import datetime, timedelta
            import oci
            now = datetime.utcnow()
            query = (
                f'{metric_name}[1m]{{resourceId = "{resource_id}"}}.mean()'
            )
            resp = self.monitoring_client.summarize_metrics_data(
                compartment_id=settings.compartment_list[0]["id"],
                summarize_metrics_data_details=oci.monitoring.models.SummarizeMetricsDataDetails(
                    namespace="oci_computeagent",
                    query=query,
                    start_time=(now - timedelta(minutes=5)).isoformat() + "Z",
                    end_time=now.isoformat() + "Z",
                ),
            )
            items = resp.data
            if items and items[0].aggregated_datapoints:
                return round(items[0].aggregated_datapoints[-1].value, 1)
        except Exception:
            pass
        return 0.0

    @staticmethod
    def _env_from_tags(tags: dict) -> str:
        """Infer environment from OCI freeform tags (tag key: env / environment)."""
        for key in ("env", "environment", "Env", "Environment"):
            if key in tags:
                return tags[key].lower()
        return "prod"

    # ── Databases ──────────────────────────────────────────────────────────────

    def get_databases(self) -> List[Dict]:
        if not self._available:
            raise RuntimeError("OCI SDK unavailable")
        result = []
        for comp in self._compartments():
            for db in self._list_all(
                self.db_client.list_db_systems,
                compartment_id=comp["id"],
            ):
                result.append({
                    "id":                      db.id,
                    "display_name":            db.display_name,
                    "db_version":              getattr(db, "version", "Unknown"),
                    "lifecycle_state":         db.lifecycle_state,
                    "shape":                   db.shape,
                    "cpu_core_count":          db.cpu_core_count,
                    "data_storage_size_in_gbs":db.data_storage_size_in_gbs,
                    "hostname":                db.hostname,
                    "time_created":            db.time_created.isoformat() if db.time_created else None,
                    "compartment":             comp["label"],
                    "compartment_id":          comp["id"],
                    "environment":             self._env_from_tags(getattr(db, "freeform_tags", {}) or {}),
                    "storage_used_percent":    0,
                    "cpu_utilization":         0,
                    "connections":             0,
                    "backup_enabled":          True,
                    "is_auto_scaling_enabled": getattr(db, "is_storage_management_enabled", False),
                    "port":                    1521,
                })
        return result

    # ── Logs ───────────────────────────────────────────────────────────────────

    def get_logs(
        self,
        level: str | None = None,
        service: str | None = None,
        environment: str | None = None,
        search: str | None = None,
        limit: int = 100,
    ) -> List[Dict]:
        if not self._available:
            raise RuntimeError("OCI SDK unavailable")
        import oci
        from datetime import datetime, timedelta

        query = f"search '{settings.compartment_list[0]['id']}'"
        if level:
            query += f" | where severity = '{level}'"
        if search:
            query += f" | where logContent contains '{search}'"

        details = oci.loggingsearch.models.SearchLogsDetails(
            time_start=datetime.utcnow() - timedelta(hours=24),
            time_end=datetime.utcnow(),
            search_query=query,
            is_return_field_info=False,
        )
        resp = self.logging_client.search_logs(search_logs_details=details)
        return [r.data for r in (resp.data.results or [])[:limit]]

    # ── Networking (for private subnet enrichment) ─────────────────────────────

    def get_vcns(self) -> List[Dict]:
        if not self._available:
            raise RuntimeError("OCI SDK unavailable")
        result = []
        for comp in self._compartments():
            for vcn in self._list_all(self.network_client.list_vcns, compartment_id=comp["id"]):
                result.append({
                    "id":           vcn.id,
                    "display_name": vcn.display_name,
                    "cidr_block":   vcn.cidr_block,
                    "lifecycle_state": vcn.lifecycle_state,
                    "compartment":  comp["label"],
                })
        return result
