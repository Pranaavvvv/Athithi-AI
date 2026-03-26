# 🏨 IntelliManager — AI-Powered Banquet Management System

A multi-agent, AI-driven platform that automates the **entire lifecycle** of banquet event management — from client booking (via WhatsApp AI) to kitchen operations, guest recognition, financial arbitration, and live event intelligence.

---

## 🏗️ Architecture

The system runs on **4 interconnected services** sharing a single PostgreSQL database.

| Service | Stack | Port | Purpose |
|---------|-------|------|---------|
| **Node.js Gateway** | Express.js | 5555 | REST APIs, WebSockets, Live Ops, EMA, Food Intelligence |
| **WhatsApp Bot** | TypeScript/Express | 5556 | Stateful AI concierge for client bookings via WhatsApp |
| **Financial Engine** | Python FastAPI | 8000 | Menu pricing, event quoting, P&L ledger, constraints |
| **Frontend Dashboard** | Next.js | 3000 | Admin dashboard, analytics, kitchen/DJ boards |

```
┌───────────────┐   ┌──────────────────┐   ┌──────────────────┐
│  Next.js UI   │──▶│  Node.js Gateway │──▶│  Python FastAPI   │
│  (Port 3000)  │   │  (Port 5555)     │   │  (Port 8000)      │
└───────────────┘   └──────────────────┘   └──────────────────┘
                           │                        │
                    ┌──────▼──────┐          ┌──────▼──────┐
                    │  WebSockets │          │  Twilio/WA  │
                    │  (Kitchen,  │          │  Outbound   │
                    │   DJ, GRE)  │          │  Messages   │
                    └─────────────┘          └─────────────┘
┌──────────────────┐       │
│  WhatsApp Bot    │       │
│  (Port 5556)     │───────┘ (shared PostgreSQL)
│  Meta Cloud API  │
└──────────────────┘
```

---

## 🤖 AI Agents

### 1. IntelliManager WhatsApp Concierge (`backend/src/bot/`)
A **stateful 10-step** booking agent operating over WhatsApp Business Cloud API:
- `WELCOME` → `PARTY_NAME` → `EVENT_TYPE` → `DATE` → `TIME_SLOT` → `GUEST_COUNT` → `GST` → `PACKAGE_SELECTION` → `CONFIRMATION` → `DONE`
- Uses Featherless AI (Meta Llama 3) for conversational package recommendations
- Automatic date conflict detection with alternative suggestions
- Creates `enquiries` in the database upon completion

### 2. Event Manager Agent — EMA (`backend/routes/ema.js`)
Automates pre-event planning:
- AI-powered vendor sourcing & ranking (Operational Friction Score)
- Multi-department readiness pings (Lighting, Sound, Catering)
- Background automator polls for BOOKED events

### 3. Food Intelligence Engine (`backend/services/foodRecommendationService.js`)
- **NLP Chef Commands:** Chef dictates "50 paneer tikka left" → parsed to structured waste data
- **Kitchen Recommendations:** AI menu optimization using same-day overlap + historical waste
- **Client Suggestions:** Sales-oriented AI menu proposals for prospective clients
- **Live Food Requests:** Guest crowdsourced requests with upvoting (like DJ song requests)

### 4. Guest Recognition Engine — GRE (`backend/guest_management/`)
- QR-code based RSVP with photo upload for facial recognition embeddings
- Real-time headcount with threshold alerts (10%, 25%, 50%, 75%, 90%, 100%)
- Severe allergy broadcasting to Kitchen WebSocket on guest arrival

### 5. DJ Vibe-Sync (`backend/routes/live.js`)
- Crowdsourced song requests with auto-deduplication and upvoting
- Real-time leaderboard via WebSocket broadcast
- "Now Playing" status updates

### 6. Financial Arbiter (`agents/app/`)
- CSV menu pricing ingestion with tiered auto-categorization (Standard/Premium/Elite)
- LLM-optimized event quoting with day-of-week sensitivity
- Master P&L ledger with mandatory 30% profit margin enforcement

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+, Python 3.11+, PostgreSQL 15+

### 1. Backend (Node.js Gateway)
```bash
cd backend
cp .env.example .env  # Configure DATABASE_URL, FEATHERLESS_API_KEY
npm install
npm run dev            # Port 5555
```

### 2. WhatsApp Bot (TypeScript)
```bash
cd backend
# Set WHATSAPP_TOKEN, PHONE_NUMBER_ID, VERIFY_TOKEN, BOT_PORT in .env
npx ts-node src/bot/server.ts   # Port 5556
```

### 3. Financial Engine (Python)
```bash
cd agents
pip install -r requirements.txt
uvicorn app.main:app --port 8000
```

### 4. Frontend Dashboard (Next.js)
```bash
cd client
npm install
npm run dev            # Port 3000
```

---

## 📡 API Reference

