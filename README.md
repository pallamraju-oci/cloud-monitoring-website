# OciPulse — Lightweight OCI Observability Platform

A production-ready monitoring dashboard for Oracle Cloud Infrastructure (OCI) with Kubernetes support.
Dark-themed, zero-cost, and runs entirely on OCI free tier.

---

## Features

| Feature | Details |
|---------|---------|
| **Dashboard** | Real-time KPI cards, CPU/memory charts, pod distribution |
| **Kubernetes** | Node health, pod table, namespace filter, events feed |
| **Compute** | OCI VM instance status, CPU/memory per instance |
| **Databases** | OCI DB systems + Autonomous DB status |
| **Logs** | Aggregated logs with ERROR/WARNING/INFO filter, search |
| **Alerts** | Active alerts, configurable rules, email notifications |
| **Topology** | Node → Pod → Service dependency view + incident timeline |
| **Auth** | JWT-based login, protected routes |
| **Mock mode** | Full demo with realistic data (no OCI credentials needed) |

---

## Quick Start (Development)

### Prerequisites
- Python 3.11+
- Node.js 20+

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
# .env already set with USE_MOCK_DATA=true for demo
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/api/docs

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open: http://localhost:5173

**Login:** `admin` / `admin123`

---

## Docker (Production)

```bash
# Copy and configure
cp .env.example .env

# Start everything
docker-compose up -d
```

Open: http://localhost:80

---

## OCI Integration (Real Data)

Set `USE_MOCK_DATA=false` in `backend/.env` and configure:

```env
USE_MOCK_DATA=false
OCI_CONFIG_FILE=~/.oci/config
OCI_PROFILE=DEFAULT
OCI_REGION=us-ashburn-1
OCI_COMPARTMENT_ID=ocid1.compartment.oc1..xxxx
```

Requires valid `~/.oci/config` with API key auth.

## Kubernetes Integration

```env
K8S_CONFIG_FILE=~/.kube/config
K8S_IN_CLUSTER=false   # set true when running inside the cluster
```

## Email Alerts (SMTP)

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your@gmail.com
SMTP_PASSWORD=your-app-password
ALERT_EMAIL_FROM=alerts@yourcompany.com
ALERT_EMAIL_TO=oncall@yourcompany.com
```

---

## Project Structure

```
oci-monitoring/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI entry point
│   │   ├── config.py         # Settings (pydantic-settings)
│   │   ├── auth.py           # JWT auth
│   │   ├── api/              # Route handlers per domain
│   │   └── services/         # OCI SDK, K8s, alert, log services
│   ├── utils/
│   │   ├── mock_data.py      # Realistic demo data generator
│   │   └── helpers.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Router + protected routes
│   │   ├── pages/            # Dashboard, K8s, Compute, DBs, Logs, Alerts, Topology
│   │   ├── components/       # Layout, Charts, Common UI
│   │   ├── hooks/            # useApi (with auto-refresh)
│   │   ├── services/api.js   # Axios API client
│   │   └── store/authStore.js# Zustand JWT auth store
│   ├── public/logo.svg       # OciPulse SVG logo
│   ├── tailwind.config.js
│   ├── vite.config.js        # Proxies /api → :8000
│   └── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Get JWT token |
| GET | `/api/metrics/dashboard` | Dashboard summary |
| GET | `/api/metrics/timeseries?hours=24` | CPU/memory time-series |
| GET | `/api/metrics/topology` | Topology data |
| GET | `/api/compute/instances` | VM instances |
| GET | `/api/kubernetes/pods` | Pod list |
| GET | `/api/kubernetes/nodes` | Node list |
| GET | `/api/database/systems` | DB systems |
| GET | `/api/logs/?level=ERROR&service=api-gateway` | Filtered logs |
| GET | `/api/alerts/` | Active + resolved alerts |
| PUT | `/api/alerts/rules/{id}` | Update alert rule |

All endpoints except login require `Authorization: Bearer <token>`.

---

## Color Convention

| Color | Meaning |
|-------|---------|
| 🟢 Green | Healthy / Running / Available |
| 🟡 Yellow | Warning / Pending / Approaching threshold |
| 🔴 Red | Critical / Failed / CrashLoopBackOff |
| 🔵 Blue | Info / Informational |

---

## Architecture

```
Browser (React + Tailwind)
        │
        │ /api/*  (Vite proxy or Nginx)
        ▼
FastAPI Backend (Python)
        │
   ┌────┴──────┐
   │           │
OCI SDK    Kubernetes API
(compute,  (pods, nodes,
 DB, logs)  events)
```

Cost: **$0** — uses only OCI SDK read APIs and free tier resources.
