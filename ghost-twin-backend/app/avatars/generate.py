"""Generates one expressive SVG avatar per state for a legend.

These are stylized, lightweight placeholders so the avatar feature is fully
demonstrable out of the box. Swap in real illustrations / Lottie later - the
contract (one asset per state, served at /static/avatars/<asset>) stays the same.

Run:  python -m app.avatars.generate
"""
import os
from app.config import settings
from app.legends.registry import get_legend

# state -> (skin glow, brow path, eye shape, mouth path, extra)
# Expressions are drawn relative to a 240x240 viewBox face.
STATE_STYLE = {
    "idle":        {"bg": "#1a1a2e", "glow": "#2a2a45", "brow": "M70 95 L100 95 M140 95 L170 95",
                    "mouth": "M95 165 Q120 175 145 165", "eye_r": 9, "tag": "💤"},
    "listening":   {"bg": "#16213e", "glow": "#28406b", "brow": "M70 92 L100 90 M140 90 L170 92",
                    "mouth": "M98 165 Q120 172 142 165", "eye_r": 11, "tag": "👂"},
    "thinking":    {"bg": "#1b2a4a", "glow": "#3a5a8c", "brow": "M70 90 L100 96 M140 88 L170 92",
                    "mouth": "M100 168 L140 164", "eye_r": 9, "tag": "🤔"},
    "neutral":     {"bg": "#1a3020", "glow": "#2e6b3f", "brow": "M70 93 L100 92 M140 92 L170 93",
                    "mouth": "M96 164 Q120 172 144 164", "eye_r": 10, "tag": "🙂"},
    "tense":       {"bg": "#3a2a10", "glow": "#8c6a2e", "brow": "M70 88 L100 98 M140 98 L170 88",
                    "mouth": "M100 168 L140 168", "eye_r": 8, "tag": "😬"},
    "frustrated":  {"bg": "#3a1414", "glow": "#9c2e2e", "brow": "M68 86 L102 100 M138 100 L172 86",
                    "mouth": "M98 172 Q120 162 142 172", "eye_r": 8, "tag": "😤"},
    "euphoric":    {"bg": "#0e3a1e", "glow": "#1fc060", "brow": "M70 86 L100 88 M140 88 L170 86",
                    "mouth": "M92 160 Q120 188 148 160", "eye_r": 12, "tag": "🤩"},
    "celebrating": {"bg": "#1a3a14", "glow": "#3ddc6b", "brow": "M70 84 L100 86 M140 86 L170 84",
                    "mouth": "M88 158 Q120 196 152 158", "eye_r": 13, "tag": "🎉"},
    "heartbroken": {"bg": "#1a1430", "glow": "#5a3a8c", "brow": "M70 90 L100 84 M140 84 L170 90",
                    "mouth": "M96 176 Q120 164 144 176", "eye_r": 9, "tag": "💔"},
}


def _svg(legend_name: str, accent: str, state: str, s: dict) -> str:
    initials = "".join(w[0] for w in legend_name.split()[:2]).upper()
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 280" width="240" height="280">
  <defs>
    <radialGradient id="g" cx="50%" cy="38%" r="65%">
      <stop offset="0%" stop-color="{s['glow']}"/>
      <stop offset="100%" stop-color="{s['bg']}"/>
    </radialGradient>
  </defs>
  <rect width="240" height="280" rx="24" fill="url(#g)"/>
  <!-- head -->
  <circle cx="120" cy="120" r="78" fill="#e8c39a" stroke="{accent}" stroke-width="4"/>
  <!-- hair -->
  <path d="M44 110 Q120 20 196 110 Q170 80 120 78 Q70 80 44 110 Z" fill="#23150c"/>
  <!-- eyes -->
  <circle cx="92" cy="116" r="{s['eye_r']}" fill="#23150c"/>
  <circle cx="148" cy="116" r="{s['eye_r']}" fill="#23150c"/>
  <!-- brows -->
  <path d="{s['brow']}" stroke="#23150c" stroke-width="6" fill="none" stroke-linecap="round"/>
  <!-- mouth -->
  <path d="{s['mouth']}" stroke="#8c3a2e" stroke-width="6" fill="none" stroke-linecap="round"/>
  <!-- state ribbon -->
  <rect x="0" y="234" width="240" height="46" rx="0" fill="{accent}" opacity="0.92"/>
  <text x="120" y="263" font-family="Arial, sans-serif" font-size="20" font-weight="800"
        fill="#fff" text-anchor="middle">{initials} · {state.upper()}</text>
</svg>"""


def generate(legend_id: str = "hadji") -> list:
    legend = get_legend(legend_id)
    accent = legend.get("accent_color", "#c8102e")
    out_dir = os.path.join(settings.STATIC_DIR, "avatars")
    os.makedirs(out_dir, exist_ok=True)
    written = []
    for state, meta in legend.get("avatars", {}).items():
        style = STATE_STYLE.get(state, STATE_STYLE["neutral"])
        svg = _svg(legend["name"], accent, state, style)
        path = os.path.join(out_dir, meta["asset"])
        with open(path, "w", encoding="utf-8") as f:
            f.write(svg)
        written.append(path)
    return written


if __name__ == "__main__":
    for p in generate():
        print("wrote", p)
