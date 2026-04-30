"""
Kubernetes API service layer.
Supports both in-cluster and kubeconfig-based auth.
"""
import os
from app.config import settings


class K8sService:
    def __init__(self):
        try:
            from kubernetes import client, config as k8s_config
            if settings.K8S_IN_CLUSTER:
                k8s_config.load_incluster_config()
            else:
                config_file = settings.K8S_CONFIG_FILE or os.path.expanduser("~/.kube/config")
                k8s_config.load_kube_config(config_file=config_file)
            self.core = client.CoreV1Api()
            self.apps = client.AppsV1Api()
            self._available = True
            print("[K8s] Connected successfully")
        except Exception as e:
            print(f"[K8s] API not available: {e}")
            self._available = False

    def _check(self):
        if not self._available:
            raise RuntimeError("K8s API unavailable")

    def get_nodes(self):
        self._check()
        result = []
        for n in self.core.list_node().items:
            ready = next(
                (c.status for c in n.status.conditions if c.type == "Ready"), "Unknown"
            )
            caps = n.status.capacity or {}
            alloc = n.status.allocatable or {}
            result.append({
                "name":                n.metadata.name,
                "role":                "control-plane" if "node-role.kubernetes.io/control-plane" in (n.metadata.labels or {}) else "worker",
                "status":              "Ready" if ready == "True" else "NotReady",
                "kubelet_version":     n.status.node_info.kubelet_version,
                "os_image":            n.status.node_info.os_image,
                "kernel_version":      n.status.node_info.kernel_version,
                "cpu_capacity":        caps.get("cpu", "0"),
                "memory_capacity":     caps.get("memory", "0"),
                "cpu_allocatable":     alloc.get("cpu", "0"),
                "memory_allocatable":  alloc.get("memory", "0"),
                "cpu_utilization":     0,
                "memory_utilization":  0,
                "pod_count":           0,
                "max_pods":            int(caps.get("pods", "110")),
                "conditions":          [{"type": c.type, "status": c.status} for c in n.status.conditions],
                "age":                 str(n.metadata.creation_timestamp),
                "internal_ip":         next(
                    (a.address for a in (n.status.addresses or []) if a.type == "InternalIP"), ""
                ),
            })
        return result

    def get_pods(self, namespace: str = None):
        self._check()
        if namespace:
            items = self.core.list_namespaced_pod(namespace).items
        else:
            items = self.core.list_pod_for_all_namespaces().items
        result = []
        for p in items:
            container_statuses = p.status.container_statuses or []
            restarts = sum(cs.restart_count for cs in container_statuses)
            phase = p.status.phase or "Unknown"
            # Detect CrashLoopBackOff / OOMKilled from waiting state
            for cs in container_statuses:
                if cs.state and cs.state.waiting:
                    reason = cs.state.waiting.reason or ""
                    if reason in ("CrashLoopBackOff", "OOMKilled", "Error"):
                        phase = reason
                        break
            ready_count = sum(1 for cs in container_statuses if cs.ready)
            total_count = len(container_statuses)
            result.append({
                "name":           p.metadata.name,
                "namespace":      p.metadata.namespace,
                "status":         phase,
                "ready":          f"{ready_count}/{total_count}",
                "restarts":       restarts,
                "app":            (p.metadata.labels or {}).get("app", p.metadata.name.split("-")[0]),
                "environment":    (p.metadata.labels or {}).get("environment", p.metadata.namespace),
                "node":           p.spec.node_name or "",
                "cpu_request":    next(
                    (c.resources.requests.get("cpu", "0") for c in p.spec.containers if c.resources and c.resources.requests), "0"
                ),
                "memory_request": next(
                    (c.resources.requests.get("memory", "0") for c in p.spec.containers if c.resources and c.resources.requests), "0"
                ),
                "cpu_usage":      0,
                "memory_usage":   0,
                "age":            str(p.metadata.creation_timestamp),
                "image":          p.spec.containers[0].image if p.spec.containers else "",
                "health_score":   100 if phase == "Running" else (50 if phase == "Pending" else 0),
            })
        return result

    def get_namespaces(self):
        self._check()
        return [ns.metadata.name for ns in self.core.list_namespace().items]

    def get_events(self):
        self._check()
        result = []
        for e in self.core.list_event_for_all_namespaces().items:
            result.append({
                "reason":     e.reason or "",
                "type":       e.type or "Normal",
                "message":    e.message or "",
                "namespace":  e.metadata.namespace,
                "object":     f"{e.involved_object.kind}/{e.involved_object.name}",
                "count":      e.count or 1,
                "first_time": str(e.first_timestamp),
                "last_time":  str(e.last_timestamp),
            })
        result.sort(key=lambda x: x["last_time"] or "", reverse=True)
        return result[:50]
