"""
Realistic mock data for OciPulse when USE_MOCK_DATA=true.
All data mimics the shape of real OCI SDK / Kubernetes API responses.
"""
import random
import string
from datetime import datetime, timedelta
from typing import List, Dict, Any


def _rand_id(prefix: str = "ocid1") -> str:
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=24))
    return f"{prefix}..{suffix}"


def _rand_time(days_back: int = 180) -> str:
    delta = timedelta(
        days=random.randint(0, days_back),
        hours=random.randint(0, 23),
        minutes=random.randint(0, 59),
    )
    return (datetime.utcnow() - delta).isoformat() + "Z"


def _weighted_status(choices, weights):
    return random.choices(choices, weights=weights, k=1)[0]


# ── Compute Instances ──────────────────────────────────────────────────────────

def get_mock_compute_instances() -> List[Dict]:
    envs = ["prod", "prod", "prod", "stage", "stage", "dev", "dev", "dev"]
    shapes = ["VM.Standard.E4.Flex", "VM.Standard3.Flex", "VM.Optimized3.Flex", "BM.Standard.E4.128"]
    instances = []
    for i in range(10):
        env = envs[i % len(envs)]
        status = _weighted_status(
            ["RUNNING", "STOPPED", "STOPPING", "STARTING"],
            [80, 10, 5, 5],
        )
        ocpus = random.choice([2, 4, 8, 16])
        mem = ocpus * 8
        cpu_util = round(random.uniform(8, 92), 1) if status == "RUNNING" else 0.0
        mem_util = round(random.uniform(20, 88), 1) if status == "RUNNING" else 0.0
        instances.append(
            {
                "id": _rand_id(),
                "display_name": f"oci-{env}-vm-{i + 1:02d}",
                "shape": random.choice(shapes),
                "lifecycle_state": status,
                "region": "us-ashburn-1",
                "availability_domain": f"AD-{random.randint(1, 3)}",
                "environment": env,
                "cpu_ocpus": ocpus,
                "memory_in_gbs": mem,
                "cpu_utilization": cpu_util,
                "memory_utilization": mem_util,
                "public_ip": f"129.{random.randint(100,200)}.{random.randint(0,255)}.{random.randint(1,254)}" if status == "RUNNING" else None,
                "private_ip": f"10.0.{random.randint(1, 10)}.{random.randint(10, 254)}",
                "time_created": _rand_time(365),
                "fault_domain": f"FAULT-DOMAIN-{random.randint(1, 3)}",
            }
        )
    return instances


# ── Kubernetes ─────────────────────────────────────────────────────────────────

def get_mock_nodes() -> List[Dict]:
    roles = ["control-plane", "worker", "worker", "worker", "worker"]
    nodes = []
    for i, role in enumerate(roles):
        cpu_alloc = random.uniform(40, 85)
        mem_alloc = random.uniform(35, 80)
        nodes.append(
            {
                "name": f"oci-node-{i + 1:02d}",
                "role": role,
                "status": "Ready",
                "os_image": "Oracle Linux 8.8",
                "kernel_version": "5.15.0-1.el8uek.x86_64",
                "kubelet_version": "v1.28.3",
                "cpu_capacity": "8",
                "memory_capacity": "32Gi",
                "cpu_allocatable": f"{round(8 * (1 - cpu_alloc / 100), 2)}",
                "memory_allocatable": f"{round(32 * (1 - mem_alloc / 100), 2)}Gi",
                "cpu_utilization": round(cpu_alloc, 1),
                "memory_utilization": round(mem_alloc, 1),
                "pod_count": random.randint(8, 24),
                "max_pods": 110,
                "conditions": [{"type": "Ready", "status": "True"}],
                "age": f"{random.randint(10, 300)}d",
                "internal_ip": f"10.0.{i + 1}.10",
            }
        )
    return nodes