### Node.js Gateway (Port 5555)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/live/dj/:eventId/request` | Submit/upvote a song request |
| `GET` | `/live/dj/:eventId/leaderboard` | Crowdsourced playlist |
| `GET` | `/live/kitchen/:eventId/dashboard` | Kitchen ops dashboard |
| `POST` | `/food/:eventId/chef-command` | NLP consumption parsing |
| `GET` | `/food/:eventId/recommend` | AI menu optimization (kitchen) |
| `GET` | `/food/client/suggest` | AI menu suggestion (client-facing) |
| `GET` | `/ema/source-vendors` | AI vendor ranking |
| `PATCH` | `/gm/guests/:id/status` | Guest status transitions + QR |
| `POST` | `/gm/headcount/:eventId/scan` | GRE arrival + allergy alerts |
| `POST` | `/whatsapp/simulate` | Local IntelliManager testing |

### WhatsApp Bot (Port 5556)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/webhook` | Meta verification handshake |
| `POST` | `/webhook` | Receive WhatsApp messages |

### Python Engine (Port 8000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/menu/upload-csv` | Ingest menu pricing CSV |
| `GET` | `/api/menu/tier-summary` | Per-tier cost breakdown |
| `POST` | `/api/ops/events` | Create event enquiry |
| `POST` | `/api/ops/events/{id}/book` | Book event → triggers EMA |
| `GET` | `/api/finance/{id}/ledger` | Master P&L statement |

---

## 🗄️ Database Tables

| Table | Service | Purpose |
|-------|---------|---------|
| `users` | Auth | User accounts (local + Google OAuth) |
| `events` | Core | Event lifecycle (ENQUIRY → BOOKED → COMPLETED) |
| `menu_items` | Food | Tiered menu catalog |
| `food_consumption` | Food Intelligence | Dish-level waste tracking |
| `food_recommendations` | Food Intelligence | AI recommendation audit trail |
| `kitchen_requests` | Live Ops | Guest food/beverage crowdsourced requests |
| `sessions` | WhatsApp Bot (TS) | Bot conversation state |
| `enquiries` | WhatsApp Bot (TS) | Completed booking enquiries |
| `packages` | WhatsApp Bot (TS) | Available packages |
| `whatsapp_sessions` | WhatsApp (JS) | LLM concierge state machine |
| `financial_ledger` | Finance | Revenue vs liabilities |
| `vendor_payouts` | Finance | Secure vendor payments |
| `guests` | Guest Mgmt | Guest registry with RSVP tokens |

---

## 🔑 Environment Variables

```env
# Database
DATABASE_URL=postgresql://...

# AI
FEATHERLESS_API_KEY=rc_...
FEATHERLESS_BASE_URL=https://api.featherless.ai/v1

# WhatsApp Bot
WHATSAPP_TOKEN=your_meta_token
PHONE_NUMBER_ID=your_phone_id
VERIFY_TOKEN=your_verify_token
BOT_PORT=5556

# Twilio (Python outbound)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...

# Frontend
FRONTEND_URL=http://localhost:3000

# Face Recognition
FACE_SERVER_PATH=https://...ngrok-free.dev
```

---

## 📁 Project Structure

```
├── backend/                    # Node.js Express Gateway
│   ├── routes/                 # REST API routers
│   │   ├── ema.js              # Event Manager Agent
│   │   ├── food.js             # Food Intelligence
│   │   ├── live.js             # DJ + Kitchen Live Ops
│   │   └── whatsapp.js         # AI Concierge webhook + simulator
│   ├── services/               # Business logic
│   │   ├── featherless.js      # LLM wrapper
│   │   ├── foodRecommendationService.js
│   │   ├── liveOpsService.js
│   │   ├── whatsappService.js  # Stateful AI concierge
│   │   └── emaAutomator.js     # Background vendor sourcer
│   ├── guest_management/       # GRE + RSVP + Headcount
│   └── src/bot/                # TypeScript WhatsApp Bot
│       ├── stateMachine.ts     # Core state engine
│       ├── states/             # 10 state handlers
│       ├── ai.ts               # Featherless integration
│       ├── db.ts               # Session/enquiry persistence
│       ├── whatsapp.ts         # Meta Graph API sender
│       └── server.ts           # Standalone Express (port 5556)
├── agents/                     # Python FastAPI Financial Engine
│   └── app/
│       ├── routers/            # Event, Menu, Finance endpoints
│       ├── services/           # WhatsApp Twilio sender
│       └── models/             # SQLAlchemy ORM
├── client/                     # Next.js Frontend Dashboard
│   └── src/app/
│       ├── dashboard/          # Admin panels
│       │   ├── analytics/      # Event analytics
│       │   ├── kitchen/        # Kitchen intelligence board
│       │   ├── dj/             # DJ Vibe-Sync board
│       │   ├── finance/        # P&L dashboard
│       │   ├── whatsapp/       # WhatsApp chat viewer
│       │   └── ema/            # Event Manager Agent panel
│       ├── gre/                # Guest Recognition Engine UI
│       └── auth/               # Login/OAuth
└── documentation/              # API guides & architecture docs
```

---

## 📄 License

[MIT](https://choosealicense.com/licenses/mit/)