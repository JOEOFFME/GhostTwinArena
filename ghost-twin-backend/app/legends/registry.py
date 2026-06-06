"""Loads every legend profile in the profiles dir and exposes lookup helpers.

To add a new legend you ONLY add a new <name>.json file in profiles/ with the same
schema (persona + emotional_states + avatars + quiz_bank + what_he_said_decoys).
Nothing else in the codebase needs to change - that is the 'any player, any sport' design.
"""
import os
import json
import glob
from app.config import settings

_LEGENDS: dict = {}


def _load_all():
    _LEGENDS.clear()
    for path in glob.glob(os.path.join(settings.PROFILES_DIR, "*.json")):
        with open(path, encoding="utf-8") as f:
            profile = json.load(f)
        _LEGENDS[profile["id"]] = profile


def get_legend(legend_id: str) -> dict:
    if not _LEGENDS:
        _load_all()
    if legend_id not in _LEGENDS:
        raise KeyError(f"Unknown legend '{legend_id}'")
    return _LEGENDS[legend_id]


def list_legends() -> list:
    """Public-safe summary list for the Home / Legend-selection screen."""
    if not _LEGENDS:
        _load_all()
    out = []
    for p in _LEGENDS.values():
        out.append({
            "id": p["id"],
            "name": p["name"],
            "arabic_name": p.get("arabic_name"),
            "archetype": p.get("archetype"),
            "archetype_desc": p.get("archetype_desc"),
            "years": p.get("years"),
            "locked": p.get("locked", True),
            "unlock_cost_coins": p.get("unlock_cost_coins", 0),
            "tier": p.get("tier", "premium"),
            "accent_color": p.get("accent_color"),
            "idle_avatar": resolve_avatar(p["id"], "idle"),
        })
    return out


def resolve_avatar(legend_id: str, state: str) -> dict:
    """Return the avatar descriptor for a legend in a given state.

    Always returns something usable, falling back to 'neutral' then 'idle'.
    The 'url' points at the served static asset so the frontend just renders it.
    """
    legend = get_legend(legend_id)
    avatars = legend.get("avatars", {})
    chosen = avatars.get(state) or avatars.get("neutral") or avatars.get("idle") or {}
    asset = chosen.get("asset", f"{legend_id}_neutral.svg")
    return {
        "state": state,
        "mood": chosen.get("mood", "warm"),
        "label": chosen.get("label", ""),
        "asset": asset,
        "url": f"/static/avatars/{asset}",
        "accent_color": legend.get("accent_color", "#c8102e"),
    }