def get_mock_namespaces() -> List[str]:
    return ["default", "kube-system", "monitoring", "prod", "stage", "dev", "ingress-nginx", "cert-manager"]


def get_mock_pods(namespace: str = None, environment: str = None) -> List[Dict]:
    apps = [
        ("api-gateway", "prod"), ("auth-service", "prod"), ("user-service", "prod"),
        ("payment-service", "prod"), ("notification-svc", "prod"),
        ("api-gateway", "stage"), ("auth-service", "stage"), ("user-service", "stage"),
        ("frontend-app", "prod"), ("frontend-app", "stage"),
        ("redis-cache", "prod"), ("postgres-primary", "prod"),
        ("kafka-broker", "prod"), ("elasticsearch", "prod"),
        ("worker-processor", "dev"), ("batch-job", "dev"),
    ]
    pods = []
    for i, (app, env) in enumerate(apps):
        if environment and env != environment:
            continue
        ns = env if env in ["prod", "stage", "dev"] else "default"
        if namespace and ns != namespace:
            continue

        restarts = random.choices([0, 0, 0, 1, 3, 8, 15], weights=[50, 20, 10, 8, 5, 4, 3])[0]
        status = _weighted_status(
            ["Running", "Running", "Running", "Pending", "CrashLoopBackOff", "OOMKilled", "Completed"],
            [70, 70, 70, 5, 3, 2, 2],
        )
        pods.append(
            {
                "name": f"{app}-{random.randint(10000,99999)}-{''.join(random.choices('abcdefghijklmnopqrstuvwxyz', k=5))}",
                "namespace": ns,
                "status": status,
                "ready": f"{'1/1' if status == 'Running' else '0/1'}",
                "restarts": restarts,
                "app": app,
                "environment": env,
                "node": f"oci-node-0{random.randint(1, 5)}",
                "cpu_request": f"{random.choice([100, 200, 250, 500])}m",
                "memory_request": f"{random.choice([128, 256, 512, 1024])}Mi",
                "cpu_usage": round(random.uniform(5, 75), 1) if status == "Running" else 0,
                "memory_usage": round(random.uniform(50, 800), 0),
                "age": f"{random.randint(0, 30)}d{random.randint(0, 23)}h",
                "image": f"iad.ocir.io/mytenancy/{app}:v{random.randint(1,5)}.{random.randint(0,9)}.{random.randint(0,20)}",
                "health_score": random.randint(60, 100) if status == "Running" else random.randint(0, 40),
            }
        )
    return pods


def get_mock_events() -> List[Dict]:
    reasons = [
        ("Pulled", "Normal", "Successfully pulled image"),
        ("Started", "Normal", "Started container"),
        ("BackOff", "Warning", "Back-off restarting failed container"),
        ("OOMKilling", "Warning", "Out of memory: Kill process"),
        ("NodeNotReady", "Warning", "Node is not ready"),
        ("Scheduled", "Normal", "Successfully assigned pod"),
        ("FailedScheduling", "Warning", "Insufficient memory"),
    ]
    events = []
    for i in range(20):
        r = random.choice(reasons)
        events.append(
            {
                "reason": r[0],
                "type": r[1],
                "message": r[2],
                "namespace": random.choice(["prod", "stage", "dev", "default"]),
                "object": f"pod/{random.choice(['api-gateway','auth-service','user-service'])}-{random.randint(10000,99999)}-xxxxx",
                "count": random.randint(1, 50),
                "first_time": _rand_time(2),
                "last_time": _rand_time(0),
            }
        )
    return sorted(events, key=lambda x: x["last_time"], reverse=True)


# ── Databases ──────────────────────────────────────────────────────────────────

