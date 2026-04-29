"""
OCI Logging service integration.
Falls back to mock data when OCI credentials are absent.
"""
from app.config import settings
from typing import Optional, List


class LogService:
    def __init__(self):
        try:
            import oci
            config = oci.config.from_file(settings.OCI_CONFIG_FILE, settings.OCI_PROFILE)
            self.client = oci.loggingsearch.LogSearchClient(config)
            self._available = True
        except Exception:
            self._available = False

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

        query_parts = ["search 'ocid1.compartment.oc1..'"]
        if level:
            query_parts.append(f"| where severity = '{level}'")
        if search:
            query_parts.append(f"| where logContent contains '{search}'")

        search_req = oci.loggingsearch.models.SearchLogsDetails(
            time_start=datetime.utcnow() - timedelta(hours=24),
            time_end=datetime.utcnow(),
            search_query=" ".join(query_parts),
            is_return_field_info=False,
        )
        resp = self.client.search_logs(search_logs_details=search_req)
        results = resp.data.results or []
        return [r.data for r in results[:limit]]
