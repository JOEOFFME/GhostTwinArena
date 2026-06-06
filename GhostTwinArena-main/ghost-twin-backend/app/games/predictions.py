"""Pre-match Prediction Duel + Fan vs Fan League.

Flow:
  1. Legend offers his own prediction (in character).
  2. Fan submits theirs (agree or challenge).
  3. After the match, resolve_predictions scores everyone and awards coins.
  4. Leaderboard ranks fans -> Fan vs Fan league.
"""
from app.legends.registry import get_legend
from app.match.state_machine import current_match
from app.persona.prompt_engine import build_system_prompt
from app.llm.claude_client import llm
from app.store.memory_store import store


def legend_prediction(legend_id: str) -> dict:
    """The legend's own pre-match call (AI-generated, in character)."""
    state = current_match.to_dict()
    system = build_system_prompt(legend_id, state)
    prompt = (f"Pre-match. {state['home_team']} vs {state['away_team']}. "
              "Give YOUR scoreline prediction and one short reason, in character, "
              "under 40 words. End with a friendly challenge to the fan.")
    return {"legend_id": legend_id, "prediction_text": llm.react(system, prompt)}


def comment_on_prediction(legend_id: str, home: int, away: int) -> str:
    """Legend reacts to the fan's submitted scoreline."""
    state = current_match.to_dict()
    system = build_system_prompt(legend_id, state)
    prompt = (f"The fan predicts {state['home_team']} {home}-{away} {state['away_team']}. "
              "React in character in under 40 words - agree warmly or challenge them.")
    return llm.react(system, prompt)


def submit_prediction(user_id: str, match_id: str, home: int, away: int,
                      legend_id: str = "hadji") -> dict:
    store.save_prediction(match_id, user_id, home, away)
    return {
        "saved": True,
        "your_prediction": f"{home}-{away}",
        "legend_comment": comment_on_prediction(legend_id, home, away),
        "scoring": "Exact score = 3 pts (30 coins). Correct outcome = 1 pt (10 coins).",
    }


def resolve(match_id: str, final_home: int, final_away: int) -> dict:
    results = store.resolve_predictions(match_id, final_home, final_away)
    return {"match_id": match_id, "final": f"{final_home}-{final_away}", "results": results}
