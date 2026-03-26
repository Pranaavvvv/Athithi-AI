# Guest Verification — API Documentation & cURL Commands

> **Prerequisites:**
> - Node.js backend running on `localhost:5555` (`cd backend && npm run dev`)
> - FastAPI deployed at `https://hackniche-financial-agent.onrender.com` (or locally on `:8000`)

---

## Full Flow Overview

```
Step 1: Create Event (FastAPI)
Step 2: Add Guest to Event (Node.js)
Step 3: Book Guest → generates RSVP link (NO QR)
Step 4: Guest Fills RSVP Form → status = "rsvp_pending_verification"
Step 5: Client Views Pending Guests (review dashboard)
Step 6: Client Approves/Rejects Guest → QR generated on approval
Step 7: Guest Views QR Code via RSVP Link
```

---

## Step 1: Create Event

**`POST /api/finance/events`** — Creates a new event (enquiry).

```bash
curl -X POST https://hackniche-financial-agent.onrender.com/api/finance/events ^
  -H "Content-Type: application/json" ^
  -d "{\"client_name\": \"Rahul Verma\", \"client_phone\": \"9876543210\", \"client_email\": \"rahul@example.com\", \"party_name\": \"Verma Wedding Reception\", \"event_date\": \"2026-04-15\", \"location\": \"Grand Ballroom, Hotel Singularity\", \"guest_count\": 100, \"menu_tier\": \"PREMIUM\"}"
```

**Response:**
```json
{
  "id": "d5d76de9-3434-438e-8d42-e0f37b51bffb",
  "party_name": "Verma Wedding Reception",
  "status": "enquiry",
  "verify_entries": true,
  ...
}
```

> 📌 Save `id` → this is your **EVENT_ID**

---

## Step 2: Add Guest

**`POST /gm/guests/:eventId`** — Adds a guest to an event.

```bash
curl -X POST http://localhost:5555/gm/guests/EVENT_ID ^
  -H "Content-Type: application/json" ^
  -d "{\"name\": \"Aarav Patel\", \"email\": \"aarav@example.com\", \"phone\": \"+91-9876543210\", \"plus_ones\": 2, \"notes\": \"Family friend\"}"
```

**Response:**
```json
{
  "guest": {
    "id": "7acfdc22-de9f-4b6b-a31d-c52d08d114e9",
    "status": "inquiry",
    ...
  }
}
```

> 📌 Save `guest.id` → this is your **GUEST_ID**

---

## Step 3: Book Guest (RSVP Link Generated, NO QR)

**`PATCH /gm/guests/:guestId/status`** — Transitions guest to `booked`. Generates an RSVP token and magic link. **No QR code is generated at this stage.**

```bash
curl -X PATCH http://localhost:5555/gm/guests/GUEST_ID/status ^
  -H "Content-Type: application/json" ^
  -d "{\"status\": \"booked\"}"
```

**Response:**
```json
{
  "message": "Guest booked. RSVP link generated. QR code will be created after guest is verified.",
  "guestId": "7acfdc22-...",
  "rsvpToken": "5aa6318b-d0cb-4408-b7ab-7f1681903256",
  "rsvpLink": "http://localhost:5556/rsvp/5aa6318b-d0cb-4408-b7ab-7f1681903256"
}
```

> 📌 Save `rsvpToken` → this is your **RSVP_TOKEN**
> 📌 Share the `rsvpLink` with the guest (this is the "magic link")

---

## Step 4: Guest Fills RSVP Form

**`POST /gm/rsvp/:rsvpToken`** — Guest submits their details and optional photo. Status transitions to `rsvp_pending_verification` when `verify_entries` is enabled on the event.

```bash
curl -X POST http://localhost:5555/gm/rsvp/RSVP_TOKEN ^
  -F "name=Aarav Patel" ^
  -F "email=aarav@example.com" ^
  -F "phone=+91-9876543210" ^
  -F "dietary_preferences=Vegetarian" ^
  -F "allergy_severity=mild" ^
  -F "plus_ones=2" ^
  -F "notes=Looking forward to it!" ^
  -F "photo=@C:/path/to/guest_photo.jpg"
```

