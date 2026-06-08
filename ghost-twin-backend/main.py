"""Ghost Twin Arena - FastAPI backend.

Run:  uvicorn main:app --reload --port 8000
Docs: http://localhost:8000/docs
"""
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.models import (
    MatchEvent, ChatRequest, PredictionRequest, PredictionResolve,
    QuizAnswer, WhatHeSaidGuess,
)
from app.legends.registry import list_legends, get_legend, resolve_avatar
from app.match.state_machine import current_match
from app.match.simulator import reset_match, trigger, DEMO_SCRIPT
from app.persona.prompt_engine import build_system_prompt
from app.persona.darija import with_language_hint
from app.llm.gemini_client import llm
from app.voice.tts_client import synthesize
from app.store.memory_store import store
from app.games import reactions, quiz, what_he_said, predictions

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start background tasks on server boot."""
    if not settings.SIMULATION_MODE and settings.FOOTBALL_API_KEY:
        from app.match.live_fetcher import live_poll_loop
        task = asyncio.create_task(live_poll_loop())
        print("[startup] Live football poller started (RapidAPI)")
    else:
        task = None
        print(f"[startup] Simulation mode ON — using manual events")
    yield
    if task:
        task.cancel()


app = FastAPI(title="Ghost Twin Arena API", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])
app.mount("/static", StaticFiles(directory=settings.STATIC_DIR), name="static")


# ============================ SYSTEM ============================
@app.get("/")
def root():
    return {"status": "Ghost Twin Arena is live",
            "ai_online": llm.online,
            "simulation_mode": settings.SIMULATION_MODE}


@app.get("/health")
def health():
    return {"status": "alive", "match": current_match.to_dict()}


# ============================ LEGENDS & AVATARS ============================
@app.get("/legends")
def legends(user_id: str = "guest"):
    """Home screen - all selectable legends with lock state and idle avatar."""
    u = store.user(user_id)
    items = []
    for legend in list_legends():
        profile_locked = legend.get("locked", True)
        owned = legend["id"] in u.unlocked_legends
        items.append({**legend, "locked": profile_locked and not owned})
    return {"legends": items}


@app.get("/legends/{legend_id}/avatar/{state}")
def avatar(legend_id: str, state: str):
    """Resolve a legend's avatar for any state (idle, euphoric, heartbroken, ...)."""
    try:
        return resolve_avatar(legend_id, state)
    except KeyError:
        raise HTTPException(404, "Unknown legend")


@app.get("/legends/{legend_id}/avatars")
def all_avatars(legend_id: str):
    """Full avatar set for a legend - handy for the frontend to preload."""
    try:
        legend = get_legend(legend_id)
    except KeyError:
        raise HTTPException(404, "Unknown legend")
    return {"legend_id": legend_id,
            "avatars": {s: resolve_avatar(legend_id, s) for s in legend["avatars"]}}


# ============================ MATCH ============================
@app.get("/match-state")
def match_state():
    return current_match.to_dict()


@app.post("/match/reset")
def match_reset(home: str = "Morocco", away: str = "Portugal"):
    return reset_match(home, away)


@app.post("/simulate")
def simulate(event: MatchEvent):
    """Demo: manually fire a match event (updates score + emotion + avatar)."""
    return trigger(event.model_dump(exclude_none=True))


@app.get("/simulate/script")
def simulate_script():
    """The scripted demo arc the team can step through on stage."""
    return {"script": DEMO_SCRIPT}


# ============================ REACTIONS (core loop) ============================
@app.post("/react")
async def react(event: MatchEvent, legend_id: str = "hadji"):
    """Legend reacts to a live event in text + voice, avatar updates."""
    return await reactions.react_to_event(legend_id, event.model_dump(exclude_none=True))


