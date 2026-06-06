"""Live match reactions - the core loop. An event comes in, the legend reacts
in text + voice, and his avatar updates to match his emotion.
"""
from app.match.state_machine import current_match
from app.persona.prompt_engine import build_system_prompt
from app.llm.claude_client import llm
from app.voice.tts_client import synthesize
from app.legends.registry import resolve_avatar


def _event_description(event: dict, state: dict) -> str:
    ctx = f"Match: {state['score']}, minute {state['minute']}.\n"
    etype = (event.get("type") or "GENERAL").upper()
    if etype == "GOAL":
        ctx += f"EVENT: GOAL for {event.get('team', 'a team')}! Scored by {event.get('scorer', 'a player')}."
    elif etype == "RED_CARD":
        ctx += f"EVENT: RED CARD - {event.get('player', 'a player')} sent off!"
    elif etype == "VAR":
        ctx += "EVENT: VAR review in progress. A long, tense wait."
    elif etype == "PENALTY":
        ctx += f"EVENT: PENALTY awarded to {event.get('team', 'a team')}!"
    elif etype == "KICKOFF":
        ctx += "EVENT: Kickoff! The match begins."
    elif etype == "FULLTIME":
        ctx += "EVENT: Full time whistle!"
    else:
        ctx += "EVENT: general moment in play."
    return ctx + "\nReact now, in character."


async def react_to_event(legend_id: str, event: dict, want_voice: bool = True) -> dict:
    # 1. update match + emotion + (transient) avatar
    current_match.process_event(event)
    state = current_match.to_dict()
    avatar = resolve_avatar(legend_id, current_match.avatar_state)

    # 2. legend speaks
    system = build_system_prompt(legend_id, state)
    text = llm.react(system, _event_description(event, state))

    # 3. voice (optional / graceful)
    audio = await synthesize(text) if want_voice else None

    # 4. settle the avatar back toward steady mood for subsequent polls
    current_match.settle_avatar()

    return {
        "text": text,
        "audio_url": audio,
        "emotional_state": state["emotional_state"],
        "avatar": avatar,
        "match_context": state["description"],
    }
