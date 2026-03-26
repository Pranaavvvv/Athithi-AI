"""
Menu Router — CSV pricing ingestion and tier-based menu management.
"""

import csv
import io
from collections import defaultdict
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.menu_item import MenuItem
from app.models.enums import MenuTier
from app.schemas.menu import MenuItemResponse, MenuUploadResponse, TierPricingSummary

router = APIRouter()


# ─────────────────────────────────────────────
# CSV UPLOAD — Ingest pricing sheet
# ─────────────────────────────────────────────

@router.post("/upload-csv", response_model=MenuUploadResponse)
async def upload_menu_csv(
    file: UploadFile = File(..., description="CSV file with columns: tier, category, item_name, price_per_guest"),
    replace_existing: bool = Query(default=True, description="If true, deletes all existing menu items before loading"),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a CSV pricing sheet to populate the menu_items table.
    Expected columns: tier, category, item_name, price_per_guest
    """
    # Validate file type
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are accepted.")

    # Read and decode
    content = await file.read()
    try:
        decoded = content.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File must be UTF-8 encoded.")

    # Parse CSV
    reader = csv.DictReader(io.StringIO(decoded))
    required_columns = {"tier", "category", "item_name", "price_per_guest"}
    if not required_columns.issubset(set(reader.fieldnames or [])):
        raise HTTPException(
            status_code=400,
            detail=f"CSV must contain columns: {required_columns}. Found: {reader.fieldnames}",
        )

    # Delete existing items if replacing
    if replace_existing:
        await db.execute(select(MenuItem).execution_options(synchronize_session="fetch"))
        existing = await db.execute(select(MenuItem))
        for item in existing.scalars().all():
            await db.delete(item)
        await db.flush()

    # Parse and insert rows
    items_loaded = 0
    tier_data = defaultdict(lambda: {"items": 0, "total": Decimal("0"), "categories": defaultdict(Decimal)})

    for row in reader:
        tier_str = row["tier"].strip().lower()
        category = row["category"].strip().lower()
        item_name = row["item_name"].strip()
        price = Decimal(row["price_per_guest"].strip())

        # Validate tier
        try:
            tier = MenuTier(tier_str)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid tier '{tier_str}'. Must be: standard, premium, or elite.",
            )

        menu_item = MenuItem(
            tier=tier,
            category=category,
            item_name=item_name,
            price_per_guest=price,
        )
        db.add(menu_item)
        items_loaded += 1

        # Track for summary
        tier_data[tier_str]["items"] += 1
        tier_data[tier_str]["total"] += price
        tier_data[tier_str]["categories"][category] += price

    await db.flush()

    # Build tier summary
    tier_summary = [
        TierPricingSummary(
            tier=tier,
            total_items=data["items"],
            base_rate_per_guest=data["total"],
            categories=dict(data["categories"]),
        )
        for tier, data in sorted(tier_data.items())
    ]

    return MenuUploadResponse(
        success=True,
        message=f"Successfully loaded {items_loaded} menu items from '{file.filename}'.",
        items_loaded=items_loaded,
        tier_summary=tier_summary,
    )


# ─────────────────────────────────────────────
# LIST ITEMS — Browse menu items
# ─────────────────────────────────────────────

@router.get("/items", response_model=List[MenuItemResponse])
async def list_menu_items(
    tier: Optional[MenuTier] = Query(default=None, description="Filter by tier"),
    category: Optional[str] = Query(default=None, description="Filter by category"),
    db: AsyncSession = Depends(get_db),
):
    """List all active menu items, optionally filtered by tier or category."""
    query = select(MenuItem).where(MenuItem.is_active == True).order_by(MenuItem.tier, MenuItem.category)
    if tier:
        query = query.where(MenuItem.tier == tier)
    if category:
        query = query.where(MenuItem.category == category.lower())

    result = await db.execute(query)
    return result.scalars().all()


# ─────────────────────────────────────────────
# TIER SUMMARY — Aggregate pricing per tier
# ─────────────────────────────────────────────

@router.get("/tier-summary", response_model=List[TierPricingSummary])
async def get_tier_summary(db: AsyncSession = Depends(get_db)):
    """
    Returns per-tier aggregate pricing.
    e.g. {standard: ₹770/guest, premium: ₹1140/guest, elite: ₹2600/guest}
    """
    result = await db.execute(
        select(MenuItem).where(MenuItem.is_active == True).order_by(MenuItem.tier)
    )
    items = result.scalars().all()

    if not items:
        raise HTTPException(status_code=404, detail="No menu items found. Upload a CSV first.")

    # Aggregate by tier
    tier_data = defaultdict(lambda: {"items": 0, "total": Decimal("0"), "categories": defaultdict(Decimal)})

    for item in items:
        tier_key = item.tier.value
        tier_data[tier_key]["items"] += 1
        tier_data[tier_key]["total"] += item.price_per_guest
        tier_data[tier_key]["categories"][item.category] += item.price_per_guest

    return [
        TierPricingSummary(
            tier=tier,
            total_items=data["items"],
            base_rate_per_guest=data["total"],
            categories=dict(data["categories"]),
        )
        for tier, data in sorted(tier_data.items())
    ]
