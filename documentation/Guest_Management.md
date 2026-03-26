# Guest Management Module API Documentation

This directory contains a standalone module for managing guest lifecycles, RSVP links, QR-code based check-in, real-time live headcount, facial recognition embeddings, and kitchen alerts.

## Overview of Services

- **QR Service (`services/qrService.js`)**: Generates unique QR codes for guests whose status is "booked". The QR code directly encodes the guest's RSVP link to be scanned or visited.
- **RSVP Service (`services/rsvpService.js`)**: Manages RSVP links and processes guest submissions, including demographic options (dietary prefs, plus-ones) and photo uploads.
- **Embedding Service (`services/embeddingService.js`)**: Replaces the OpenRouter API with a local python microservice (`face-service/face_server.py`) running `facenet-pytorch` to convert guest photos into 512-dimensional facial embeddings. These are stored locally via PostgreSQL's `pgvector` extension.
- **Headcount Service (`services/headcountService.js`)**: Responsible for gathering metrics on exact Arrived vs Expected headcount and calculating thresholds.
- **Kitchen Alert Service (`services/kitchenAlertService.js`)**: When headcount thresholds (25%, 50%, 75%, 90%, 100%) are reached, these alerts are sent to Kitchen clients or Event Managers instantly over WebSockets.
- **WebSocket Manager (`websocket/wsManager.js`)**: Handles live, bidirectional real-time communication for headcount updates and kitchen alerts based on "channels" like `kitchen:event123` or `headcount:event123`.

---

## Complete API Reference

Base URL (if running locally natively via `npm start`): `http://localhost:5556`

### 1. Guests API

Used by Event Managers/Admins to manage the initial guest list before the event, checking statuses, and triggering invites/QR codes.

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| `GET` | `/guests/:eventId` | Retrieve all guest records for an event | - | `{ guests: Guest[], count: number }` |
| `POST` | `/guests/:eventId` | Add a new guest manually (defaults to `inquiry` status) | `{ name, email, phone, plus_ones, notes }` | `{ guest: Guest }` |
| `PATCH` | `/guests/:guestId/status` | Advance guest status to `booked`. **Auto-generates QR + RSVP links when changing to "booked"**. | `{ status: "booked" }` | `{ message, guestId, rsvpToken, rsvpLink, qrCode }` |
| `POST` | `/guests/:guestId/qr` | Manually generate (or regenerate) the QR code for a booked guest | - | `{ guestId, rsvpUrl, qrCode: "base64..." }` |
| `POST` | `/guests/event/:eventId/generate-all-qr` | Bulk re-generate QR codes for all booked guests across the event | - | `{ generated: int, skipped: int, errors: [] }` |


### 2. RSVP API 

Public-facing API intended for the web application the final guest sees. Includes form querying and multipart submission.

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| `GET` | `/rsvp/:rsvpToken` | Returns the Guest data + Event details based on token. Recently updated: also returns the `qrCode` base64 string so users can view it on the RSVP page. | - | `{ event: Event, guest: Guest }` |
| `POST` | `/rsvp/:rsvpToken` | For the guest to submit their options and their `photo` for face embeddings. Expected as `multipart/form-data`. Auto-triggers the face service. | `name`, `email`, `phone`, `dietary_preferences`, `plus_ones`, `notes`, `photo` (File) | `{ message, guestId }` |
| `GET` | `/rsvp/event/:eventId` | (Admin) Fetch a breakdown of all finalized RSVPs for an event | - | `{ rsvps: RSVP[], count: number }` |


### 3. Headcount & Arrival API

