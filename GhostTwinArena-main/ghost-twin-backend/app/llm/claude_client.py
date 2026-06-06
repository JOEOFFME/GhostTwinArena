"""Anthropic Claude wrapper for legend responses.

If no API key is configured the client returns on-character fallback lines so the
whole backend stays runnable for an offline demo - nothing crashes, the legend
still 'speaks'.
"""
import random
from app.config import settings
from app.legends.registry import get_legend

try:
    import anthropic
    _SDK = True
except ImportError:
    _SDK = False


class GhostTwinLLM:
    def __init__(self):
        self._client = None
        if _SDK and settings.ANTHROPIC_API_KEY:
            self._client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        # per-user short conversation memory for the /chat endpoint
        self._history: dict[str, list] = {}

    @property
    def online(self) -> bool:
        return self._client is not None

    def react(self, system_prompt: str, user_message: str) -> str:
        """One-shot reaction (no memory) - used for live match events."""
        if not self.online:
            return self._fallback(user_message)
        msg = self._client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=settings.REACTION_MAX_TOKENS,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
        )
        return msg.content[0].text.strip()

    def chat(self, user_id: str, system_prompt: str, user_message: str) -> str:
        """Multi-turn chat with light per-user memory."""
        if not self.online:
            return self._fallback(user_message)
        hist = self._history.setdefault(user_id, [])
        hist.append({"role": "user", "content": user_message})
        msg = self._client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=settings.CHAT_MAX_TOKENS,
            system=system_prompt,
            messages=hist[-12:],            # cap context
        )
        reply = msg.content[0].text.strip()
        hist.append({"role": "assistant", "content": reply})
        return reply

    def reset(self, user_id: str) -> None:
        self._history.pop(user_id, None)

    # --- offline / demo fallback ----------------------------------------
    @staticmethod
    def _fallback(user_message: str, legend_id: str = "hadji") -> str:
        legend = get_legend(legend_id)
        m = user_message.upper()
        if "GOAL FOR MOROCCO" in m or ("GOAL" in m and "MOROCCO" in m):
            pool = ["Goooal! Wallah, c'est magnifique! Le peuple marocain attendait ca... C'est pour le Maroc!",
                    "Yaaah! Tu as vu ca?! Ce but, il vient du coeur. On a toujours cru en nous!"]
        elif "RED CARD" in m:
            pool = ["Carte rouge... Bon. Maintenant il faut serrer les rangs. On a deja gagne a dix, je l'ai vecu.",
                    "Aie. C'est dur. Mais le mental, c'est ca qui compte. Concentration, daba!"]
        elif "PENALTY" in m:
            pool = ["Penalty! Le coeur bat fort la... Garde ton calme, respire avec l'equipe.",
                    "Un penalty! Wallah ces moments, c'est magique et terrible a la fois..."]
        elif "VAR" in m:
            pool = ["La VAR... On attend. C'est long, je sais. Patience, le football se joue aussi dans la tete.",
                    "VAR en cours. Moi de mon temps il n'y avait pas ca, hein! On verra bien..."]
        elif "FULL TIME" in m or "FULLTIME" in m:
            pool = ["Coup de sifflet final! Quelle bataille. Fier de ces garcons, vraiment.",
                    "C'est fini! Le football, c'est magique - ca te fait pleurer et tomber amoureux la meme seconde..."]
        else:
            pool = ["Le football, c'est magique, mon ami. Raconte-moi ce que tu ressens.",
                    "Apres l'islam, le football est notre deuxieme religion. On regarde ca ensemble, toi et moi.",
                    "On a toujours cru en nous. Pose-moi ta question, je t'ecoute."]
        return random.choice(pool)


llm = GhostTwinLLM()
