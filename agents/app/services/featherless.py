"""
Featherless.ai Intelligence Service
Wraps all LLM calls for:
1. Fraud Guard (Vendor Bill OCR)
2. Lead Cooling Detector
3. Price Sensitivity Analysis
4. Cancellation Post-Mortem
5. Vibe Report (Post-Event Synthesis)
"""

import os
import httpx
from typing import Optional

FEATHERLESS_API_KEY = os.getenv("FEATHERLESS_API_KEY", "")
FEATHERLESS_BASE_URL = os.getenv("FEATHERLESS_BASE_URL", "https://api.featherless.ai/v1")
FEATHERLESS_MODEL = os.getenv("FEATHERLESS_MODEL", "meta-llama/Meta-Llama-3.1-8B-Instruct")


async def _call_featherless(system_prompt: str, user_prompt: str, max_tokens: int = 500) -> str:
    """
    Core function to call the Featherless.ai LLM API (OpenAI-compatible).
    Returns the generated text response.
    """
    if not FEATHERLESS_API_KEY:
        return "[Featherless.ai API key not configured. Skipping AI analysis.]"

    headers = {
        "Authorization": f"Bearer {FEATHERLESS_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": FEATHERLESS_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "max_tokens": max_tokens,
        "temperature": 0.7,
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{FEATHERLESS_BASE_URL}/chat/completions",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
    except Exception as e:
        return f"[AI analysis failed: {str(e)}]"


# ─────────────────────────────────────────────
# 1. FRAUD GUARD — Vendor Bill Verification
# ─────────────────────────────────────────────

async def verify_vendor_bill(
    vendor_name: str,
    claimed_amount: float,
    bill_description: str,
    image_base64: Optional[str] = None,
) -> dict:
    """
    Analyze a vendor bill for potential discrepancies.
    If an image is provided, uses Vision LLM to extract the actual invoice total.
    Returns: {"ai_verified_amount": float, "raw_analysis": str}
    """
    system_prompt = (
        "You are a financial auditor AI for a banquet management system. "
        "Analyze vendor bills for potential discrepancies or anomalies. "
        "If an invoice image is provided, extract the TOTAL AMOUNT from it. "
        "Return your analysis EXACTLY as: AMOUNT: <number>, FLAG: <yes/no>, NOTE: <brief explanation>"
    )

    if image_base64:
        # ─── Vision OCR: Send image to Vision-capable model ───
        user_content = [
            {
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"},
            },
            {
                "type": "text",
                "text": (
                    f"Vendor: {vendor_name}\n"
                    f"Claimed Amount: ₹{claimed_amount:,.2f}\n"
                    f"Description: {bill_description}\n\n"
                    f"Extract the total amount from this invoice image and compare it "
                    f"with the claimed amount. Is there a discrepancy?"
                ),
            },
        ]

        if not FEATHERLESS_API_KEY:
            return {"raw_analysis": "[API key not configured]", "ai_verified_amount": claimed_amount}

        headers = {
            "Authorization": f"Bearer {FEATHERLESS_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": FEATHERLESS_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            "max_tokens": 500,
            "temperature": 0.3,
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{FEATHERLESS_BASE_URL}/chat/completions",
                    headers=headers,
                    json=payload,
                )
                response.raise_for_status()
                data = response.json()
                analysis = data["choices"][0]["message"]["content"]

                # Try to extract amount from AI response
                extracted_amount = claimed_amount
                if "AMOUNT:" in analysis:
                    try:
                        amount_str = analysis.split("AMOUNT:")[1].split(",")[0].strip()
                        amount_str = amount_str.replace("₹", "").replace(",", "").strip()
                        extracted_amount = float(amount_str)
                    except (ValueError, IndexError):
                        pass

                return {"raw_analysis": analysis, "ai_verified_amount": extracted_amount}
        except Exception as e:
            return {"raw_analysis": f"[Vision OCR failed: {str(e)}]", "ai_verified_amount": claimed_amount}
    else:
        # ─── Text-only analysis (no image) ───
        user_prompt = (
            f"Vendor: {vendor_name}\n"
            f"Claimed Amount: ₹{claimed_amount:,.2f}\n"
            f"Description: {bill_description}\n\n"
            f"Analyze whether this bill amount seems reasonable for the described service."
        )
        result = await _call_featherless(system_prompt, user_prompt)
        return {"raw_analysis": result, "ai_verified_amount": claimed_amount}



# ─────────────────────────────────────────────
# 2. LEAD COOLING DETECTOR
# ─────────────────────────────────────────────

async def analyze_cooling_lead(
    party_name: str,
    client_name: str,
    guest_count: int,
    menu_tier: str,
    event_date: str,
    hours_inactive: float,
) -> str:
    """
    Assess a stale lead and recommend next steps.
    """
    system_prompt = (
        "You are a sales intelligence AI for a banquet management system. "
        "Analyze leads that have gone cold (no payment activity) and provide "
        "actionable recommendations in 2-3 sentences."
    )
    user_prompt = (
        f"Lead: {party_name} (Client: {client_name})\n"
        f"Guests: {guest_count}, Tier: {menu_tier}, Event Date: {event_date}\n"
        f"Inactive for: {hours_inactive:.0f} hours (no UTR/payment activity)\n\n"
        f"Assess conversion probability and suggest a follow-up strategy."
    )

    return await _call_featherless(system_prompt, user_prompt, max_tokens=200)


# ─────────────────────────────────────────────
# 3. PRICE SENSITIVITY ANALYSIS
# ─────────────────────────────────────────────

async def analyze_price_sensitivity(
    guest_count: int,
    menu_tier: str,
    total_quoted: float,
    event_date: str,
    location: str,
) -> str:
    """
    Generate a pricing recommendation note for the Sales team.
    """
    system_prompt = (
        "You are a pricing intelligence AI for a banquet management system. "
        "Analyze the booking profile and recommend pricing adjustments or "
        "strategies to maximize conversion. Keep advice concise (3-4 sentences)."
    )
    user_prompt = (
        f"Booking Profile:\n"
        f"- Guests: {guest_count}\n"
        f"- Menu Tier: {menu_tier}\n"
        f"- Total Quoted: ₹{total_quoted:,.2f}\n"
        f"- Event Date: {event_date}\n"
        f"- Location: {location}\n\n"
        f"Provide a pricing sensitivity analysis and conversion recommendation."
    )

    return await _call_featherless(system_prompt, user_prompt, max_tokens=300)


# ─────────────────────────────────────────────
# 4. CANCELLATION POST-MORTEM
# ─────────────────────────────────────────────

async def analyze_cancellation(
    party_name: str,
    client_name: str,
    guest_count: int,
    menu_tier: str,
    total_quoted: float,
    days_in_enquiry: int,
    had_utr_activity: bool,
) -> str:
    """
    Analyze why a lead was lost and categorize the reason.
    """
    system_prompt = (
        "You are a post-mortem analysis AI for a banquet management system. "
        "Analyze cancelled or expired enquiries and categorize the loss reason as: "
        "PRICE (too expensive), DATE (scheduling conflict), COMPETITOR (lost to rival), "
        "or COLD (client lost interest). Provide a 2-3 sentence analysis."
    )
    user_prompt = (
        f"Lost Lead: {party_name} (Client: {client_name})\n"
        f"Guests: {guest_count}, Tier: {menu_tier}\n"
        f"Quoted: ₹{total_quoted:,.2f}\n"
        f"Days in enquiry stage: {days_in_enquiry}\n"
        f"Had UTR/payment activity: {'Yes' if had_utr_activity else 'No'}\n\n"
        f"Categorize the loss reason and recommend prevention strategies."
    )

    return await _call_featherless(system_prompt, user_prompt, max_tokens=250)


# ─────────────────────────────────────────────
# 5. VIBE REPORT — Post-Event Synthesis
# ─────────────────────────────────────────────

async def generate_vibe_report(
    party_name: str,
    expected_guests: int,
    actual_guests: int,
    menu_tier: str,
    top_song_requests: Optional[list] = None,
    photo_count: int = 0,
) -> str:
    """
    Generate an AI 'Vibe Report' synthesizing event data.
    """
    songs_text = ", ".join(top_song_requests[:10]) if top_song_requests else "No data"

    system_prompt = (
        "You are an event analytics AI for a banquet management system. "
        "Generate a professional yet engaging 'Vibe Report' summarizing the event's "
        "success, guest engagement, and recommendations for future events. "
        "Use a warm, professional tone. Format with sections."
    )
    user_prompt = (
        f"Event: {party_name}\n"
        f"Menu Tier: {menu_tier}\n"
        f"Expected Guests: {expected_guests}\n"
        f"Actual Guests: {actual_guests}\n"
        f"Attendance Rate: {(actual_guests / expected_guests * 100):.1f}%\n"
        f"Photos Uploaded: {photo_count}\n"
        f"Top Song Requests: {songs_text}\n\n"
        f"Generate a comprehensive Vibe Report with actionable insights."
    )

    return await _call_featherless(system_prompt, user_prompt, max_tokens=600)


# ─────────────────────────────────────────────
# 6. SMART FP GENERATION
# ─────────────────────────────────────────────

async def generate_smart_fp(
    party_name: str,
    client_name: str,
    event_date: str,
    location: str,
    guest_count: int,
    menu_tier: str,
    total_quoted: float,
    revenue_collected: float,
) -> str:
    """
    Use LLM to draft a professional Function Prospectus document.
    """
    system_prompt = (
        "You are a professional document writer for a banquet management system. "
        "Generate a formal Function Prospectus (FP) document for the operations team. "
        "Include sections: Event Overview, Logistics, Menu Details, Staff Requirements, "
        "and Special Instructions. Keep it professional and actionable."
    )
    user_prompt = (
        f"Event: {party_name}\n"
        f"Client: {client_name}\n"
        f"Date: {event_date}\n"
        f"Location: {location}\n"
        f"Expected Guests: {guest_count}\n"
        f"Menu Tier: {menu_tier}\n"
        f"Total Quoted: ₹{total_quoted:,.2f}\n"
        f"Revenue Collected: ₹{revenue_collected:,.2f}\n\n"
        f"Generate a complete Function Prospectus document."
    )

    return await _call_featherless(system_prompt, user_prompt, max_tokens=800)
