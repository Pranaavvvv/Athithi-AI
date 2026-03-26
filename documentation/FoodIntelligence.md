# AI Food Recommendation Engine

The **Food Intelligence Agents** optimize kitchen operations by learning from historical consumption, tracking waste, checking same-day event overlaps for shared cooking, and using LLMs to recommend cost-effective menus.

> **Base URL (Deployed):** `https://hackniche-financial-agent.onrender.com`  
> **Base URL (Local):** `http://localhost:5555`  
> **Route Prefix:** `/food`

---

## 1. NLP Chef Command (Consumption Logging)

**`POST /food/:eventId/chef-command`**

Allows the chef to dictate what was made vs. what was left over in natural language. The AI parses this into exact prep/consumed metrics.

**Request:**
```json
{
  "command": "150 paneer tikka made, 120 consumed. 200 butter chicken prepared but only 160 eaten. 50 gulab jamun left over from 100 prepared"
}
```

**Response (201):**
```json
{
  "message": "Parsed and logged 3 items from chef's command",
  "items": [
    {
      "item_name": "paneer tikka",
      "category": "main_course",
      "quantity_prepared": 150,
      "quantity_consumed": 120,
      "quantity_wasted": 30
    }
  ]
}
```

---

## 2. Generate Event Menu Recommendation

**`GET /food/:eventId/recommend`**

Calls the Featherless LLM to generate a structured menu recommendation. It dynamically feeds the AI:
1. All available items for the event's specific `menu_tier` (Standard/Elite)
2. All **other events** happening on that exact date (for shared cooking)
3. Historical top **consumed** items
4. Historical top **wasted** items

**Response (200):**
```json
{
  "event": {
    "id": "69793cd5-...",
    "name": "Simulated Gala Dinner",
    "guests": 15,
    "tier": "STANDARD"
  },
  "recommendation": "**Simulated Gala Dinner Menu Optimization Report**\n\n### Suggested Shared Cooking\nWe can share cooking with 'Corporate Mix' for: Paneer Tikka (Est savings: ₹2,400).\n\n### Items to AVOID\n- Gulab Jamun (Historically 50% wasted)\n...",
  "same_day_overlap": 1,
  "historical_data_points": 5
}
```

---

## 3. Consumption Analytics

These endpoints pull aggregated data across *all* events to determine true popularity and waste.

### Historical Popularity
**`GET /food/history/popularity`**
Returns items sorted by highest consumption volume.

### Historically Wasted
**`GET /food/history/wasted`**
Returns items where `prepared > consumed` consistently.

```json
{
  "wasted_items": [
    {
      "item_name": "gulab jamun",
      "category": "dessert",
      "total_prepared": "100",
      "total_consumed": "50",
      "total_wasted": "50",
      "consumption_rate": "50.0"
    }
  ]
}
```

---

## 4. Single Event Consumption Report

**`GET /food/:eventId/consumption`**

Used by the Financial Agent to generate post-event invoices based on actual consumption vs. quoted assumptions.

**Response (200):**
```json
{
  "summary": {
    "total_prepared": 450,
    "total_consumed": 360,
    "total_wasted": 90,
    "consumption_rate": "80%"
  },
  "items": [ ... ]
}
```

---

## Database Schema Highlights

### `food_consumption`
- `item_name`, `category`
- `quantity_prepared`
- `quantity_consumed`
- `quantity_wasted` (Auto-computed postgres column)

### `food_recommendations`
- Stores the full markdown AI response
- JSON snapshots of the `historical_context` and `same_day_events` used to make the decision for auditing.
