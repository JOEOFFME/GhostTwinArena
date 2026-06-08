"""Google Gemini LLM client — drop-in replacement for claude_client.py.

Same public interface: llm.react(), llm.chat(), llm.online.
Falls back gracefully to on-character lines when no API key is set.
Uses the Gemini REST API via httpx (no extra SDK dependency needed).
"""
import random
import httpx
from app.config import settings
from app.legends.registry import get_legend

_GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models"
    "/{model}:generateContent?key={key}"
)

_TIMEOUT = 20.0


def _call_gemini(system_prompt: str, user_message: str, max_tokens: int = 300) -> str:
    """Single REST call to Gemini. Returns the generated text."""
    url = _GEMINI_URL.format(model=settings.GEMINI_MODEL, key=settings.GEMINI_API_KEY)
    body = {
        "system_instruction": {
            "parts": [{"text": system_prompt}]
        },
        "contents": [
            {"role": "user", "parts": [{"text": user_message}]}
        ],
        "generationConfig": {
            "maxOutputTokens": max_tokens,
            "temperature": 0.85,
            "topP": 0.95,
        },
        "safetySettings": [
            {"category": "HARM_CATEGORY_HARASSMENT",       "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH",      "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT","threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT","threshold": "BLOCK_NONE"},
        ],
    }
    with httpx.Client(timeout=_TIMEOUT) as client:
        r = client.post(url, json=body)
    r.raise_for_status()
    data = r.json()
    # Navigate the Gemini response structure
    return data["candidates"][0]["content"]["parts"][0]["text"].strip()


class GhostTwinLLM:
    """Gemini-powered legend AI. Same interface as the original Claude client."""

    def __init__(self):
        # Per-user conversation memory for /chat
        self._history: dict[str, list] = {}

    @property
    def online(self) -> bool:
        return bool(settings.GEMINI_API_KEY)

    def react(self, system_prompt: str, user_message: str) -> str:
        """One-shot reaction (no memory) — used for live match events."""
        if not self.online:
            return self._fallback(user_message)
        try:
            return _call_gemini(system_prompt, user_message, max_tokens=settings.REACTION_MAX_TOKENS)
        except Exception as e:
            print(f"[gemini] react() failed: {e}")
            return self._fallback(user_message)

    def chat(self, user_id: str, system_prompt: str, user_message: str) -> str:
        """Multi-turn chat with light per-user memory (last 6 exchanges)."""
        if not self.online:
            return self._fallback(user_message)
        hist = self._history.setdefault(user_id, [])
        hist.append({"role": "user", "parts": [{"text": user_message}]})

        # Build conversation body with history
        url = _GEMINI_URL.format(model=settings.GEMINI_MODEL, key=settings.GEMINI_API_KEY)
        body = {
            "system_instruction": {"parts": [{"text": system_prompt}]},
            "contents": hist[-12:],  # cap context window
            "generationConfig": {
                "maxOutputTokens": settings.CHAT_MAX_TOKENS,
                "temperature": 0.85,
                "topP": 0.95,
            },
            "safetySettings": [
                {"category": "HARM_CATEGORY_HARASSMENT",       "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_HATE_SPEECH",      "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT","threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_DANGEROUS_CONTENT","threshold": "BLOCK_NONE"},
            ],
        }
        try:
            with httpx.Client(timeout=_TIMEOUT) as client:
                r = client.post(url, json=body)
            r.raise_for_status()
            data = r.json()
            reply = data["candidates"][0]["content"]["parts"][0]["text"].strip()
            hist.append({"role": "model", "parts": [{"text": reply}]})
            return reply
        except Exception as e:
            print(f"[gemini] chat() failed: {e}")
            hist.pop()  # remove failed user turn
            return self._fallback(user_message)

    def reset(self, user_id: str) -> None:
        self._history.pop(user_id, None)

    # ── offline / demo fallback ─────────────────────────────────────────────
    @staticmethod
    def _fallback(user_message: str, legend_id: str = "hadji") -> str:
        m = user_message.upper()
        if "GOAL FOR MOROCCO" in m or ("GOAL" in m and "MOROCCO" in m):
            pool = [
                "Goooal! Wallah, c'est magnifique! Le peuple marocain attendait ca... C'est pour le Maroc!",
                "Yaaah! Tu as vu ca?! Ce but, il vient du coeur. On a toujours cru en nous!",
            ]
        elif "RED CARD" in m:
            pool = [
                "Carte rouge... Bon. Maintenant il faut serrer les rangs. On a deja gagne a dix, je l'ai vecu.",
                "Aie. C'est dur. Mais le mental, c'est ca qui compte. Concentration, daba!",
            ]
        elif "PENALTY" in m:
            pool = [
                "Penalty! Le coeur bat fort la... Garde ton calme, respire avec l'equipe.",
                "Un penalty! Wallah ces moments, c'est magique et terrible a la fois...",
            ]
        elif "VAR" in m:
            pool = [
                "La VAR... On attend. C'est long, je sais. Patience, le football se joue aussi dans la tete.",
                "VAR en cours. Moi de mon temps il n'y avait pas ca, hein! On verra bien...",
            ]
        elif "FULL TIME" in m or "FULLTIME" in m:
            pool = [
                "Coup de sifflet final! Quelle bataille. Fier de ces garcons, vraiment.",
                "C'est fini! Le football, c'est magique - ca te fait pleurer et tomber amoureux la meme seconde...",
            ]
        else:
            pool = [
                "Le football, c'est magique, mon ami. Raconte-moi ce que tu ressens.",
                "Apres l'islam, le football est notre deuxieme religion. On regarde ca ensemble, toi et moi.",
                "On a toujours cru en nous. Pose-moi ta question, je t'ecoute.",
            ]
        return random.choice(pool)


llm = GhostTwinLLM()