def get_mock_databases() -> List[Dict]:
    dbs = [
        ("prod-postgres-primary", "PostgreSQL 14", "prod", "AVAILABLE"),
        ("prod-postgres-replica", "PostgreSQL 14", "prod", "AVAILABLE"),
        ("stage-postgres", "PostgreSQL 14", "stage", "AVAILABLE"),
        ("prod-mysql-main", "MySQL 8.0", "prod", "AVAILABLE"),
        ("dev-postgres", "PostgreSQL 15", "dev", "STOPPED"),
        ("prod-autonomous-oltp", "Autonomous Database", "prod", "AVAILABLE"),
    ]
    result = []
    for name, engine, env, status in dbs:
        result.append(
            {
                "id": _rand_id(),
                "display_name": name,
                "db_version": engine,
                "lifecycle_state": status,
                "environment": env,
                "shape": "VM.Standard.E4.Flex" if "autonomous" not in name else "ECPU",
                "cpu_core_count": random.choice([2, 4, 8]),
                "data_storage_size_in_gbs": random.choice([256, 512, 1024, 2048]),
                "storage_used_percent": round(random.uniform(20, 75), 1),
                "cpu_utilization": round(random.uniform(10, 65), 1) if status == "AVAILABLE" else 0,
                "connections": random.randint(5, 120) if status == "AVAILABLE" else 0,
                "time_created": _rand_time(400),
                "hostname": f"{name}.subnet.vcn.oraclevcn.com",
                "port": 5432 if "postgres" in name else 3306,
                "is_auto_scaling_enabled": random.choice([True, False]),
                "backup_enabled": True,
            }
        )
    return result


# ── Logs ───────────────────────────────────────────────────────────────────────

_LOG_TEMPLATES = {
    "ERROR": [
        "Connection refused to database host postgres-primary:5432 after 3 retries",
        "NullPointerException in PaymentService.processTransaction() at line 247",
        "HTTP 500 Internal Server Error: upstream service unavailable",
        "OOMKilled: container exceeded memory limit of 512Mi",
        "Failed to acquire distributed lock: timeout after 30s",
        "Certificate validation failed: cert expired 2 days ago",
        "Kafka consumer group lag exceeded threshold: 50000 messages behind",
        "Database query timeout after 30000ms: SELECT * FROM orders WHERE status=?",
    ],
    "WARNING": [
        "High memory usage detected: 84% of limit",
        "Slow query detected: took 2341ms (threshold: 1000ms)",
        "Retry attempt 2/3 connecting to auth-service",
        "JWT token expiring in 5 minutes for user session",
        "Rate limit approaching: 950/1000 requests per minute",
        "Disk usage at 78% on /data volume",
        "Cache hit rate dropped to 62% (expected >80%)",
        "Connection pool utilization: 90% (45/50 connections in use)",
    ],
    "INFO": [
        "Request processed successfully: POST /api/v1/payments in 145ms",
        "User authentication successful: user_id=12345",
        "Cache warmed: 1250 entries loaded in 2.3s",
        "Scheduled job completed: daily-report in 45s",
        "Health check passed: all downstream services responding",
        "Deployment completed: api-gateway v2.4.1 rolled out to 3/3 pods",
        "Backup completed successfully: 2.3GB in 87s",
        "Auto-scaling event: scaled user-service from 2 to 4 replicas",
    ],
}

_SERVICES = ["api-gateway", "auth-service", "user-service", "payment-service",
             "notification-svc", "frontend-app", "redis-cache", "kafka-broker"]


