# Ghost Twin Arena — Backend

The AI matchday companion. Pick a Moroccan football legend, and they watch the game
*with* you — reacting live in text + voice, testing you with quizzes, daring you to
guess their real reactions, and running a fan-vs-fan prediction league. Their avatar
changes with every emotion on the pitch.

MVP legend: **Mustapha Hadji** ("The Fire").

---

## Why this is built to "just run"

Everything degrades gracefully:

- **No Anthropic key?** The legend still speaks via on-character fallback lines.
- **No ElevenLabs key?** `audio_url` is `null`, the app shows text. No crash.
- **No sports API?** `SIMULATION_MODE=true` lets you fire events by hand or replay a script.
- **Avatars** are generated as real SVGs you can swap for art later.

So you can clone, `pip install`, `uvicorn`, and demo — keys are upgrades, not blockers.

---

## Setup

```bash
python -m venv venv && source venv/bin/activate     # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                 # add keys if you have them
python -m app.avatars.generate                       # build the avatar SVGs
uvicorn main:app --reload --port 8000
```

Swagger docs: <http://localhost:8000/docs>

---

## Architecture

```
Mobile App  ->  FastAPI (this)  ->  Claude   (legend personality)
                      |          ->  ElevenLabs (cloned voice)
                      +-- match state machine -> emotional state -> AVATAR
```

```
app/
  config.py                 settings / env
  models.py                 request & response schemas
  legends/
    registry.py             loads profiles, resolves avatars
    profiles/hadji_*.json   ONE file per legend = persona + avatars + quiz + decoys
  persona/
    prompt_engine.py        builds the dynamic system prompt
    darija.py               FR / Darija / Arabic detection
  match/
    state_machine.py        score + emotion + avatar engine
    simulator.py            demo events / scripted arc
  llm/claude_client.py      Anthropic wrapper (+ offline fallback)
  voice/tts_client.py       ElevenLabs wrapper (+ graceful no-op)
  games/
    reactions.py            live event -> text + voice + avatar
    quiz.py                 Legend Memory Quiz
    what_he_said.py         "guess his real reaction" game
    predictions.py          prediction duel + fan-vs-fan
  store/memory_store.py     users, coins, streaks, leaderboard (swappable)
  avatars/generate.py       SVG avatar generator
```

**Add a new legend** = drop one JSON file in `profiles/` + regenerate avatars. No code changes.

---

## Endpoints

### System
| Method | Path | Purpose |
|---|---|---|
| GET | `/` `/health` | status, AI online, match snapshot |

### Legends & Avatars
| Method | Path | Purpose |
|---|---|---|
| GET | `/legends` | home screen — all legends, lock state, idle avatar |
| GET | `/legends/{id}/avatar/{state}` | one avatar for a state |
| GET | `/legends/{id}/avatars` | all avatars (preload) |

### Match
| Method | Path | Purpose |
|---|---|---|
| GET | `/match-state` | current score / minute / emotion / avatar |
| POST | `/match/reset` | reset the demo match |
| POST | `/simulate` | fire a manual event |
| GET | `/simulate/script` | the scripted demo arc |

### Core loop — reactions & chat
| Method | Path | Purpose |
|---|---|---|
| POST | `/react` | legend reacts to an event (text + voice + avatar) |
| POST | `/chat` | free-form multilingual chat with the legend |

### Prediction Duel + Fan vs Fan
| Method | Path | Purpose |
|---|---|---|
| GET | `/prediction/legend` | the legend's own prediction |
| POST | `/prediction/submit` | fan submits a scoreline; legend comments |
| POST | `/prediction/resolve` | score everyone after full time |
| GET | `/leaderboard` | fan-vs-fan league standings |

### Quiz
| Method | Path | Purpose |
|---|---|---|
| GET | `/quiz/next` | serve a quiz card (daily limit aware) |
| POST | `/quiz/answer` | grade, update streak + coins |

### What He Said
| Method | Path | Purpose |
|---|---|---|
| POST | `/what-he-said/open` | open a 30s "guess the real reaction" round |
| POST | `/what-he-said/guess` | submit a guess |

### Wallet / Monetization
| Method | Path | Purpose |
|---|---|---|
| GET | `/wallet` | coins, pro status, badges, quiz left |
| POST | `/legends/{id}/unlock` | spend coins to unlock a legend |
| POST | `/twin-pass/activate` | activate subscription (removes caps) |

---

## Avatar states

`idle · listening · thinking · neutral · tense · frustrated · euphoric · celebrating · heartbroken`

The match drives them: Morocco goal → `celebrating`, opponent goal → `heartbroken`,
red card / penalty → `tense`, VAR → `thinking`, then they settle back to the steady mood.
Every reaction response includes the current `avatar` object with a ready-to-render `url`.

---

## 60-second demo

```bash
curl -X POST localhost:8000/simulate -H 'content-type: application/json' \
  -d '{"type":"GOAL","team":"Morocco","scorer":"Ziyech","minute":80}'

curl -X POST localhost:8000/react -H 'content-type: application/json' \
  -d '{"type":"GOAL","team":"Morocco","scorer":"Ziyech","minute":80}'

curl localhost:8000/quiz/next
curl localhost:8000/leaderboard
```

> "Every legend eventually goes silent. We built the technology to change that."