**Response:**
```json
{
  "message": "RSVP submitted successfully!",
  "guestId": "7acfdc22-...",
  "status": "rsvp_pending_verification"
}
```

> ⚠️ If `status` shows `rsvp_completed` instead, the event's `verify_entries` flag is `false`. Fix it:
> ```bash
> node -e "const pool = require('./guest_management/config/db'); pool.query(\"UPDATE events SET verify_entries = TRUE WHERE id = 'EVENT_ID'\").then(() => { console.log('Fixed!'); pool.end(); })"
> ```

---

## Step 5: Client Views Pending Verification List

**`GET /gm/guests/:eventId/pending-verification`** — Returns all guests awaiting client approval. Shows name, photo, dietary preferences, etc.

```bash
curl http://localhost:5555/gm/guests/EVENT_ID/pending-verification
```

**Response:**
```json
{
  "guests": [
    {
      "id": "7acfdc22-...",
      "name": "Aarav Patel",
      "email": "aarav@example.com",
      "phone": "+91-9876543210",
      "status": "rsvp_pending_verification",
      "dietary_preferences": "Vegetarian",
      "allergy_severity": "mild",
      "plus_ones": 2,
      "photo_url": "/uploads/1711388184-photo.jpg",
      "rsvp_completed_at": "2026-03-25T17:20:00.000Z"
    }
  ],
  "count": 1
}
```

---

## Step 6: Client Approves or Rejects Guest

**`PATCH /gm/guests/:guestId/verify`** — Client approves or rejects a guest. On approval, QR code is generated.

### Approve:
```bash
curl -X PATCH http://localhost:5555/gm/guests/GUEST_ID/verify ^
  -H "Content-Type: application/json" ^
  -d "{\"action\": \"approve\"}"
```

**Response:**
```json
{
  "message": "Guest \"Aarav Patel\" verified! QR code generated.",
  "guestId": "7acfdc22-...",
  "status": "verified",
  "rsvpLink": "http://localhost:5556/rsvp/5aa6318b-...",
  "qrCode": "data:image/png;base64,iVBOR..."
}
```

### Reject:
```bash
curl -X PATCH http://localhost:5555/gm/guests/GUEST_ID/verify ^
  -H "Content-Type: application/json" ^
  -d "{\"action\": \"reject\"}"
```

**Response:**
```json
{
  "message": "Guest \"Aarav Patel\" rejected.",
  "guestId": "7acfdc22-...",
  "status": "rejected"
}
```

---

## Step 7: Guest Views QR Code

**`GET /gm/rsvp/:rsvpToken`** — Guest accesses their RSVP page to see event info and QR code (if verified).

```bash
curl http://localhost:5555/gm/rsvp/RSVP_TOKEN
```

**Response (verified guest):**
```json
{
  "event": {
    "id": "d5d76de9-...",
    "name": "Verma Wedding Reception",
    "date": "2026-04-14T18:30:00.000Z",
    "venue": "Grand Ballroom, Hotel Singularity"
  },
  "guest": {
    "name": "Aarav Patel",
    "status": "verified",
    "verified": true,
    "qrCode": "data:image/png;base64,iVBOR...",
    "dietaryPreferences": "Vegetarian",
    "plusOnes": 2
  }
}
```

**Response (pending/rejected guest):**
```json
{
  "guest": {
    "status": "rsvp_pending_verification",
    "verified": false,
    "qrCode": null
  }
}
```

---

## Additional Endpoints

### List All Guests for an Event
```bash
curl http://localhost:5555/gm/guests/EVENT_ID
```

### Toggle verify_entries for an Event
Set `verify_entries = false` to skip verification and auto-issue QR codes:
```bash
node -e "const pool = require('./guest_management/config/db'); pool.query(\"UPDATE events SET verify_entries = FALSE WHERE id = 'EVENT_ID'\").then(() => { console.log('Done'); pool.end(); })"
```