def get_mock_logs(
    level: str = None,
    service: str = None,
    environment: str = None,
    search: str = None,
    limit: int = 100,
) -> List[Dict]:
    logs = []
    now = datetime.utcnow()
    for i in range(300):
        lvl = _weighted_status(
            ["INFO", "INFO", "WARNING", "ERROR"],
            [60, 30, 7, 3],
        )
        svc = random.choice(_SERVICES)
        env = random.choice(["prod", "prod", "stage", "dev"])
        msg = random.choice(_LOG_TEMPLATES[lvl])
        ts = now - timedelta(
            hours=random.randint(0, 23),
            minutes=random.randint(0, 59),
            seconds=random.randint(0, 59),
        )
        logs.append(
            {
                "id": f"log-{i:05d}",
                "timestamp": ts.isoformat() + "Z",
                "level": lvl,
                "service": svc,
                "namespace": env,
                "environment": env,
                "message": msg,
                "pod": f"{svc}-{random.randint(10000,99999)}-{''.join(random.choices('abcdefghijklmnopqrstuvwxyz', k=5))}",
                "trace_id": "".join(random.choices(string.hexdigits[:16], k=32)),
            }
        )

    if level:
        logs = [l for l in logs if l["level"] == level.upper()]
    if service:
        logs = [l for l in logs if service.lower() in l["service"].lower()]
    if environment:
        logs = [l for l in logs if l["environment"] == environment]
    if search:
        logs = [l for l in logs if search.lower() in l["message"].lower() or search.lower() in l["service"].lower()]

    logs.sort(key=lambda x: x["timestamp"], reverse=True)
    return logs[:limit]


def get_log_summary() -> Dict:
    logs = get_mock_logs()
    return {
        "total": len(logs),
        "error": sum(1 for l in logs if l["level"] == "ERROR"),
        "warning": sum(1 for l in logs if l["level"] == "WARNING"),
        "info": sum(1 for l in logs if l["level"] == "INFO"),
        "by_service": {
            svc: {
                "error": sum(1 for l in logs if l["service"] == svc and l["level"] == "ERROR"),
                "warning": sum(1 for l in logs if l["service"] == svc and l["level"] == "WARNING"),
                "info": sum(1 for l in logs if l["service"] == svc and l["level"] == "INFO"),
            }
            for svc in _SERVICES
        },
    }


# ── Metrics (time-series) ──────────────────────────────────────────────────────

def get_mock_metrics(hours: int = 24, interval_minutes: int = 5) -> Dict:
    now = datetime.utcnow()
    points = (hours * 60) // interval_minutes
    cpu_base = random.uniform(35, 55)
    mem_base = random.uniform(45, 65)
    net_base = random.uniform(50, 200)

    def wave(base: float, t: int, noise: float = 8.0) -> float:
        import math
        v = base + math.sin(t * 0.1) * 10 + random.gauss(0, noise)
        return round(max(5.0, min(98.0, v)), 1)

    timestamps = [
        (now - timedelta(minutes=(points - i) * interval_minutes)).strftime("%H:%M")
        for i in range(points)
    ]
    return {
        "timestamps": timestamps,
        "cpu": [wave(cpu_base, i) for i in range(points)],
        "memory": [wave(mem_base, i, noise=4.0) for i in range(points)],
        "network_in": [round(random.uniform(net_base * 0.5, net_base * 1.5), 1) for _ in range(points)],
        "network_out": [round(random.uniform(net_base * 0.3, net_base), 1) for _ in range(points)],
        "disk_read": [round(random.uniform(5, 80), 1) for _ in range(points)],
        "disk_write": [round(random.uniform(2, 60), 1) for _ in range(points)],
    }


# ── Alerts ─────────────────────────────────────────────────────────────────────

