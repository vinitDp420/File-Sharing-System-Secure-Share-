# SecureShare

## Distributed Secure File Sharing System with ML

> React + Node.js + FastAPI + MongoDB + Docker Compose

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS + Framer Motion + Recharts |
| Backend | Node.js + Express.js + Socket.io |
| Database | MongoDB + Mongoose |
| ML Service | Python + FastAPI + scikit-learn |
| Auth | JWT + bcrypt + RSA-2048 |
| DevOps | Docker + Docker Compose |

---

## Quick Start (Local)

### Prerequisites
- Node.js 18+
- Python 3.11+
- MongoDB running on localhost:27017

### Step 1 — Install dependencies

```powershell
# Backend
cd backend; npm install

# Node Simulator
cd node-simulator; npm install

# Frontend
cd frontend; npm install

# ML Service
cd ml-service; pip install -r requirements.txt
```

### Step 2 — Generate Datasets

```powershell
cd datasets
python generate_datasets.py
```

### Step 3 — Start all services (open 6 terminals)

```powershell
# Terminal 1 — Backend
cd backend; npm run dev

# Terminal 2 — Node Sim 1 (us-east)
cd node-simulator
$env:PORT=6001; $env:NODE_ID="N001"; $env:REGION="us-east"
node server.js

# Terminal 3 — Node Sim 2 (us-west)
cd node-simulator
$env:PORT=6002; $env:NODE_ID="N002"; $env:REGION="us-west"
node server.js

# Terminal 4 — Node Sim 3 (eu-central)
cd node-simulator
$env:PORT=6003; $env:NODE_ID="N003"; $env:REGION="eu-central"
node server.js

# Terminal 5 — ML Service
cd ml-service
uvicorn main:app --reload --port 8000

# Terminal 6 — Frontend
cd frontend; npm run dev
```

### Step 4 — Open Browser

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/health
- **ML Service**: http://localhost:8000/ml/health
- **Node Sim 1**: http://localhost:6001/health

---

## Docker Compose

```bash
docker compose up --build
```

Services start on:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- ML Service: http://localhost:8000
- Mongo: localhost:27017
- Node Sim 1/2/3: localhost:6001/6002/6003

---

## Features

### Security
- AES-256-CBC file encryption before upload
- RSA-2048 key pair generated per user at registration
- SHA-256 file integrity signatures
- JWT authentication (24h access + 7d refresh)
- Rate limiting (100 req/15min)

### Distributed Storage
- Files split into 1MB chunks
- Chunks distributed across N001 (us-east), N002 (us-west), N003 (eu-central)
- Automatic replication factor (default 2x)
- Parallel chunk upload and download
- Fault-tolerant: falls back to replica nodes

### ML Models
| Model | Algorithm | Dataset |
|-------|-----------|---------|
| File Recommender | Cosine Similarity (TF-IDF) | file_access_history.csv |
| File Classifier | Random Forest (100 trees) | file_metadata_classification.csv |
| Anomaly Detector | Isolation Forest | activity_logs_anomaly.csv |
| Smart Node Selector | Gradient Boosting | node_performance.csv |

### Admin Panel (9 pages)
1. Overview — KPI cards + live charts + activity feed
2. Users — Table with role/status management
3. Files — Full file table + chunk distribution
4. Nodes — Live CPU/RAM bars + latency charts + flag images
5. Security — Anomaly feed + IP blocklist + heatmap
6. ML Analytics — Model cards + confusion matrix + retrain
7. Logs — Searchable + export CSV/JSON
8. Settings — Theme, storage, SMTP, backup
9. Reports — Generate, preview, schedule exports

### WebSocket Events
- `upload:progress` — real-time upload progress bar
- `anomaly:detected` — admin notification bell
- `node:status` — live node health updates
- `activity:new` — admin activity feed

---

## Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   React     │◄──►│  Node.js    │◄──►│  FastAPI    │
│  Frontend   │    │  Backend    │    │ ML Service  │
│  :3000      │    │  :5000      │    │  :8000      │
└─────────────┘    └──────┬──────┘    └─────────────┘
                          │
                    ┌─────┴─────┐
                    │  MongoDB  │
                    │  :27017   │
                    └─────┬─────┘
              ┌───────────┼───────────┐
       ┌──────┴──┐  ┌─────┴───┐  ┌───┴─────┐
       │ Node N1 │  │ Node N2 │  │ Node N3 │
       │ :6001   │  │ :6002   │  │ :6003   │
       │ us-east │  │ us-west │  │ eu-cent │
       └─────────┘  └─────────┘  └─────────┘
```

---

## VIVA Explanation

> *"SecureShare uses Distributed Computing for chunked file storage across geo-redundant nodes, AES-256 + RSA for end-to-end security, and ML for smart file recommendations, anomaly detection and node selection — with a live admin panel featuring real-time WebSocket feeds."*
