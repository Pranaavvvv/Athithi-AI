# 💳 Banquet Financial Manager — Backend API Documentation

An integrated Banquet Financial Management & Intelligence Tool built with **FastAPI + PostgreSQL + Featherless.ai**. This backend handles the entire lifecycle of an event — from initial inquiry and CSV-driven menu pricing to financial tracking, vendor bill OCR verification, and post-event AI analytics — enforced by a strict **state-machine** and **role-based access control**.

---

## 📋 Table of Contents

- [Architecture Overview](#-architecture-overview)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [State Machine & Lifecycle](#-state-machine--lifecycle)
- [Menu Pricing Engine (CSV)](#-menu-pricing-engine-csv)
- [Financial Engine (30/40/30)](#-financial-engine-304030)
- [AI Intelligence Layer (Featherless.ai)](#-ai-intelligence-layer-featherlessai)
- [WhatsApp Integration](#-whatsapp-integration)
- [Background Scheduler](#-background-scheduler)
- [Testing Guide](#-testing-guide)

---

## 🏗 Architecture Overview

```
┌─────────────┐    ┌──────────────┐    ┌───────────────────┐
│   Frontend   │───▶│  FastAPI      │───▶│  PostgreSQL       │
│  (React/PWA) │    │  REST API    │    │  (Render Cloud)   │
└─────────────┘    └──────┬───────┘    └───────────────────┘
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
        ┌──────────┐ ┌──────────┐ ┌──────────────┐
        │ WhatsApp │ │ Scheduler│ │ Featherless  │
        │ (Twilio) │ │ (CRON)   │ │    .ai LLM   │
        └──────────┘ └──────────┘ └──────────────┘
```

---

## 🛠 Tech Stack

| Component | Technology |
|---|---|
| **Framework** | FastAPI (async) |
| **Database** | PostgreSQL on Render (via `asyncpg`) |
| **ORM** | SQLAlchemy 2.0 (async mode) |
| **Validation** | Pydantic v2 |
| **AI/LLM** | Featherless.ai (OpenAI-compatible API) |
| **Vision OCR** | Featherless.ai Vision LLM (invoice extraction) |
| **WhatsApp** | Twilio WhatsApp Business API |
| **Scheduler** | APScheduler (AsyncIO) |
| **Auth** | Role-based (Finance, Sales, Ops, GRE) |

---

## 📁 Project Structure

```
agents/
├── .env                          # Environment variables (not committed)
├── requirements.txt              # Python dependencies
├── data/
│   └── menu_pricing.csv          # Sample tier-based pricing sheet
├── app/
│   ├── main.py                   # FastAPI entry point + lifespan
│   ├── database.py               # Async SQLAlchemy engine (Render PostgreSQL)
│   ├── models/
│   │   ├── enums.py              # EventStatus, PaymentStatus, MenuTier, etc.
│   │   ├── event.py              # Event model (state machine core)
│   │   ├── financial_ledger.py   # 30/40/30 payment milestones
│   │   ├── menu_item.py          # CSV-loaded menu items per tier
│   │   └── vendor_payout.py      # Vendor bills + AI fraud detection
│   ├── schemas/
│   │   ├── event.py              # Event request/response schemas
│   │   ├── finance.py            # Finance request/response schemas
│   │   ├── menu.py               # Menu/pricing request/response schemas
│   │   └── ops.py                # Operations request/response schemas
│   ├── routers/
│   │   ├── finance.py            # Finance Gatekeeper (8 endpoints)
│   │   ├── menu.py               # Menu pricing engine (3 endpoints)
│   │   └── ops.py                # Operations (4 endpoints)
│   ├── services/
│   │   ├── featherless.py        # Featherless.ai LLM + Vision wrapper (7 functions)
│   │   └── whatsapp.py           # Twilio WhatsApp service (4 templates)
│   └── tasks/
│       └── scheduler.py          # Daily payment reminder CRON job
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- PostgreSQL database (e.g., on Render)
- (Optional) Twilio account for WhatsApp
- (Optional) Featherless.ai API key

### Installation

```bash
cd agents
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Configure Environment
Update `.env` with your credentials:
```bash
DATABASE_URL=postgresql+asyncpg://user:pass@host/dbname
FEATHERLESS_API_KEY=your_key_here
```

### Run the Server

```bash
PYTHONPATH=. uvicorn app.main:app --reload --port 8000
```

### Access the API
- **Swagger UI**: https://hackniche-financial-agent.onrender.com/docs
- **Health Check**: https://hackniche-financial-agent.onrender.com/

---

## 🔐 Environment Variables

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Render) | ✅ |
| `FEATHERLESS_API_KEY` | Featherless.ai API key | Optional |
| `FEATHERLESS_BASE_URL` | Featherless.ai base URL | Optional |
| `FEATHERLESS_MODEL` | LLM model name | Optional |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | Optional |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | Optional |
| `TWILIO_WHATSAPP_FROM` | Twilio WhatsApp sender number | Optional |

> **Note**: The system gracefully degrades without Featherless.ai or Twilio — AI analysis returns placeholder text and WhatsApp calls return `sent: false`.

---

## 📡 API Reference

### Menu Router (`/api/menu`)

| Endpoint | Method | Description |
|---|---|---|
| `/upload-csv` | `POST` | Upload CSV pricing sheet to populate menu items |
| `/items` | `GET` | List menu items (filter: `?tier=premium&category=starter`) |
| `/tier-summary` | `GET` | Per-tier aggregate base rate per guest |

### Finance Router (`/api/finance`)

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/events` | `POST` | Sales | Create a new Temporary Enquiry |
| `/events` | `GET` | All | List events (optional `?status_filter=enquiry`) |
| `/events/{id}` | `GET` | All | Get event details |
| `/events/{id}` | `PATCH` | Sales | Update event (only while `enquiry`) |
| `/init-plan` | `POST` | System | Generate 30/40/30 plan (auto-priced from CSV tier) |
| `/verify-utr` | `PATCH` | Finance | Record UTR and verify payment |
| `/confirm` | `POST` | Finance | **The Toggle** — flip `enquiry` → `booked` |
| `/nudge/{id}` | `POST` | Finance | Send WhatsApp payment reminder |
| `/dashboard` | `GET` | Finance | Aggregated financial overview |
| `/ledger/{id}` | `GET` | Finance | View ledger entries for an event |

### Operations Router (`/api/ops`)

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/vendor-bill` | `POST` | Event Mgr | Submit vendor bill + invoice image (Vision OCR) |
| `/vendor-bill/approve` | `PATCH` | Finance | Approve vendor payout |
| `/vendor-bills/{id}` | `GET` | All | List vendor bills for an event |
| `/docs/generate-fp/{id}` | `GET` | Finance | Generate Function Prospectus (70% guardrail) |

---

## 🔄 State Machine & Lifecycle

The system enforces a **strict status progression**. No user can skip a step.

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────┐     ┌─────────────┐
│   ENQUIRY   │────▶│     BOOKED      │────▶│  OPERATING  │────▶│  COMPLETED  │
│             │     │                 │     │             │     │             │
│ Sales edits │     │ Finance toggled │     │ FP generated│     │ Post-event  │
│ Menu select │     │ PO sent via WA  │     │ 70%+ paid   │     │ Vibe Report │
└─────────────┘     └─────────────────┘     └─────────────┘     └─────────────┘
      │                     ▲
      │    Deposit UTR      │
      │    verified         │
      └─────────────────────┘
```

### Access Permissions by State

| State | Sales | Finance | Operations | Kitchen |
|---|---|---|---|---|
| **Enquiry** | Edit | View | Hidden | Hidden |
| **Booked** | Read-only | Input UTR, Toggle | Source Vendors | View Pipeline |
| **Operating** | Status Tracker | Release Payouts | Full Access | Live Dashboard |
| **Completed** | View Reports | Final Settlement | Audit | Menu Heatmap |

---

## 🍽 Menu Pricing Engine (CSV)

The system ingests a structured CSV with per-item pricing across 3 tiers:

```csv
tier,category,item_name,price_per_guest
standard,starter,Veg Spring Rolls,80
premium,main_course,Paneer Butter Masala,180
elite,dessert,Belgian Chocolate Mousse,200
```

### How It Works
1. **Upload**: `POST /api/menu/upload-csv` with a CSV file
2. **Browse**: `GET /api/menu/items?tier=premium` to view items
3. **Aggregate**: `GET /api/menu/tier-summary` returns per-tier base rates

| Tier | Base Rate/Guest | Sample Items |
|---|---|---|
| **Standard** | ~₹770 | Veg Spring Rolls, Dal Makhani, Gulab Jamun |
| **Premium** | ~₹1,140 | Hara Bhara Kebab, Biryani, Rasmalai |
| **Elite** | ~₹2,600 | Truffle Vol-au-Vent, Lobster Thermidor, Crème Brûlée |

### Auto-Pricing in Init-Plan
When `POST /api/finance/init-plan` is called, the system:
1. Looks up the event's `menu_tier`
2. Queries `menu_items` table → sums `price_per_guest`
3. Calculates: `Total = (base_rate × guests) + addons + GST`

**No manual base_rate input required.**

---

## 💳 Financial Engine (30/40/30)

When an installment plan is initialized, the system auto-generates **3 payment milestones**:

| Milestone | Percentage | Due Date | Purpose |
|---|---|---|---|
| **Deposit** | 30% | Immediate | Unlock — triggers booking confirmation |
| **Mid-Term** | 40% | Event Date - 30 days | Vendor sourcing budget |
| **Final** | 30% | Event Date - 7 days | Final settlement |

### Key Guardrails
- ❌ **Confirmation Toggle** stays disabled until 30% Deposit has a verified UTR
- ❌ **Function Prospectus** cannot be generated until 70%+ revenue is collected
- ❌ **UTR numbers** must be unique across the entire system
- ❌ **Events cannot be edited** after status leaves `enquiry`

---

## 🤖 AI Intelligence Layer (Featherless.ai)

Seven LLM-powered functions integrated across the system:

| # | Function | Trigger | What It Does |
|---|---|---|---|
| 1 | **Price Sensitivity Advisor** | `POST /init-plan` | Recommends pricing strategy |
| 2 | **Fraud Guard (Text)** | `POST /vendor-bill` (no image) | Reviews bill reasonableness |
| 3 | **Fraud Guard (Vision OCR)** | `POST /vendor-bill` (with image) | Extracts total from invoice image |
| 4 | **Smart FP Generation** | `GET /generate-fp` | AI-drafts Function Prospectus |
| 5 | **Lead Cooling Detector** | Background (48h inactive) | Alerts about stale enquiries |
| 6 | **Cancellation Post-Mortem** | On lead loss | Categorizes: Price/Date/Competitor |
| 7 | **Vibe Report** | Post-event | Synthesizes guest engagement data |

### Vision OCR Flow
1. Event Manager uploads vendor invoice image (JPG/PNG/WebP) via `POST /api/ops/vendor-bill`
2. Image is base64-encoded and sent to Featherless.ai Vision LLM
3. AI extracts the total amount from the invoice
4. System compares: `|AI_amount - claimed_amount| > ₹1` → **discrepancy flagged**

---

## 💬 WhatsApp Integration

Four pre-built message templates via **Twilio WhatsApp Business API**:

| Template | Trigger | Content |
|---|---|---|
| **Quote** | After menu selection | Tier, total estimate, next steps |
| **Purchase Order** | After confirmation toggle | Booking details, deposit paid |
| **Payment Reminder** | Nudge button or CRON | Milestone, amount due, due date |
| **Function Prospectus** | After FP generation | Event brief for ops team |

---

## ⏰ Background Scheduler

A **daily CRON job** runs at **9:00 AM IST** via APScheduler:

1. Scans `financial_ledger` for unpaid milestones due within 3 days
2. Auto-dispatches WhatsApp reminders via Twilio
3. Logs success/failure per reminder

---

## 🧪 Testing Guide

### Step-by-Step Lifecycle Test

```
1. POST /api/menu/upload-csv         → Upload agents/data/menu_pricing.csv
2. GET  /api/menu/tier-summary       → Verify tier rates
3. POST /api/finance/events          → Create enquiry (copy event_id)
4. POST /api/finance/init-plan       → Just {"event_id": "..."} (auto-priced!)
5. PATCH /api/finance/verify-utr     → Record UTR for deposit
6. POST /api/finance/confirm         → Toggle to "Booked" ✅
7. POST /api/ops/vendor-bill         → Submit bill + invoice image
8. GET  /api/ops/docs/generate-fp    → Should FAIL (only 30% paid)
9. Verify mid-term + final UTRs      → Repeat step 5
10. GET /api/ops/docs/generate-fp    → Should SUCCEED ✅
```

### Negative/Guardrail Tests

| Test | Expected |
|---|---|
| Confirm without verified UTR | `403 Forbidden` |
| Edit event after booking | `400 Bad Request` |
| Duplicate UTR number | `409 Conflict` |
| Vendor bill on unconfirmed event | `400 Bad Request` |
| FP with < 70% payment | Blocked with % message |
| Init-plan without CSV upload | `400 No pricing data` |

---

## 📊 Database Schema (ERD)

```
┌──────────────────┐       ┌─────────────────────┐
│     events       │       │  financial_ledger    │
├──────────────────┤       ├─────────────────────┤
│ id (UUID PK)     │◄──┐   │ id (UUID PK)        │
│ party_name       │   │   │ event_id (FK)       │───┐
│ client_name      │   │   │ milestone (enum)    │   │
│ status (enum)    │   │   │ amount_due          │   │
│ menu_tier (enum) │   │   │ utr_number (unique) │   │
│ guest_count      │   │   │ payment_status      │   │
│ total_quoted_amt │   │   └─────────────────────┘   │
└──────────────────┘   │                             │
                       │   ┌─────────────────────┐   │
┌──────────────────┐   │   │  vendor_payouts     │   │
│   menu_items     │   └───│ event_id (FK)       │◄──┘
├──────────────────┤       │ vendor_name         │
│ tier (enum)      │       │ bill_amount         │
│ category         │       │ ai_verified_amount  │
│ item_name        │       │ discrepancy_flag    │
│ price_per_guest  │       └─────────────────────┘
└──────────────────┘
```

---

*Built for HackAniche 2026 🚀*
