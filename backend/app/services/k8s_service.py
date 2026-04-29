"""
Kubernetes API service layer.
Supports both in-cluster and kubeconfig-based auth.
"""
from app.config import settings


class K8sService:
    def __init__(self):
        try:
            from kubernetes import client, config as k8s_config
            if settings.K8S_IN_CLUSTER:
                k8s_config.load_incluster_config()
            else:
                k8s_config.load_kube_config(config_file=settings.K8S_CONFIG_FILE)
            self.core = client.CoreV1Api()
            self.apps = client.AppsV1Api()
            self._available = True
        except Exception as e:
            print(f"[K8s] API not available: {e}")
            self._available = False

    def get_nodes(self):
        if not self._available:
            raise RuntimeError("K8s API unavailable")
        nodes = self.core.list_node().items
        result = []
        for n in nodes:
            ready = next(
                (c.status for c in n.status.conditions if c.type == "Ready"), "Unknown"
            )
            result.append(
                {
                    "name": n.metadata.name,
                    "status": "Ready" if ready == "True" else "NotReady",
                    "kubelet_version": n.status.node_info.kubelet_version,
                    "os_image": n.status.node_info.os_image,
                    "cpu_capacity": n.status.capacity.get("cpu", "0"),
                    "memory_capacity": n.status.capacity.get("memory", "0"),
                    "cpu_utilization": 0,
                    "memory_utilization": 0,
                }
            )
        return result

    def get_pods(self, namespace: str = None):
        if not self._available:
            raise RuntimeError("K8s API unavailable")
        if namespace:
            pods = self.core.list_namespaced_pod(namespace).items
        else:
            pods = self.core.list_pod_for_all_namespaces().items
        result = []
        for p in pods:
            result.append(
                {
                    "name": p.metadata.name,
                    "namespace": p.metadata.namespace,
                    "status": p.status.phase or "Unknown",
                    "restarts": sum(
                        (cs.restart_count for cs in (p.status.container_statuses or [])), 0
                    ),
                    "node": p.spec.node_name,
                    "age": str(p.metadata.creation_timestamp),
                    "cpu_usage": 0,
                    "memory_usage": 0,
                }
            )
        return result
