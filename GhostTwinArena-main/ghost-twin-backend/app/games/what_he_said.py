"""'What He Said' / 'What Would the Legend Do?' - micro-engagement at high-emotion
moments. At a key event we show three reactions: one is what the legend actually
said (Claude, in character), two are plausible decoys from his profile. The fan has
30 seconds to pick the real one. Right = coins, wrong = the legend teases you.
"""
import uuid
import random
from app.config import settings
from app.legends.registry import get_legend, resolve_avatar
from app.match.state_machine import current_match
from app.persona.prompt_engine import build_system_prompt
from app.llm.claude_client import llm
from app.store.memory_store import store
from app.games.reactions import _event_description

_DECOY_KEY = {
    "GOAL_MOROCCO": "GOAL_MOROCCO",
    "GOAL_OPPONENT": "GOAL_OPPONENT",
    "RED_CARD": "RED_CARD",
    "PENALTY": "PENALTY",
}


def _decoy_key_for(event: dict) -> str:
    etype = (event.get("type") or "").upper()
    if etype == "GOAL":
        team = (event.get("team") or "").lower()
        is_morocco = team in ("morocco", current_match.home_team.lower())
        return "GOAL_MOROCCO" if is_morocco else "GOAL_OPPONENT"
    return etype


def open_round(legend_id: str, event: dict) -> dict:
    legend = get_legend(legend_id)

    # 1. the REAL reaction, in character
    current_match.process_event(event)
    state = current_match.to_dict()
    system = build_system_prompt(legend_id, state)
    real = llm.react(system, _event_description(event, state))

    # 2. two decoys from the profile (graceful fallback if none for this event)
    key = _decoy_key_for(event)
    decoys = list(legend.get("what_he_said_decoys", {}).get(key, []))
    generic = ["Restons calmes, le match est long.", "On verra la suite, patience.",
               "C'est le football, ca arrive."]
    while len(decoys) < 2:
        decoys.append(generic[len(decoys) % len(generic)])
    decoys = random.sample(decoys, 2)

    # 3. shuffle into 3 options, remember the real index
    options = decoys + [real]
    random.shuffle(options)
    answer_index = options.index(real)

    round_id = f"whs_{uuid.uuid4().hex[:10]}"
    store.open_whs_round(round_id, answer_index, settings.COINS_WHAT_HE_SAID, ttl=30)
    current_match.settle_avatar()

    return {
        "round_id": round_id,
        "prompt": f"{legend['name']} just reacted to a {event.get('type', 'moment')}. Which one is really him?",
        "options": options,
        "timer_seconds": 30,
        "reward": settings.COINS_WHAT_HE_SAID,
        "avatar": resolve_avatar(legend_id, "thinking"),
    }


def guess(user_id: str, round_id: str, choice_index: int, legend_id: str = "hadji") -> dict:
    rnd = store.get_whs_round(round_id)
    if rnd is None:
        return {"error": "unknown or expired round"}
    if rnd["closed"]:
        return {"error": "round already answered"}

    import time
    expired = time.time() > rnd["expires"]
    store.close_whs_round(round_id)
    correct = (not expired) and choice_index == rnd["answer_index"]

    coins = 0
    if correct:
        coins = rnd["payout"]
        store.add_coins(user_id, coins)
        tease = None
        avatar_state = "celebrating"
    else:
        tease = ("Trop tard!" if expired
                 else "Haha, non! Tu crois me connaitre? Reessaie, mon ami.")
        avatar_state = "neutral"

    return {
        "correct": correct,
        "expired": expired,
        "real_index": rnd["answer_index"],
        "coins_awarded": coins,
        "tease": tease,
        "balance": store.user(user_id).coins,
        "avatar": resolve_avatar(legend_id, avatar_state),
    }