_ALL_ALERT_CANDIDATES = [
    ("HIGH_CPU",        "critical", "api-gateway",       lambda: f"CPU utilization at {random.randint(81,97)}% (threshold: 80%)",           "prod"),
    ("HIGH_CPU",        "critical", "user-service",      lambda: f"CPU utilization at {random.randint(81,95)}% (threshold: 80%)",           "prod"),
    ("OOM_KILL",        "critical", "payment-service",   lambda: f"Container OOMKilled — exceeded {random.choice([512,768,1024])}Mi limit", "prod"),
    ("POD_CRASH",       "warning",  "notification-svc",  lambda: f"Pod restarted {random.randint(5,15)} times in the last hour",            "stage"),
    ("POD_CRASH",       "critical", "auth-service",      lambda: f"CrashLoopBackOff: {random.randint(3,12)} restarts, last exit code 137",  "prod"),
    ("HIGH_MEMORY",     "warning",  "user-service",      lambda: f"Memory at {random.randint(80,89)}% (threshold: 85%)",                   "prod"),
    ("HIGH_MEMORY",     "warning",  "redis-cache",       lambda: f"Memory at {random.randint(80,92)}% — eviction rate increasing",         "prod"),
    ("SLOW_QUERY",      "warning",  "postgres-primary",  lambda: f"Avg query time {round(random.uniform(3.1,9.9),1)}s (threshold: 2s)",    "prod"),
    ("LOG_ERROR_SPIKE", "warning",  "auth-service",      lambda: f"Error rate {random.randint(20,80)} errors/min (threshold: 10)",         "prod"),
    ("DISK_USAGE",      "warning",  "oci-node-03",       lambda: f"Disk usage at {random.randint(75,89)}% on /data volume",               "prod"),
    ("DISK_USAGE",      "info",     "oci-node-01",       lambda: f"Disk usage at {random.randint(65,79)}% on /var volume",                "prod"),
    ("NODE_PRESSURE",   "warning",  "oci-node-02",       lambda: f"Memory pressure condition detected — {random.randint(1,3)} pods evicted","prod"),
    ("CERT_EXPIRY",     "warning",  "ingress-nginx",     lambda: f"TLS certificate expires in {random.randint(3,14)} days",               "prod"),
    ("KAFKA_LAG",       "info",     "kafka-broker",      lambda: f"Consumer group lag: {random.randint(5000,80000)} messages behind",      "prod"),
    ("DB_CONN",         "info",     "postgres-primary",  lambda: f"Connection pool at {random.randint(80,95)}% ({random.randint(40,48)}/50 conns)", "prod"),
]


def get_mock_alerts() -> List[Dict]:
    # Randomly pick 3–6 active alerts from the candidate pool each call
    n_active = random.randint(3, 6)
    active_pool = random.sample(_ALL_ALERT_CANDIDATES, k=min(n_active, len(_ALL_ALERT_CANDIDATES)))

    alerts = []
    for i, (atype, severity, resource, msg_fn, env) in enumerate(active_pool):
        alerts.append({
            "id": f"alert-{random.randint(1000, 9999):04d}",
            "type": atype,
            "severity": severity,
            "resource": resource,
            "message": msg_fn(),          # call lambda → fresh value each request
            "environment": env,
            "status": "active",
            "triggered_at": _rand_time(1),
            "resolved_at": None,
            "notification_sent": random.choice([True, True, False]),
        })

    # Add 2–3 recently resolved alerts
    resolved_pool = [c for c in _ALL_ALERT_CANDIDATES if c not in active_pool]
    for j, (atype, severity, resource, msg_fn, env) in enumerate(random.sample(resolved_pool, k=min(3, len(resolved_pool)))):
        alerts.append({
            "id": f"alert-r{random.randint(100, 999):03d}",
            "type": atype,
            "severity": severity,
            "resource": resource,
            "message": msg_fn(),
            "environment": env,
            "status": "resolved",
            "triggered_at": _rand_time(2),
            "resolved_at": _rand_time(0),
            "notification_sent": True,
        })
    return alerts


def get_mock_alert_rules() -> List[Dict]:
    return [
        {"id": "rule-001", "name": "High CPU", "metric": "cpu_utilization", "operator": ">", "threshold": 80, "severity": "critical", "enabled": True, "notify_email": True},
        {"id": "rule-002", "name": "High Memory", "metric": "memory_utilization", "operator": ">", "threshold": 85, "severity": "warning", "enabled": True, "notify_email": True},
        {"id": "rule-003", "name": "Pod Crash Loop", "metric": "pod_restarts", "operator": ">", "threshold": 5, "severity": "critical", "enabled": True, "notify_email": True},
        {"id": "rule-004", "name": "Log Error Rate", "metric": "error_count", "operator": ">", "threshold": 10, "severity": "warning", "enabled": True, "notify_email": False},
        {"id": "rule-005", "name": "DB Storage", "metric": "storage_used_percent", "operator": ">", "threshold": 80, "severity": "warning", "enabled": False, "notify_email": True},
    ]


