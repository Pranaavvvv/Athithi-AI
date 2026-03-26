# Event Manager Agent (EMA) — Technical Documentation

The **Event Manager Agent** is an AI-powered orchestration layer built into the Node.js backend. It acts as a human-assistive engine that automatically sources vendors, manages bid negotiations, and coordinates operational readiness for banquet events.

> **Base URL (Deployed):** `https://hackniche-financial-agent.onrender.com`  
> **Base URL (Local):** `http://localhost:5555`  
> **Route Prefix:** `/ema`

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [API Endpoints](#api-endpoints)
4. [Background Automator](#background-automator-ema-automator)
5. [AI Service Layer (Featherless.ai)](#ai-service-layer)
6. [Environment Variables](#environment-variables)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   Node.js Backend (Port 5555)               │
│                                                             │
│  ┌──────────┐   ┌──────────────┐   ┌────────────────────┐  │
│  │ /ema/*   │──▶│ featherless  │──▶│ Featherless.ai API │  │
│  │ Routes   │   │ .js Service  │   │ (Meta-Llama 3.1)   │  │
│  └──────────┘   └──────────────┘   └────────────────────┘  │
│                                                             │
│  ┌──────────────────────┐   ┌──────────────────────────┐   │
│  │  EMA Automator       │──▶│  PostgreSQL (Render)      │   │
│  │  (Background Worker) │   │  events / vendors /       │   │
│  │  Polls every 30s     │   │  vendor_bids /            │   │
│  └──────────────────────┘   │  ops_coordination         │   │
│                              └──────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Design Philosophy: Human-in-the-Loop

The EMA **automates data gathering and AI ranking** but leaves **final decisions to the human Event Manager**. The agent sources and ranks vendors, but the manager chooses whom to contact and negotiate with.

---

## Database Schema

### `vendors` Table

Stores the vendor directory used by the Efficiency Pilot AI.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY, DEFAULT gen_random_uuid()` | Unique vendor identifier |
| `name` | `VARCHAR(255)` | `NOT NULL` | Vendor business name |
| `category` | `VARCHAR(100)` | `NOT NULL` | Service category (`decor`, `sound`, `kitchen`, `dj`) |
| `location_coords` | `VARCHAR(255)` | | GPS coordinates (lat, lng) |
| `historical_reliability_score` | `DECIMAL(3,1)` | `DEFAULT 5.0` | Past reliability score (1.0–10.0) |
| `base_price_point` | `DECIMAL(12,2)` | | Standard base price in ₹ |

**Seed Data:**

| Name | Category | Reliability | Base Price |
|---|---|---|---|
| Floral Dreams Decor | decor | 9.2 | ₹25,000 |
| Elite Event Styling | decor | 7.5 | ₹18,000 |
| Premium Sound & Lights | sound | 9.8 | ₹15,000 |
| DJ Maxx Beats | dj | 8.0 | ₹12,000 |
| Gourmet Royal Caterers | kitchen | 9.5 | ₹1,200 |
| City Spice Catering | kitchen | 8.2 | ₹800 |

---

### `vendor_bids` Table

Tracks bid quotations from vendors during the negotiation phase.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY, DEFAULT gen_random_uuid()` | Unique bid identifier |
| `event_id` | `UUID` | `FK → events(id) ON DELETE CASCADE` | The event being bid on |
| `vendor_id` | `UUID` | `FK → vendors(id) ON DELETE CASCADE` | The vendor submitting the bid |
| `quoted_amount` | `DECIMAL(12,2)` | `NOT NULL` | Quoted price in ₹ |
| `status` | `VARCHAR(50)` | `DEFAULT 'pending'` | Bid status: `pending`, `accepted`, `rejected` |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT CURRENT_TIMESTAMP` | When the bid was logged |

---

### `ops_coordination` Table

Tracks operational readiness across departments for an event.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `SERIAL` | `PRIMARY KEY` | Auto-incrementing ID |
| `event_id` | `UUID` | `FK → events(id) ON DELETE CASCADE` | The event being coordinated |
| `department` | `VARCHAR(50)` | `NOT NULL` | Department name (`kitchen`, `decor`, `sound`, `auto_sourcing`) |
| `is_ready` | `BOOLEAN` | `DEFAULT FALSE` | Whether the department has confirmed readiness |
| `notes` | `TEXT` | | Freeform notes or AI-generated sourcing reports |
| `updated_at` | `TIMESTAMPTZ` | `DEFAULT CURRENT_TIMESTAMP` | Last update timestamp |

> **Unique Constraint:** `(event_id, department)` — one entry per department per event.

---

### Entity Relationship

```
┌──────────┐       ┌──────────────┐       ┌──────────┐
│  events  │◀──FK──│ vendor_bids  │──FK──▶│ vendors  │
│          │       └──────────────┘       └──────────┘
│          │
│          │◀──FK──┌──────────────────┐
└──────────┘       │ ops_coordination │
                   └──────────────────┘
```

---

## API Endpoints

### 1. `GET /ema/source-vendors`

**Purpose:** Query vendors by category and rank them using the AI Efficiency Pilot.

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `category` | `string` | ✅ | Vendor category (`decor`, `sound`, `kitchen`, `dj`) |
| `budget` | `number` | ❌ | Target budget in ₹ (default: `50000`) |

**Request:**
```
GET /ema/source-vendors?category=decor&budget=20000
```

**Response (200):**
```json
{
  "category": "decor",
  "target_budget": 20000,
  "ranked_vendors": [
    {
      "id": "uuid-1",
      "name": "Elite Event Styling",
      "category": "decor",
      "location_coords": "19.0800, 72.8800",
      "historical_reliability_score": "7.5",
      "base_price_point": "18000.00",
      "efficiency_pilot": {
        "friction_score": 2,
        "reasoning": "Within budget and reliable; slightly lower reliability offset by excellent price-to-quality ratio."
      }
    },
    {
      "id": "uuid-2",
      "name": "Floral Dreams Decor",
      "category": "decor",
      "location_coords": "19.0760, 72.8777",
      "historical_reliability_score": "9.2",
      "base_price_point": "25000.00",
      "efficiency_pilot": {
        "friction_score": 4,
        "reasoning": "Exceeds budget by ₹5,000 but highest reliability; recommended if budget can stretch."
      }
    }
  ]
}
```

**Response (400):**
```json
{ "error": "Missing 'category' query parameter." }
```

---

### 2. `POST /ema/bids`

**Purpose:** Log a vendor bid/quotation for an event during the negotiation phase.

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `event_id` | `UUID` | ✅ | The event UUID |
| `vendor_id` | `UUID` | ✅ | The vendor UUID |
| `quoted_amount` | `number` | ✅ | Quoted amount in ₹ |

**Request:**
```json
POST /ema/bids
{
  "event_id": "a1b2c3d4-...",
  "vendor_id": "e5f6g7h8-...",
  "quoted_amount": 22000
}
```

**Response (201):**
```json
{
  "message": "Bid logged successfully. Await negotiation.",
  "bid": {
    "id": "new-bid-uuid",
    "event_id": "a1b2c3d4-...",
    "vendor_id": "e5f6g7h8-...",
    "quoted_amount": "22000.00",
    "status": "pending",
    "created_at": "2026-03-25T15:00:00.000Z"
  }
}
```

**Response (400):**
```json
{ "error": "Requires event_id, vendor_id, and quoted_amount" }
```

---

### 3. `POST /ema/ops/ping`

**Purpose:** Dispatch a readiness check to a specific department for an event. Uses `UPSERT` logic — calling this twice for the same department updates the existing record.

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `event_id` | `UUID` | ✅ | The event UUID |
| `department` | `string` | ✅ | Department name (e.g., `kitchen`, `decor`, `sound`, `security`) |
| `notes` | `string` | ❌ | Optional notes (default: `"Check-Ready Ping Sent"`) |

**Request:**
```json
POST /ema/ops/ping
{
  "event_id": "a1b2c3d4-...",
  "department": "kitchen",
  "notes": "Confirm menu prep for 200 guests by 6 PM"
}
```

**Response (200):**
```json
{
  "message": "Ping sent to kitchen for readiness check.",
  "coordination": {
    "id": 1,
    "event_id": "a1b2c3d4-...",
    "department": "kitchen",
    "is_ready": false,
    "notes": "Confirm menu prep for 200 guests by 6 PM",
    "updated_at": "2026-03-25T15:00:00.000Z"
  }
}
```

---

### 4. `GET /ema/ops/:event_id`

**Purpose:** Retrieve the operational readiness dashboard for an event. The UI can use the `all_ready` flag to enable/disable the "Generate Function Prospectus" button.

**Path Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `event_id` | `UUID` | The event UUID |

**Request:**
```
GET /ema/ops/a1b2c3d4-...
```

**Response (200):**
```json
{
  "event_id": "a1b2c3d4-...",
  "total_departments_pinged": 3,
  "all_ready": false,
  "departments": [
    {
      "id": 1,
      "event_id": "a1b2c3d4-...",
      "department": "auto_sourcing",
      "is_ready": true,
      "notes": "AUTOMATED SOURCING REPORT:\n\n- Top DECOR Vendor: Elite Event Styling...",
      "updated_at": "2026-03-25T14:30:00.000Z"
    },
    {
      "id": 2,
      "event_id": "a1b2c3d4-...",
      "department": "kitchen",
      "is_ready": false,
      "notes": "Check-Ready Ping Sent",
      "updated_at": "2026-03-25T15:00:00.000Z"
    },
    {
      "id": 3,
      "event_id": "a1b2c3d4-...",
      "department": "sound",
      "is_ready": false,
      "notes": "Check-Ready Ping Sent",
      "updated_at": "2026-03-25T15:01:00.000Z"
    }
  ]
}
```

---

## Background Automator (EMA Automator)

**File:** `backend/services/emaAutomator.js`

The EMA Automator is a **background polling worker** that runs inside the Node.js server process. It does **not** require any human interaction.

### How It Works

1. **Polls every 30 seconds** for events in `BOOKED` status that don't yet have an `auto_sourcing` entry in `ops_coordination`.
2. For each new event, it allocates **40% of the total quoted amount** as the vendor operations budget, split equally across 3 categories.
3. Queries the `vendors` table for each category (`decor`, `sound`, `kitchen`).
4. Calls the **Featherless AI Efficiency Pilot** to rank them by Operational Friction Score.
5. Saves a structured `AUTOMATED SOURCING REPORT` into the `ops_coordination` table with `department = 'auto_sourcing'`.

### Lifecycle

```
Event status → BOOKED
        │
        ▼ (within 30s)
EMA Automator detects event
        │
        ├── Query vendors (decor)  ──▶ AI Rank ──▶ Top Pick
        ├── Query vendors (sound)  ──▶ AI Rank ──▶ Top Pick
        └── Query vendors (kitchen) ──▶ AI Rank ──▶ Top Pick
        │
        ▼
INSERT ops_coordination (auto_sourcing = TRUE, notes = report)
        │
        ▼
Event Manager reviews via GET /ema/ops/:event_id
```

### Console Output

```
[EMA Automator] Background worker started. Polling for BOOKED events...
[EMA Automator] New BOOKED event detected: a1b2c3d4-... Sourcing vendors...
[EMA Automator] Auto-sourcing complete for event: a1b2c3d4-...
```

---

## AI Service Layer

**File:** `backend/services/featherless.js`  
**Provider:** [Featherless.ai](https://featherless.ai) (OpenAI-compatible API)  
**Model:** `meta-llama/Meta-Llama-3.1-8B-Instruct`

### Operational Friction Score

The AI ranks vendors on a **1–10 friction scale** (lower = better) based on three variables:

| Variable | Weight | Source |
|---|---|---|
| **Historical Reliability** | High | `vendors.historical_reliability_score` |
| **Price vs. Budget** | Medium | `vendors.base_price_point` vs. provided budget |
| **Availability** | Low | Inferred by the LLM from context |

### Fallback Behavior

| Scenario | Behavior |
|---|---|
| `FEATHERLESS_API_KEY` not set | Returns all vendors with `friction_score: 5` and a default message |
| AI API call fails (timeout/error) | Falls back to sorting vendors by raw `historical_reliability_score` descending |
| AI returns non-JSON response | Strips markdown backticks and retries JSON parse |

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string (Render) |
| `FEATHERLESS_API_KEY` | ✅ | — | API key for Featherless.ai LLM |
| `FEATHERLESS_BASE_URL` | ❌ | `https://api.featherless.ai/v1` | Featherless API base URL |
| `FEATHERLESS_MODEL` | ❌ | `meta-llama/Meta-Llama-3.1-8B-Instruct` | LLM model identifier |
| `PORT` | ❌ | `5555` | Server port |

---

## Quick Start

```bash
# 1. Install dependencies
cd backend && npm install

# 2. Run database migrations (creates vendors, vendor_bids, ops_coordination)
node database/run_migrations.js

# 3. Start the server (includes EMA Automator)
npm run dev

# 4. Test vendor sourcing
curl "http://localhost:5555/ema/source-vendors?category=decor&budget=20000"

# 5. Create a BOOKED event via the Python Financial API, then wait 30s
#    Check the auto-sourcing results:
curl "http://localhost:5555/ema/ops/<event_id>"
```