Used heavily at the door by GRE staff scanning the QR codes and returning live status.

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| `GET` | `/headcount/:eventId` | View current stats on Total Expected vs Arrived. Used to render the dashboard pie/donut charts. | - | `{ eventId, total, expected, arrived, remaining, percentArrived }` |
| `POST` | `/headcount/:eventId/scan` | Mark a guest as arrived (called as soon as GRE scans a QR). Automatically evaluates if the percentage crossed a threshold to fire Kitchen alerts. | `{ guestId, scannedBy? }` | `{ message, total, expected, arrived, remaining, percentArrived }` |
| `GET` | `/headcount/:eventId/alerts` | Get the historical ledger of all kitchen alerts that triggered. | - | `{ alerts: Alert[], count: number }` |


### 4. WebSocket Channels

Connect via `ws://localhost:5556?channel=<ChannelName>`. No HTTP polling required.

* **Channel `headcount:{eventId}`**
  Receives a packet every single time someone is checked in at the door:
  ```json
  {
    "type": "headcount_update",
    "guestName": "Aarav Patel",
    "total": 100,
    "expected": 80,
    "arrived": 40,
    "remaining": 40,
    "percentArrived": 50,
    "timestamp": "2026-..."
  }
  ```

* **Channel `kitchen:{eventId}`**
  Receives a packet *only* when an alert threshold (25, 50, 75, 90, 100%) is crossed:
  ```json
  {
    "type": "kitchen_alert",
    "alertType": "threshold_reached",
    "message": "🍽️ 50% headcount reached! 40/80 guests have arrived.",
    "threshold": 50,
    "total": 100,
    ...
  }
  ```


### 5. Python Face Microservice

Internal microservice used strictly from Node.js (runs on `http://localhost:5557`).

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/embed` | Takes `{ file: "image.png" }` (multipart) and returns `{ embedding: [...], dimensions: 512 }`. |
| `POST` | `/compare` | Takes `{ embedding1: [...], embedding2: [...] }` and computes face dot/cosine similarity returning `{ similarity: 0.85, is_match: true }`. |

### 6. Database Subschema

All tables run in the same PostgreSQL database as the main application but are prefixed with `gm_` to keep the module completely self-contained and avoid any merge conflicts.

#### `gm_events`
Stores the top-level event information.
- `id` (UUID): Primary Key
- `name` (VARCHAR): Event name
- `event_token` (VARCHAR): Unique token for public event links
- `event_date` (TIMESTAMPTZ): Date of event
- `venue` (TEXT): Venue address/name
- `max_guests` (INTEGER): Hard limit on guest count
- `created_by` (UUID): Reference to the Admin user who created it

#### `gm_guests`
The core ledger of all guests, their statuses, demographic options, and facial embeddings.
- `id` (UUID): Primary Key
- `event_id` (UUID): Foreign key to `gm_events`
- `status` (VARCHAR): Lifecycle state: `inquiry` → `booked` → `rsvp_sent` → `rsvp_completed` → `arrived`
- `qr_code` (TEXT): Base64 encoded image string containing the RSVP URL
- `rsvp_token` (VARCHAR): Unique secure token for the public RSVP link
- `dietary_preferences` (TEXT): "Vegan", "Gluten-Free", etc.
- `plus_ones` (INTEGER): Number of additional generic guests
- `photo_url` (TEXT): File path to the uploaded face photo 
- `embedding` (vector(512)): pgvector column storing the 512-dim face tensor generated by facenet-pytorch

#### `gm_arrival_log`
An immutable append-only ledger of every single door scan to preserve history exactly as it happened.
- `guest_id` (UUID): Foreign key to `gm_guests`
- `scanned_by` (UUID): Foreign key to the GRE user who scanned the QR code
- `scanned_at` (TIMESTAMPTZ): Exact timestamp 

#### `gm_kitchen_alerts`
Logs of all automated alerts fired by the system when headcount thresholds crossed `KITCHEN_ALERT_THRESHOLDS`.
- `alert_type` (VARCHAR): The classification (e.g., `threshold_reached`)
- `message` (TEXT): The human-readable string that was sent via WebSockets
- `percentage_reached` (NUMERIC): E.g., `50` for 50%.
