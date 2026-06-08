# 👻 Ghost Twin Arena — World Cup 2030

> *"Every legend eventually goes silent. We built the technology to change that."*

**Ghost Twin Arena** is an AI-powered matchday companion app built for the **2030 Morocco World Cup** — and the foundation of something much bigger: **the world's first living football community**, where fans don't just watch games, they experience them together.

Fans pick a Moroccan football legend as their match co-pilot. The legend reacts to live events in real-time, speaks in Darija, French, and English, and pulls fans into a living community of predictions, challenges, quizzes, and shared matchday moments.

The MVP focuses on one legend: **Mustapha Hadji** — attacking midfielder, 1998 World Cup hero, Coventry City — chosen for his fiery, poetic, multilingual personality that makes for the most compelling demo.

Built at **Hackathon Sport Tech 2026** by Youssef Dihaji & Malak — INPT Rabat.

---

## How It Works

The system has four layers that talk to each other in one direction during a match:

```
Mobile App  →  FastAPI Backend  →  Anthropic Claude
(React)        (Python)             (claude-sonnet-4)
                    ↑           →  ElevenLabs (Voice)
              Sports API
```

- The **frontend** shows the legend, prediction UI, and plays audio reactions.
- The **FastAPI backend** orchestrates everything — polls match events, builds prompts, calls Claude and ElevenLabs.
- **Claude** generates the legend's text reaction using a deep personality system prompt.
- **ElevenLabs** converts text to voice using Hadji's cloned tone.
- The **Sports API** feeds live match state (score, minute, cards, goals).

The AI persona has three layers:

| Layer | What it does |
|---|---|
| Personality Engine | LLM prompted with Hadji's documented public persona — interviews, quotes, tactical opinions, language patterns |
| Live Context Feed | Real-time match event pipeline with an emotional state machine: `neutral → tense → frustrated → euphoric` |
| Interaction Interface | Mobile-first chat UI where fans type in Darija, French, or Arabic and the twin replies in character, in Hadji's cloned voice |

---

## 🌍 The Community — A World First

Ghost Twin Arena isn't just an app. It's the **first football community of its kind** — a live, AI-powered social layer built on top of the game itself.

While the rest of the world watches matches alone on their couch or in generic group chats, Ghost Twin Arena puts fans inside a shared stadium experience, no matter where they are on the planet.

### What the community looks like

**Watch together** — Every match is a shared event. Fans gather around the same live feed, see the same legend react in real time, and experience the game as a collective moment rather than a solo stream.

**Challenge each other** — Fans post open prediction challenges ("Morocco 2–1 Portugal — who dares to take me on?") with Twin Coins on the line. Anyone in the community can accept. The legend arbitrates with their own AI-generated take on who got it right.

**Talk football** — A live community feed runs during every match. Fans post reactions, share legend quotes, debate calls, and build rivalries and friendships match by match. The legend's voice becomes the common thread running through every conversation.

**Compete on the leaderboard** — Weekly and tournament-wide rankings based on prediction accuracy and quiz scores. Top fans earn exclusive badges — a legend's jersey number on their profile, a verified "Atlas Lion" status, cosmetic unlocks that carry across the whole tournament.

**Quiz battles** — Between matches, the legend tests you on football history. Streak bonuses, daily questions, head-to-head quiz duels with other fans. Every correct answer keeps you in the community loop.

This is the loop that makes it sticky: *watch → react → predict → challenge → score → brag → repeat*.

---

## 🚀 Vision & Scalability

Ghost Twin Arena is built on a model that scales far beyond Morocco 2030.

**The football industry** — The Ghost Twin architecture can be applied to any club, any national team, any competition. A Premier League club could deploy their own legend for every home match. A national federation could run the full system for a continental tournament. The AI persona pipeline — transcripts in, personality engine out — works for any player with a documented public voice.

**Beyond football** — The same system works for any sport with legends, live events, and passionate fans. Rugby. Basketball. Cricket. Formula 1. The "live legend as community anchor" model is sport-agnostic. The moment you have match events feeding a real-time emotional state machine, you have Ghost Twin.

**The infrastructure is already modular** — The backend separates persona, match state, NLP, LLM, and voice into independent services. Swapping in a new legend is a JSON profile and a voice clone. Swapping in a new sport is a new event schema and state machine. The core product — AI co-pilot + fan community — remains identical.

