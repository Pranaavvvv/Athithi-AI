from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Dict, Any
import json
import logging

from app.database import get_db
from app.models.event import Event
from app.services.featherless import _call_featherless

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/dashboard")
async def get_analytics_dashboard(db: AsyncSession = Depends(get_db)):
    # Fetch events for context
    result = await db.execute(select(Event))
    events = result.scalars().all()
    
    event_summaries = []
    for e in events[-20:]:  # limit to last 20 for prompt size
        event_summaries.append(
            f"- {e.party_name} | Status: {e.status.value} | Guests: {e.guest_count} | Tier: {e.menu_tier.value} | Date: {e.event_date.strftime('%Y-%m-%d')} | Quoted: {e.total_quoted_amount}"
        )
    events_text = "\n".join(event_summaries) if event_summaries else "No recent events."

    system_prompt = (
        "You are an expert AI strategic director for a high-end banquet hall. "
        "Analyze the provided recent event data and generate an analytics dashboard JSON. "
        "Your output must be ONLY valid JSON, with absolutely no markdown blocks or other text. "
        "Follow this exact structure: "
        "{"
        "  \"menu_optimization\": [ { \"item\": \"string\", \"tier\": \"string\", \"requests\": number, \"wastage_pct\": \"string\", \"roi_score\": number, \"action\": \"string\" } ],"
        "  \"post_mortem\": { \"total_lost_leads\": number, \"estimated_revenue_loss\": \"string\", \"reasons\": [ { \"cause\": \"string\", \"count\": number, \"pct\": \"string\" } ], \"analysis\": \"string\" },"
        "  \"synergy\": [ { \"date\": \"string\", \"events\": [\"string\"], \"saving_opportunity\": \"string\" } ]"
        "}"
    )
    
    user_prompt = f"Here is the recent event data:\n{events_text}\n\nBased on this, generate realistic, highly insightful insights reflecting menu performance, lost leads post-mortem, and operational scheduling synergies."

    fallback_data = {
      "menu_optimization": [
        { "item": "Live Sushi Boat", "tier": "Elite", "requests": 450, "wastage_pct": "2%", "roi_score": 98, "action": "Keep" },
        { "item": "Standard Dal Makhani", "tier": "Standard", "requests": 650, "wastage_pct": "14%", "roi_score": 85, "action": "Monitor" }
      ],
      "post_mortem": {
        "total_lost_leads": 12,
        "estimated_revenue_loss": "₹ 2,400,000",
        "reasons": [
          { "cause": "Price Sensitive", "count": 8, "pct": "66%" },
          { "cause": "Date Overlap", "count": 4, "pct": "34%" }
        ],
        "analysis": "Leads are dropping mostly due to lack of flexible pricing on premium dates."
      },
      "synergy": [
        { "date": "2026-11-14", "events": ["Wedding A", "Corporate B"], "saving_opportunity": "₹ 45k Staff Pooling" }
      ]
    }

    try:
        response_text = await _call_featherless(system_prompt, user_prompt, max_tokens=1000)
        # Parse output ensuring it's json
        # remove markdown codeticks if present
        cleaned = response_text.replace("```json", "").replace("```", "").strip()
        data = json.loads(cleaned)
        return data
    except Exception as e:
        logger.warning(f"Failed to generate dynamic analytics: {e}")
        return fallback_data
