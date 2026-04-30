"""
OCI Logging search service.
Uses the same auth as OCIService (instance_principal on OCI VMs).
"""
from app.config import settings
from typing import Optional, List


class LogService:
    def __init__(self):
        self._available = False
        try:
            import oci
            from app.services.oci_service import _build_oci_config
            config, signer = _build_oci_config()
            kwargs = {"config": config}
            if signer:
                kwargs["signer"] = signer
            self.client = oci.loggingsearch.LogSearchClient(**kwargs)
            self._available = True
        except Exception as e:
            print(f"[Logs] LogService unavailable: {e}")

    def get_logs(
        self,
        level: Optional[str] = None,
        service: Optional[str] = None,
        environment: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 100,
    ) -> List[dict]:
        if not self._available:
            raise RuntimeError("OCI Logging unavailable")

        import oci
        from datetime import datetime, timedelta

        compartment_id = settings.compartment_list[0]["id"]
        query = f"search '{compartment_id}'"
        if level:
            query += f" | where severity = '{level.upper()}'"
        if search:
            query += f" | where logContent contains '{search}'"

        details = oci.loggingsearch.models.SearchLogsDetails(
            time_start=datetime.utcnow() - timedelta(hours=24),
            time_end=datetime.utcnow(),
            search_query=query,
            is_return_field_info=False,
        )
        resp = self.client.search_logs(search_logs_details=details)
        results = resp.data.results or []
        return [r.data for r in results[:limit]]
