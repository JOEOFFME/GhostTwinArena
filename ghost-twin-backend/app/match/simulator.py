"""Demo match simulator.

Drives the match without any external sports API. Either fire events manually
(/simulate) or replay a scripted sequence. Keep SIMULATION_MODE=true for the demo.
"""
from app.match.state_machine import current_match

# A scripted Morocco vs Portugal demo arc the team can step through on stage.
DEMO_SCRIPT = [
    {"type": "KICKOFF", "minute": 0},
    {"type": "GOAL", "team": "Morocco", "scorer": "En-Nesyri", "minute": 23},
    {"type": "GOAL", "team": "Portugal", "scorer": "Ramos", "minute": 41},
    {"type": "RED_CARD", "player": "Portugal #4", "minute": 58},
    {"type": "PENALTY", "team": "Morocco", "minute": 79},
    {"type": "GOAL", "team": "Morocco", "scorer": "Ziyech", "minute": 80},
    {"type": "FULLTIME", "minute": 90},
]


def reset_match(home="Morocco", away="Portugal") -> dict:
    current_match.home_team = home
    current_match.away_team = away
    current_match.home_score = 0
    current_match.away_score = 0
    current_match.minute = 0
    current_match.status = "NOT_STARTED"
    current_match.emotional_state = current_match.emotional_state.NEUTRAL
    current_match.avatar_state = "idle"
    current_match.last_event = {}
    return current_match.to_dict()


def trigger(event: dict) -> dict:
    current_match.process_event(event)
    return current_match.to_dict()
