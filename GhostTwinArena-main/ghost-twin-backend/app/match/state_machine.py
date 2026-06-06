"""The emotional heart of Ghost Twin.

A live match mutates the legend's emotional_state, which feeds BOTH the persona
prompt (how he talks) and the avatar system (how he looks). We separate two ideas:

  * emotional_state  - the steady mood (neutral/tense/frustrated/euphoric)
  * avatar_state     - what to SHOW right now, including transient bursts
                       (celebrating, heartbroken) that decay back to the mood.
"""
from enum import Enum
from dataclasses import dataclass, field


class EmotionalState(str, Enum):
    NEUTRAL = "neutral"
    TENSE = "tense"
    FRUSTRATED = "frustrated"
    EUPHORIC = "euphoric"


@dataclass
class MatchState:
    home_team: str = "Morocco"
    away_team: str = "Portugal"
    home_score: int = 0
    away_score: int = 0
    minute: int = 0
    status: str = "NOT_STARTED"          # NOT_STARTED | LIVE | FINISHED
    emotional_state: EmotionalState = EmotionalState.NEUTRAL
    avatar_state: str = "idle"           # transient, what to render now
    last_event: dict = field(default_factory=dict)

    @property
    def score_str(self) -> str:
        return f"{self.home_team} {self.home_score}-{self.away_score} {self.away_team}"

    @property
    def description(self) -> str:
        if self.status == "NOT_STARTED":
            return "Pre-match buildup"
        if self.status == "FINISHED":
            return f"Full time, {self.score_str}"
        if self.minute < 45:
            return f"First half, {self.score_str}"
        if self.minute < 75:
            return f"Second half, {self.score_str}"
        return f"Final stretch, {self.score_str}"

    def process_event(self, event: dict) -> None:
        etype = (event.get("type") or "").upper()
        team = (event.get("team") or "").lower()
        is_morocco = team == self.home_team.lower() or team == "morocco"
        if event.get("minute") is not None:
            self.minute = event["minute"]
        self.status = "LIVE" if etype != "FULLTIME" else "FINISHED"
        self.last_event = event

        if etype == "GOAL":
            if is_morocco:
                self.home_score += 1
                self.emotional_state = EmotionalState.EUPHORIC
                self.avatar_state = "celebrating"
            else:
                self.away_score += 1
                self.emotional_state = EmotionalState.FRUSTRATED
                self.avatar_state = "heartbroken"
        elif etype == "RED_CARD":
            self.emotional_state = EmotionalState.TENSE
            self.avatar_state = "tense"
        elif etype == "PENALTY":
            self.emotional_state = EmotionalState.TENSE
            self.avatar_state = "tense"
        elif etype == "VAR":
            self.emotional_state = EmotionalState.TENSE
            self.avatar_state = "thinking"
        elif etype == "KICKOFF":
            self.status = "LIVE"
            self.emotional_state = EmotionalState.NEUTRAL
            self.avatar_state = "neutral"
        elif etype == "FULLTIME":
            if self.home_score > self.away_score:
                self.emotional_state = EmotionalState.EUPHORIC
                self.avatar_state = "euphoric"
            elif self.home_score < self.away_score:
                self.emotional_state = EmotionalState.FRUSTRATED
                self.avatar_state = "heartbroken"
            else:
                self.emotional_state = EmotionalState.NEUTRAL
                self.avatar_state = "neutral"

    def settle_avatar(self) -> None:
        """Decay a transient burst back to the steady mood (call after a reaction)."""
        self.avatar_state = self.emotional_state.value

    def to_dict(self) -> dict:
        return {
            "home_team": self.home_team,
            "away_team": self.away_team,
            "home_score": self.home_score,
            "away_score": self.away_score,
            "minute": self.minute,
            "status": self.status,
            "score": self.score_str,
            "description": self.description,
            "emotional_state": self.emotional_state.value,
            "avatar_state": self.avatar_state,
            "last_event": self.last_event,
        }


# Single shared match for the demo (SIMULATION_MODE). For multi-match later,
# key these by match_id in a dict.
current_match = MatchState()