> The 2030 World Cup is the proof of concept. The world football industry is the market.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend (web) | React 18, Vite 5, Tailwind CSS |
| Frontend (mobile) | React Native, Expo |
| Backend | Python 3.11+, FastAPI, Uvicorn |
| AI / LLM | Anthropic Claude (`claude-sonnet-4`) |
| Voice synthesis | ElevenLabs (cloned voice) |
| Sports data | API-Football via RapidAPI |
| NLP | `langdetect`, custom Darija handler |

---

## Project Structure

```
ghost-twin/
├── backend/
│   ├── main.py                   # FastAPI entrypoint
│   ├── persona/
│   │   ├── persona_builder.py    # Persona prompt construction
│   │   ├── corpus/               # Raw interview transcripts
│   │   └── profiles/             # JSON player profiles
│   ├── match/
│   │   ├── live_feed.py          # Match API integration
│   │   ├── state_machine.py      # Emotional state engine
│   │   └── simulator.py          # Match simulation for demo
│   ├── nlp/
│   │   ├── darija_handler.py     # Darija processing layer
│   │   └── transliterator.py     # Latin-script Darija support
│   ├── llm/
│   │   ├── claude_client.py      # Anthropic API wrapper
│   │   └── prompt_engine.py      # Dynamic prompt assembly
│   └── voice/
│       └── tts_client.py         # ElevenLabs / Coqui wrapper
├── frontend/
│   ├── index.html
│   ├── src/
│   └── vite.config.js
├── data/
│   ├── players/
│   │   └── hadji_mustapha.json   # Player profile
│   ├── audio/                    # Cleaned voice samples
│   └── match_simulation.json     # Demo match events
├── requirements.txt
├── .env.example
└── README.md
```

---

## Getting Started

### Prerequisites

- Python 3.11+ — `python --version`
- Node.js 20+ — `node --version`
- Git — `git --version`

### 1. Clone & set up the backend

```bash
git clone https://github.com/your-org/ghost-twin.git
cd ghost-twin

python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

pip install fastapi uvicorn anthropic elevenlabs \
            langdetect pydantic python-dotenv
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in your keys:

```env
ANTHROPIC_API_KEY=sk-ant-...         # console.anthropic.com
ELEVENLABS_API_KEY=...               # elevenlabs.io settings
PLAYER_VOICE_ID=...                  # ElevenLabs Voice Lab
FOOTBALL_API_KEY=...                 # RapidAPI dashboard
SIMULATION_MODE=true                 # set false for live match data
```

### 3. Run the backend

```bash
uvicorn backend.main:app --reload
# API available at http://localhost:8000
# Swagger docs at http://localhost:8000/docs
```

### 4. Run the frontend

```bash
cd frontend
npm install
npm run dev
# App available at http://localhost:5173
```

---

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/match-state` | Current score, minute, status |
| `POST` | `/react` | Get legend reaction to a match event |
| `POST` | `/predict` | Fan submits a prediction, legend replies |
| `POST` | `/simulate` | Fire a manual event (demo mode) |
| `GET` | `/docs` | Auto-generated Swagger docs |

### Supported Event Types

`goal` · `red_card` · `var` · `penalty` · `substitution` · `kickoff` · `fulltime`

---

## Voice Cloning (ElevenLabs)

1. Collect 5–10 minutes of clean Mustapha Hadji audio (interviews, commentary).
2. Go to [ElevenLabs Voice Lab](https://elevenlabs.io/voice-lab) → **Add Voice** → **Instant Voice Cloning**.
3. Upload audio samples, name the voice `hadji_mustapha`.
4. Copy the generated `Voice ID` and set it as `PLAYER_VOICE_ID` in your `.env`.

---

## Supported Languages

The twin speaks and understands:

- 🇲🇦 **Darija** (Moroccan Arabic) — primary
- 🇫🇷 **French**
- 🇬🇧 **English**
- 🌍 **Arabic** (Modern Standard)

---

## Key Links

| Service | URL |
|---|---|
| Anthropic Console | https://console.anthropic.com |
| ElevenLabs Voice Lab | https://elevenlabs.io/voice-lab |
| API-Football (RapidAPI) | https://rapidapi.com/api-sports/api/api-football |
| Darija NLP resources | https://github.com/topics/darija-nlp |

---

## Team

| Name | Role |
|---|---|
| **Youssef Dihaji** | Backend (FastAPI), AI integration, live events |
| **Malak** | Frontend (React Native), UI, game logic |

INPT Rabat — Hackathon Sport Tech 2026
