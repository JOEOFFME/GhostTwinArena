"""Generate professional idle SVG avatars for locked legends."""
import os

LEGENDS = [
    ("ziyech", "HZ", "ZIYECH", "#006233"),
    ("en_nesyri", "YE", "EN-NESYRI", "#006233"),
    ("saiss", "YS", "SAISS", "#006233"),
    ("bounou", "YB", "BOUNOU", "#006233"),
    ("naybet", "NN", "NAYBET", "#c8102e"),
]

TEMPLATE = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" width="400" height="500">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#001428"/>
      <stop offset="100%" stop-color="#000814"/>
    </linearGradient>
  </defs>
  <rect width="400" height="500" fill="url(#bg)"/>
  <rect x="32" y="32" width="336" height="336" rx="8" fill="none" stroke="{accent}" stroke-width="2" opacity="0.35"/>
  <text x="200" y="230" font-family="Arial, Helvetica, sans-serif" font-size="88" font-weight="700"
        fill="{accent}" text-anchor="middle" opacity="0.95">{initials}</text>
  <rect y="420" width="400" height="80" fill="#001B3D"/>
  <text x="200" y="468" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="700"
        letter-spacing="4" fill="#FFFFFF" text-anchor="middle">{label}</text>
</svg>
"""

STATES = [
    "idle", "listening", "thinking", "neutral", "tense",
    "frustrated", "euphoric", "celebrating", "heartbroken",
]

base = os.path.join(os.path.dirname(__file__), "..", "static", "avatars")
base = os.path.normpath(base)

for legend_id, initials, label, accent in LEGENDS:
    svg = TEMPLATE.format(initials=initials, label=label, accent=accent)
    for state in STATES:
        path = os.path.join(base, f"{legend_id}_{state}.svg")
        with open(path, "w", encoding="utf-8") as f:
            f.write(svg)
        print("wrote", path)
