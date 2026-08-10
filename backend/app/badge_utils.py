"""Single source of truth for whether a product shows the "NEW" badge.

Used by both Product.is_new (so the API/edit modal can report current state)
and slide_planner.build_slide_plan (so the live preview and the pptx/pdf
export can never drift from what the List/Edit UI shows).
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

NEW_BADGE_DAYS = 60


def compute_is_new(created_at, override: Optional[bool]) -> bool:
    """override is the manual pin set from the Edit Product modal: True/False
    forces the badge on/off regardless of age; None (the default — nothing
    manually chosen yet) falls back to the automatic rule: shown for
    NEW_BADGE_DAYS days from creation."""
    if override is not None:
        return bool(override)
    if created_at is None:
        return False
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) - created_at <= timedelta(days=NEW_BADGE_DAYS)
