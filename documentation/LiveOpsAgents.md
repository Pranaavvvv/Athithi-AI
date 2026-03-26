# Live Ops Agents — Technical Documentation

The **Live Ops Agents** are real-time consumer modules that react to data flowing from the GRE (Guest Recognition Engine) and guest interactions. They power the **Kitchen Intelligence Board** and the **DJ Vibe-Sync Dashboard**.

> **Base URL (Deployed):** `https://hackniche-financial-agent.onrender.com`  
> **Base URL (Local):** `http://localhost:5555`  
> **Route Prefix:** `/live`

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [DJ Vibe-Sync Dashboard API](#dj-vibe-sync-dashboard-api)
4. [Kitchen Intelligence Board API](#kitchen-intelligence-board-api)
5. [WebSocket Events](#websocket-events)
6. [Allergy Alert System](#allergy-alert-system)
7. [Operational Synergy Flow](#operational-synergy-flow)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                   Node.js Backend (Port 5555)                       │
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────────────────┐  │
│  │ GRE Agent    │───▶│ Headcount    │───▶│ Kitchen WebSocket     │  │
│  │ (QR Scan)    │    │ Service      │    │ kitchen:{eventId}     │  │
│  └──────────────┘    └──────────────┘    └───────────────────────┘  │
│         │                    │                       │              │
│         │                    ▼                       ▼              │
│         │            ┌──────────────┐    ┌───────────────────────┐  │
│         │            │ Allergy      │───▶│ 🚨 allergy_alert     │  │
│         │            │ Check        │    │ (severe only)         │  │
│         │            └──────────────┘    └───────────────────────┘  │
│         │                                                           │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────────────────┐  │
│  │ Guest Portal │───▶│ Live Ops     │───▶│ DJ WebSocket          │  │
│  │ (QR on table)│    │ Service      │    │ dj:{eventId}          │  │
│  └──────────────┘    └──────────────┘    └───────────────────────┘  │
│                                                                     │
│                      ┌──────────────────────────────────────────┐   │
│                      │        PostgreSQL (Render)                │   │
│                      │  dj_requests │ kitchen_milestones │       │   │
│                      │  gm_guests   │ gm_kitchen_alerts  │       │   │
│                      └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### `dj_requests` Table

Stores crowdsourced song requests with upvote tracking and deduplication.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY, DEFAULT gen_random_uuid()` | Unique request identifier |
| `event_id` | `UUID` | `FK → events(id) ON DELETE CASCADE` | The event this request belongs to |
| `song_name` | `VARCHAR(255)` | `NOT NULL` | Song title |
| `artist_name` | `VARCHAR(255)` | | Artist name |
| `requested_by` | `VARCHAR(255)` | | Guest name (default: "Anonymous") |
| `upvotes` | `INT` | `DEFAULT 1` | Number of votes (incremented on duplicate requests) |
| `status` | `VARCHAR(20)` | `DEFAULT 'pending'` | `pending`, `playing`, `played`, `rejected` |
| `played_at` | `TIMESTAMPTZ` | | When the DJ played this track |
| `requested_at` | `TIMESTAMPTZ` | `DEFAULT CURRENT_TIMESTAMP` | When the first request was submitted |

**Indexes:**
- `idx_dj_requests_event` — Fast lookup by event
- `idx_dj_requests_status` — Filter by status
- `idx_dj_requests_upvotes` — Sorted leaderboard query

---

### `kitchen_milestones` Table

Tracks course preparation timings and staff notification status.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `SERIAL` | `PRIMARY KEY` | Auto-incrementing ID |
| `event_id` | `UUID` | `FK → events(id) ON DELETE CASCADE` | The event |
| `course_name` | `VARCHAR(100)` | `NOT NULL` | Course name: `Starters`, `Main Course`, `Dessert` |
| `target_start_time` | `TIMESTAMPTZ` | | Planned service time |
| `actual_start_time` | `TIMESTAMPTZ` | | When service actually started |
| `staff_notified` | `BOOLEAN` | `DEFAULT FALSE` | Whether floor staff have been pinged |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT CURRENT_TIMESTAMP` | Record creation time |
| `updated_at` | `TIMESTAMPTZ` | `DEFAULT CURRENT_TIMESTAMP` | Last update time |

---

### `gm_guests` — Allergy Column Addition

| Column | Type | Default | Description |
|---|---|---|---|
| `allergy_severity` | `VARCHAR(20)` | `'none'` | `none`, `mild`, `severe` |

> This column is set during RSVP submission and checked on QR scan arrival.

---

### Entity Relationship

```
┌──────────┐       ┌──────────────┐
│  events  │◀──FK──│ dj_requests  │
│          │       └──────────────┘
│          │
│          │◀──FK──┌─────────────────────┐
│          │       │ kitchen_milestones   │
│          │       └─────────────────────┘
│          │
│          │◀──FK──┌──────────┐
└──────────┘       │ gm_guests│ ← allergy_severity
                   └──────────┘
```

---

## DJ Vibe-Sync Dashboard API

### 1. `POST /live/dj/:eventId/request`

**Purpose:** Submit a song request. If the same song+artist already exists for this event, it auto-upvotes instead of creating a duplicate.

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `song_name` | `string` | ✅ | Song title |
| `artist_name` | `string` | ❌ | Artist name |
| `requested_by` | `string` | ❌ | Guest name (default: "Anonymous") |

**Request:**
```json
POST /live/dj/69793cd5-.../request
{
  "song_name": "Blinding Lights",
  "artist_name": "The Weeknd",
  "requested_by": "Aarav"
}
```

**Response (201 — New Request):**
```json
{
  "message": "Song \"Blinding Lights\" added to queue!",
  "action": "created",
  "request": {
    "id": "6d7613dd-...",
    "event_id": "69793cd5-...",
    "song_name": "Blinding Lights",
    "artist_name": "The Weeknd",
    "requested_by": "Aarav",
    "upvotes": 1,
    "status": "pending",
    "played_at": null,
    "requested_at": "2026-03-25T10:50:59.735Z"
  }
}
```

**Response (200 — Duplicate, Auto-Upvoted):**
```json
{
  "message": "Song \"Blinding Lights\" upvoted! (2 votes)",
  "action": "upvoted",
  "request": {
    "id": "6d7613dd-...",
    "upvotes": 2,
    "status": "pending"
  }
}
```

---

### 2. `POST /live/dj/:eventId/upvote/:requestId`

**Purpose:** Explicitly upvote an existing song request by its ID.

**Request:**
```
POST /live/dj/69793cd5-.../upvote/6d7613dd-...
```

**Response (200):**
```json
{
  "message": "Upvoted! (3 votes)",
  "request": {
    "id": "6d7613dd-...",
    "song_name": "Blinding Lights",
    "upvotes": 3,
    "status": "pending"
  }
}
```

---

### 3. `GET /live/dj/:eventId/leaderboard`

**Purpose:** Get the ranked song request list. Sorted by: playing → pending → played, then by upvotes descending.

**Response (200):**
```json
{
  "leaderboard": [
    {
      "id": "6d7613dd-...",
      "song_name": "Blinding Lights",
      "artist_name": "The Weeknd",
      "requested_by": "Aarav",
      "upvotes": 2,
      "status": "pending",
      "requested_at": "2026-03-25T10:50:59.735Z"
    },
    {
      "id": "b9821bb3-...",
      "song_name": "Levitating",
      "artist_name": "Dua Lipa",
      "requested_by": "Rohan",
      "upvotes": 1,
      "status": "pending",
      "requested_at": "2026-03-25T10:51:20.891Z"
    }
  ],
  "total": 2,
  "now_playing": null
}
```

---

### 4. `PATCH /live/dj/playing/:requestId`

**Purpose:** Mark a song as currently playing. Broadcasts a "Now Playing" notification to all guests via WebSocket.

**Response (200):**
```json
{
  "message": "Song marked as playing",
  "song": {
    "id": "6d7613dd-...",
    "song_name": "Blinding Lights",
    "status": "playing"
  }
}
```

---

### 5. `PATCH /live/dj/played/:requestId`

**Purpose:** Mark a song as played (finished). Records `played_at` timestamp for the Post-Event Vibe Report.

**Response (200):**
```json
{
  "message": "Song marked as played",
  "song": {
    "id": "6d7613dd-...",
    "status": "played",
    "played_at": "2026-03-25T11:05:00.000Z"
  }
}
```

---

### 6. `PATCH /live/dj/reject/:requestId`

**Purpose:** DJ rejects a song request (inappropriate or repeated).

**Response (200):**
```json
{
  "message": "Song request rejected",
  "song": {
    "id": "b9821bb3-...",
    "status": "rejected"
  }
}
```

---

## Kitchen Intelligence Board API

### 7. `GET /live/kitchen/:eventId/dashboard`

**Purpose:** Full kitchen dashboard — combines live headcount, course milestones, and threshold alerts in a single response.

**Response (200):**
```json
{
  "headcount": {
    "eventId": "69793cd5-...",
    "total": 10,
    "expected": 10,
    "arrived": 10,
    "remaining": 0,
    "percentArrived": 100
  },
  "milestones": [
    {
      "id": 1,
      "event_id": "69793cd5-...",
      "course_name": "Starters",
      "target_start_time": "2026-03-25T17:00:00.000Z",
      "actual_start_time": "2026-03-25T17:05:00.000Z",
      "staff_notified": true
    }
  ],
  "alerts": [
    {
      "alert_type": "threshold_reached",
      "message": "🍽️ 25% headcount reached! 3/10 guests have arrived.",
      "percentage_reached": "25.00"
    },
    {
      "alert_type": "threshold_reached",
      "message": "🍽️ 100% headcount reached! 10/10 guests have arrived.",
      "percentage_reached": "100.00"
    }
  ],
  "alert_count": 5
}
```

---

### 8. `POST /live/kitchen/:eventId/milestone`

**Purpose:** Create a course milestone (e.g., schedule when Starters should go out).

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `course_name` | `string` | ✅ | `Starters`, `Main Course`, `Dessert`, etc. |
| `target_start_time` | `ISO 8601` | ❌ | Planned service time |

**Request:**
```json
POST /live/kitchen/69793cd5-.../milestone
{
  "course_name": "Starters",
  "target_start_time": "2026-03-25T17:00:00Z"
}
```

**Response (201):**
```json
{
  "message": "Milestone set for \"Starters\"",
  "milestone": {
    "id": 1,
    "event_id": "69793cd5-...",
    "course_name": "Starters",
    "target_start_time": "2026-03-25T17:00:00.000Z",
    "actual_start_time": null,
    "staff_notified": false
  }
}
```

---

### 9. `PATCH /live/kitchen/milestone/:milestoneId/start`

**Purpose:** Mark a course as started. Records `actual_start_time` and broadcasts to kitchen WebSocket.

**Response (200):**
```json
{
  "message": "\"Starters\" started",
  "milestone": {
    "id": 1,
    "course_name": "Starters",
    "actual_start_time": "2026-03-25T17:05:00.000Z",
    "staff_notified": false
  }
}
```

---

### 10. `PATCH /live/kitchen/milestone/:milestoneId/notify`

**Purpose:** Notify floor staff that food is ready for pickup. Broadcasts an "Order Ready" WebSocket event.

**Response (200):**
```json
{
  "message": "Staff notified",
  "milestone": {
    "id": 1,
    "course_name": "Starters",
    "staff_notified": true
  }
}
```

---

## WebSocket Events

Connect to the WebSocket server at `ws://localhost:5555?channel=<channel_name>`.

### Channels

| Channel Pattern | Consumer | Description |
|---|---|---|
| `kitchen:{eventId}` | Kitchen Board | Threshold alerts, allergy alerts, course updates |
| `dj:{eventId}` | DJ Dashboard | Leaderboard updates, now playing notifications |
| `headcount:{eventId}` | Any Dashboard | Per-arrival headcount updates |

### Kitchen Channel Events

```json
// Threshold Alert (at 25%, 50%, 75%, 90%, 100%)
{
  "type": "kitchen_alert",
  "alertType": "threshold_reached",
  "message": "🍽️ 50% headcount reached! 5/10 guests have arrived.",
  "threshold": 50,
  "arrived": 5,
  "expected": 10,
  "timestamp": "2026-03-25T17:00:00.000Z"
}

// Allergy Alert (severe only)
{
  "type": "allergy_alert",
  "severity": "severe",
  "guestName": "Aarav Patel",
  "dietaryPreferences": "Severe Nut Allergy",
  "message": "⚠️ ALLERGY ALERT: Aarav Patel has SEVERE allergies (Severe Nut Allergy). Immediate kitchen attention required!",
  "timestamp": "2026-03-25T17:01:00.000Z"
}

// Course Started
{
  "type": "course_started",
  "milestone": { "id": 1, "course_name": "Starters", "actual_start_time": "..." },
  "message": "🍽️ \"Starters\" service has started!",
  "timestamp": "2026-03-25T17:05:00.000Z"
}

// Staff Notified (Order Ready)
{
  "type": "staff_notified",
  "milestone": { "id": 1, "course_name": "Starters", "staff_notified": true },
  "message": "📢 Floor staff notified: \"Starters\" is ready for pickup!",
  "timestamp": "2026-03-25T17:10:00.000Z"
}
```

### DJ Channel Events

```json
// Leaderboard Update (on every new request or upvote)
{
  "type": "leaderboard_update",
  "action": "created",
  "song": { "id": "...", "song_name": "Blinding Lights", "upvotes": 1 },
  "leaderboard": [ /* top 20 songs */ ],
  "timestamp": "2026-03-25T17:00:00.000Z"
}

// Now Playing (when DJ marks a song as playing)
{
  "type": "now_playing",
  "song": { "id": "...", "song_name": "Blinding Lights", "artist_name": "The Weeknd" },
  "message": "🎵 Now playing: \"Blinding Lights\" by The Weeknd",
  "timestamp": "2026-03-25T17:15:00.000Z"
}

// Song Played (finished)
{
  "type": "song_played",
  "song": { "id": "...", "status": "played", "played_at": "..." },
  "timestamp": "2026-03-25T17:20:00.000Z"
}
```

---

## Allergy Alert System

### Flow

```
Guest RSVPs with allergy_severity = "severe"
        │
        ▼
Guest arrives → GRE scans QR code
        │
        ▼
headcountService.recordArrival()
        │
        ├── Updates guest status to "arrived"
        ├── Broadcasts headcount_update
        ├── Checks threshold alerts (25/50/75/90/100%)
        │
        └── IF allergy_severity === "severe"
                │
                ▼
            Broadcasts allergy_alert to kitchen:{eventId}
            Console: [ALLERGY ALERT] 🚨 Severe allergy guest arrived: Aarav Patel
```

### RSVP Allergy Input

When a guest submits their RSVP (`POST /gm/rsvp/:rsvpToken`), they can include:

```json
{
  "name": "Aarav Patel",
  "dietary_preferences": "Severe Nut Allergy - No tree nuts",
  "allergy_severity": "severe",
  "plus_ones": 0
}
```

**Valid values for `allergy_severity`:** `none` (default), `mild`, `severe`

---

## Operational Synergy Flow

This is how the Kitchen and DJ agents interact with the GRE and each other during a live event:

```
1. EVENT STARTS
   └── Chef opens Kitchen Dashboard → sees FP menu + milestones
   └── DJ opens DJ Dashboard → sees base genre + empty leaderboard

2. GUESTS ARRIVE (GRE QR Scan)
   └── headcountService.recordArrival()
       ├── kitchen:{eventId} → threshold_reached (Yellow at 25%)
       ├── kitchen:{eventId} → allergy_alert (if severe)
       └── headcount:{eventId} → headcount_update

3. GUESTS REQUEST SONGS (Table QR → Guest Portal)
   └── POST /live/dj/:eventId/request
       └── dj:{eventId} → leaderboard_update

4. DJ PLAYS SONG
   └── PATCH /live/dj/playing/:id
       └── dj:{eventId} → now_playing ("Your song is playing!")

5. KITCHEN STARTS COURSE
   └── PATCH /live/kitchen/milestone/:id/start
       └── kitchen:{eventId} → course_started

6. KITCHEN READY FOR PICKUP
   └── PATCH /live/kitchen/milestone/:id/notify
       └── kitchen:{eventId} → staff_notified ("Order Ready!")

7. 90% CAPACITY REACHED
   └── kitchen:{eventId} → threshold_reached (90%)
   └── Could trigger DJ ping: "Switch to High Energy Playlist"

8. EVENT ENDS
   └── EMA generates Post-Event Vibe Report from:
       ├── DJ: most upvoted songs, played count
       └── Kitchen: service speed (target vs actual times)
```

### Kitchen Food Requests API

These endpoints allow guests to crowdsource food and beverage requests to the Kitchen Board (e.g. "More watermelon juice please"). Same auto-deduplication logic as the DJ system.

#### 11. `POST /live/kitchen/:eventId/request`
Submit a food request. Auto-deduplicates based on `item_name`.
**Body:** `{"item_name": "Watermelon Juice", "requested_by": "Aman"}`
**Response:** `{"message": "Request for \"Watermelon juice\" upvoted! (4 votes)", "action": "upvoted", ...}`

#### 12. `POST /live/kitchen/:eventId/upvote/:requestId`
Explicitly upvote a food request by its ID.

#### 13. `GET /live/kitchen/:eventId/leaderboard`
Kitchen polls this to see the most requested ad-hoc items. Sorted by status (`preparing` first) then `upvotes`.
**Returns:** `{"leaderboard": [ { "item_name": "Watermelon Juice", "upvotes": 4, "status": "pending" }, ... ] }`

#### 14. `PATCH /live/kitchen/request/:requestId/status`
Kitchen clicks on a request to mark it as `preparing`, `served`, or `rejected`.
**Body:** `{"status": "preparing"}`
---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `KITCHEN_ALERT_THRESHOLDS` | ❌ | `25,50,75,90,100` | Comma-separated arrival % thresholds |
| `PORT` | ❌ | `5555` | Server port |

---

## Quick Start

```bash
# 1. Run the Live Ops migration (creates tables + allergy column)
node database/live_ops.sql.js

# 2. Start the server
npm run dev

# 3. Submit a song request
curl -X POST http://localhost:5555/live/dj/<event_id>/request \
  -H "Content-Type: application/json" \
  -d '{"song_name":"Blinding Lights","artist_name":"The Weeknd","requested_by":"Aarav"}'

# 4. View the leaderboard
curl http://localhost:5555/live/dj/<event_id>/leaderboard

# 5. View the kitchen dashboard
curl http://localhost:5555/live/kitchen/<event_id>/dashboard

# 6. Connect to WebSocket (kitchen channel)
wscat -c "ws://localhost:5555?channel=kitchen:<event_id>"
```

---

## File Reference

| File | Description |
|---|---|
| `backend/routes/live.js` | Express router (10 endpoints) |
| `backend/services/liveOpsService.js` | Business logic (dedup, upvote, milestones, allergy) |
| `backend/database/live_ops.sql.js` | Migration script |
| `backend/guest_management/services/headcountService.js` | Allergy alert broadcast on arrival |
| `backend/guest_management/services/rsvpService.js` | Accepts `allergy_severity` during RSVP |
| `backend/guest_management/websocket/wsManager.js` | Channel-based WebSocket engine |
