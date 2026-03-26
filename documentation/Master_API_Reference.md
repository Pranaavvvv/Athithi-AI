# 🌐 Master API Reference — AthithiAI

This document outlines the entire backend architecture, listing all APIs across the **Node.js Gateway** (Agents & Live Ops) and the **Python Data Engine** (Finance & Menu Arbiter).

---

## 🏗️ Architecture Overview

The system runs on two interconnected servers communicating over a shared PostgreSQL database (`hackaniche_4`).
1. **Node.js (Port 5555):** Handles real-time sockets, live operations, guest flows, and AI orchestration via `Featherless`.
2. **Python FastAPI (Port 8000):** Handles strict financial data, mathematical constraints, CSV ingestion, and ledger calculations.

---

## 🟢 Node.js Services (Port 5555)

The primary gateway for frontends, guests, and operational staff.

### 1. Live Ops Agents (`/live`)
Reacts in real-time to the current state of an ongoing event, powering the DJ and Kitchen boards.
- `POST /live/dj/:eventId/request` — Submit a song request (auto-deduplicates and upvotes).
- `POST /live/dj/:eventId/upvote/:id` — Explicitly upvote an existing song.
- `GET  /live/dj/:eventId/leaderboard` — Returns the crowdsourced playlist ranked by upvotes.
- `PATCH /live/dj/playing/:id` — Mark a song as currently playing (broadcasts to guests).
- *(Same 4 endpoints exist for `/live/kitchen/...` to handle guest food/beverage requests).*
- `GET  /live/kitchen/:eventId/dashboard` — Complete operational view (milestones + headcount + threshold alerts).
- `POST /live/kitchen/:eventId/milestone` — Create a course timing (e.g. Starters at 7 PM).
- `PATCH /live/kitchen/milestone/:id/notify` — Kitchen broadcasts "Order Ready" to floor staff.

### 2. Food Intelligence Engine (`/food`)
Predictive AI for optimizing food prep, analyzing waste, and suggesting menus.
- `POST /food/:eventId/chef-command` — Provide natural language (e.g., "50 portions wasted"). LLM parses to structured JSON.
- `GET  /food/:eventId/recommend` — Generates a full markdown menu combining same-day overlap savings, historic hits, and avoiding historic high-waste items.
- `GET  /food/history/popularity` — Aggregated list of the most consumed dishes across all recorded events.
- `GET  /food/history/wasted` — Aggregated list of items with the highest `prepared - consumed` waste ratio.

### 3. Event Manager Agent (EMA) (`/api/ema`)
Automates the pre-event planning phase.
- `GET  /api/ema/source-vendors?category=decor&budget=2000` — Fetches vendors matching criteria and uses LLM to rank them by Operational Friction Score.
- `POST /api/ema/bids` — Records a negotiated bid from a vendor for an event.
- `POST /api/ema/ops/ping` — Dispatches a readiness check to a department (Lighting, Sound, Catering).
- `GET  /api/ema/ops/:eventId` — Checks if all departments are 'Ready' before allowing the Function Prospectus to generate.

### 4. Guest & Headcount Management (`/gm`)
Powers the Guest Recognition Engine (GRE) and pre-event invitations.
- `PATCH /guests/:guestId/status` — Moves guests through workflows (e.g. `booked` generates a unique UUID RsvpToken and QR code).
- `GET   /rsvp/:rsvpToken` — Public form view for guests to confirm attendance.
- `POST  /rsvp/:rsvpToken` — Guest submits RSVP (includes `allergy_severity` and photo upload for facial recognition embeddings).
- `GET   /headcount/:eventId` — Live statistics (expected vs arrived vs remaining).
- `POST  /headcount/:eventId/scan` — GRE endpoint. Records arrival, triggers 10%/25%/etc thresholds, and instantly broadcasts `severe` allergy alerts to the Kitchen WebSocket.

---

## 🔵 Python FastAPI Services (Port 8000)

The strict financial and constraint-checking layer.

### 1. Menu Tier & Pricing (`/api/menu`)
- `POST /api/menu/upload-csv` — Ingests massive CSV pricing sheets. Deletes old pricing and regenerates `Standard`, `Premium`, and `Elite` tiers.
- `GET  /api/menu/tier-summary` — Calculates the aggregated `base_rate_per_guest` for each tier to feed into the event quoting engine.

### 2. Event Core Ops (`/api/ops`)
- `POST /api/ops/events` — Create a new event enquiry.
- `POST /api/ops/events/{id}/book` — The critical state transition. Flips status to `BOOKED` and triggers the Node.js `EMA Automator` background worker to start sourcing vendors.
- `GET  /api/ops/events/{id}/quote` — Fetches the LLM-optimized pricing recommendation based on menu tier, day of week, and addons.

### 3. Financial Arbiter (`/api/finance`)
Ensures no event runs below the breakeven point.
- `GET  /api/finance/{eventId}/ledger` — The master P&L statement. Compares Revenue (Quotes) vs Liabilities (Vendor Bids) to calculate true profit margin.
- `POST /api/finance/{eventId}/enforce-constraints` — Fails a transaction if Profit Margin drops below the mandatory 30% rule.
- `POST /api/finance/vendors/payout` — Dispatches secure payments to vendors once milestones are hit.

---

## 🟡 TypeScript WhatsApp Bot (Port 5556)

Standalone stateful booking agent using the Meta WhatsApp Business Cloud API.

### State Machine (`backend/src/bot/`)
- `GET  /webhook` — Meta Cloud API verification handshake.
- `POST /webhook` — Receives messages, extracts text/interactive replies, and runs through the 10-state booking flow.

**States:** `WELCOME` → `PARTY_NAME` → `EVENT_TYPE` → `DATE` → `TIME_SLOT` → `GUEST_COUNT` → `GST` → `PACKAGE_SELECTION` → `CONFIRMATION` → `DONE`

**Key Features:**
- Featherless AI for conversational package recommendations
- Date conflict detection with automatic alternative suggestions
- Creates `enquiries` records upon booking completion

---

## 🟣 Next.js Frontend Dashboard (Port 3000)

| Page | Path | Purpose |
|------|------|---------|
| Dashboard Home | `/dashboard` | Overview & metrics |
| Analytics | `/dashboard/analytics` | Event performance graphs |
| Kitchen Board | `/dashboard/kitchen` | Live kitchen intelligence |
| DJ Board | `/dashboard/dj` | Vibe-Sync playlist manager |
| Finance | `/dashboard/finance` | P&L ledger & constraints |
| EMA | `/dashboard/ema` | Vendor sourcing panel |
| WhatsApp | `/dashboard/whatsapp` | Chat conversation viewer |
| Menu | `/dashboard/menu` | Menu catalog management |
| Clients | `/dashboard/clients` | Client registry |
| GRE | `/gre` | Guest Recognition Engine |