@app.post("/chat")
async def chat(req: ChatRequest, legend_id: str = "hadji"):
    """Free-form multilingual chat with the legend during the match."""
    state = current_match.to_dict()
    system = build_system_prompt(legend_id, state)
    user_msg = with_language_hint(req.message, req.preferred_language)
    text = llm.chat(req.user_id, system, f"[MATCH: {state['description']}]\n{user_msg}")
    audio = await synthesize(text)
    return {
        "text": text,
        "audio_url": audio,
        "emotional_state": state["emotional_state"],
        "avatar": resolve_avatar(legend_id, current_match.avatar_state),
        "match_context": state["description"],
    }


# ============================ PREDICTION DUEL + FAN VS FAN ============================
@app.get("/prediction/legend")
def prediction_legend(legend_id: str = "hadji"):
    """The legend's own pre-match prediction (the duel kickoff)."""
    return predictions.legend_prediction(legend_id)


@app.post("/prediction/submit")
def prediction_submit(req: PredictionRequest, legend_id: str = "hadji"):
    """Fan submits a scoreline; legend comments and it enters the league."""
    return predictions.submit_prediction(req.user_id, req.match_id,
                                          req.home_score, req.away_score, legend_id)


@app.post("/prediction/resolve")
def prediction_resolve(req: PredictionResolve):
    """Score all predictions for a match after full time (awards coins)."""
    return predictions.resolve(req.match_id, req.final_home, req.final_away)


@app.get("/leaderboard")
def leaderboard(top: int = 20):
    """Fan vs Fan weekly league standings."""
    return {"leaderboard": store.leaderboard(top)}


# ============================ QUIZ ============================
@app.get("/quiz/next")
def quiz_next(user_id: str = "guest", legend_id: str = "hadji"):
    """Serve a quiz card (respects free-tier daily limit)."""
    return quiz.next_question(legend_id, user_id)


@app.post("/quiz/answer")
def quiz_answer(ans: QuizAnswer):
    """Grade a quiz answer, update streak + coins."""
    return quiz.grade(ans.legend_id, ans.user_id, ans.question_id, ans.answer_index)


# ============================ WHAT HE SAID ============================
@app.post("/what-he-said/open")
def whs_open(event: MatchEvent, legend_id: str = "hadji"):
    """Open a 'guess the real reaction' round at a key moment."""
    return what_he_said.open_round(legend_id, event.model_dump(exclude_none=True))


@app.post("/what-he-said/guess")
def whs_guess(g: WhatHeSaidGuess, legend_id: str = "hadji"):
    """Submit a guess; right = coins, wrong = the legend teases you."""
    return what_he_said.guess(g.user_id, g.round_id, g.choice_index, legend_id)


# ============================ COINS & WALLET ============================
@app.get("/wallet")
def wallet(user_id: str = "guest"):
    u = store.user(user_id)
    return {"user_id": u.user_id, "coins": u.coins, "is_pro": u.is_pro,
            "unlocked_legends": sorted(u.unlocked_legends),
            "streak": u.quiz_streak, "badges": u.badges,
            "quiz_remaining_today": store.quiz_remaining(user_id)}


@app.post("/legends/{legend_id}/unlock")
def unlock_legend(legend_id: str, user_id: str = "guest"):
    """Spend Twin Coins to unlock a premium legend."""
    try:
        legend = get_legend(legend_id)
    except KeyError:
        raise HTTPException(404, "Unknown legend")
    u = store.user(user_id)
    if legend_id in u.unlocked_legends:
        return {"unlocked": True, "already_owned": True, "balance": u.coins}
    cost = legend.get("unlock_cost_coins", 0)
    if not store.spend_coins(user_id, cost):
        return {"unlocked": False, "reason": "insufficient_coins",
                "needed": cost, "balance": u.coins}
    u.unlocked_legends.add(legend_id)
    return {"unlocked": True, "spent": cost, "balance": u.coins}


@app.post("/twin-pass/activate")
def activate_pass(user_id: str = "guest"):
    """Activate Twin Pass subscription (removes free-tier caps)."""
    u = store.user(user_id)
    u.is_pro = True
    return {"is_pro": True, "perks": ["all legends", "unlimited quiz", "no coin cap", "ad-free"]}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