# ── Dashboard Summary ──────────────────────────────────────────────────────────

def get_dashboard_summary() -> Dict:
    instances = get_mock_compute_instances()
    pods = get_mock_pods()
    dbs = get_mock_databases()
    alerts = get_mock_alerts()
    log_summary = get_log_summary()

    running_instances = sum(1 for i in instances if i["lifecycle_state"] == "RUNNING")
    running_pods = sum(1 for p in pods if p["status"] == "Running")
    active_alerts = sum(1 for a in alerts if a["status"] == "active")
    critical_alerts = sum(1 for a in alerts if a["status"] == "active" and a["severity"] == "critical")

    avg_cpu = round(
        sum(i["cpu_utilization"] for i in instances if i["lifecycle_state"] == "RUNNING") / max(running_instances, 1), 1
    )
    avg_mem = round(
        sum(i["memory_utilization"] for i in instances if i["lifecycle_state"] == "RUNNING") / max(running_instances, 1), 1
    )

    return {
        "compute": {
            "total": len(instances),
            "running": running_instances,
            "stopped": sum(1 for i in instances if i["lifecycle_state"] == "STOPPED"),
            "avg_cpu": avg_cpu,
            "avg_memory": avg_mem,
        },
        "kubernetes": {
            "total_pods": len(pods),
            "running_pods": running_pods,
            "failed_pods": sum(1 for p in pods if p["status"] in ["CrashLoopBackOff", "OOMKilled", "Error"]),
            "pending_pods": sum(1 for p in pods if p["status"] == "Pending"),
            "total_nodes": 5,
            "ready_nodes": 5,
        },
        "databases": {
            "total": len(dbs),
            "available": sum(1 for d in dbs if d["lifecycle_state"] == "AVAILABLE"),
            "stopped": sum(1 for d in dbs if d["lifecycle_state"] == "STOPPED"),
        },
        "alerts": {
            "active": active_alerts,
            "critical": critical_alerts,
            "warning": sum(1 for a in alerts if a["status"] == "active" and a["severity"] == "warning"),
        },
        "logs": {
            "errors_last_hour": log_summary["error"],
            "warnings_last_hour": log_summary["warning"],
        },
        # Deduct points for failures + high resource usage so score varies each call
        "health_score": max(
            0,
            100
            - (critical_alerts * 15)
            - (sum(1 for a in alerts if a["status"] == "active" and a["severity"] == "warning") * 5)
            - (sum(1 for p in pods if p["status"] in ["CrashLoopBackOff", "OOMKilled"]) * 8)
            - (max(0, avg_cpu - 75) * 2)
            - (max(0, avg_mem - 80) * 1),
        ),
    }


# ── Topology ───────────────────────────────────────────────────────────────────

def get_mock_topology() -> Dict:
    nodes = get_mock_nodes()
    pods = get_mock_pods()
    services = [
        {"name": "api-gateway-svc", "type": "LoadBalancer", "port": 80, "pods": ["api-gateway"]},
        {"name": "auth-service-svc", "type": "ClusterIP", "port": 8080, "pods": ["auth-service"]},
        {"name": "user-service-svc", "type": "ClusterIP", "port": 8081, "pods": ["user-service"]},
        {"name": "payment-service-svc", "type": "ClusterIP", "port": 8082, "pods": ["payment-service"]},
        {"name": "postgres-svc", "type": "ClusterIP", "port": 5432, "pods": ["postgres-primary"]},
    ]
    return {"nodes": nodes, "pods": pods, "services": services}
