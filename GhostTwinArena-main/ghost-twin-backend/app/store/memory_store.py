"""In-memory persistence. Single source of truth for user state.

Deliberately behind a small API so you can swap it for Redis/Postgres later
without touching the game logic. Everything is process-local (resets on restart),
which is exactly what you want for a hackathon demo.
"""
import time
from datetime import date
from dataclasses import dataclass, field
from app.config import settings


@dataclass
class User:
    user_id: str
    coins: int = field(default_factory=lambda: settings.STARTING_COINS)
    is_pro: bool = False                       # Twin Pass subscriber
    unlocked_legends: set = field(default_factory=lambda: {"hadji"})
    quiz_streak: int = 0
    badges: list = field(default_factory=list)
    # daily counters: {"YYYY-MM-DD": {"quiz": n}}
    daily: dict = field(default_factory=dict)


class Store:
    def __init__(self):
        self._users: dict[str, User] = {}
        # predictions[match_id][user_id] = {"home":x,"away":y,"resolved":bool,"points":n}
        self._predictions: dict[str, dict] = {}
        # active what-he-said rounds: round_id -> {answer_index, payout, expires}
        self._whs_rounds: dict[str, dict] = {}

    # ---- users / coins ----
    def user(self, user_id: str) -> User:
        if user_id not in self._users:
            self._users[user_id] = User(user_id=user_id)
        return self._users[user_id]

    def add_coins(self, user_id: str, amount: int) -> int:
        u = self.user(user_id)
        u.coins += amount
        if not u.is_pro:
            u.coins = min(u.coins, settings.FREE_COIN_CAP)   # free-tier coin cap
        return u.coins

    def spend_coins(self, user_id: str, amount: int) -> bool:
        u = self.user(user_id)
        if u.coins < amount:
            return False
        u.coins -= amount
        return True

    # ---- daily limits ----
    def _today(self, user_id: str) -> dict:
        u = self.user(user_id)
        key = date.today().isoformat()
        return u.daily.setdefault(key, {"quiz": 0})

    def quiz_remaining(self, user_id: str) -> int:
        u = self.user(user_id)
        if u.is_pro:
            return 9999
        return max(0, settings.FREE_QUIZ_PER_DAY - self._today(user_id)["quiz"])

    def record_quiz_attempt(self, user_id: str) -> None:
        self._today(user_id)["quiz"] += 1

    # ---- streaks / badges ----
    def bump_streak(self, user_id: str, correct: bool) -> int:
        u = self.user(user_id)
        u.quiz_streak = u.quiz_streak + 1 if correct else 0
        return u.quiz_streak

    def award_badge(self, user_id: str, badge: str) -> None:
        u = self.user(user_id)
        if badge not in u.badges:
            u.badges.append(badge)

    # ---- predictions / fan vs fan ----
    def save_prediction(self, match_id: str, user_id: str, home: int, away: int) -> None:
        m = self._predictions.setdefault(match_id, {})
        m[user_id] = {"home": home, "away": away, "resolved": False, "points": 0}

    def resolve_predictions(self, match_id: str, fh: int, fa: int) -> list:
        """Score every prediction for a match. Returns per-user results."""
        results = []
        m = self._predictions.get(match_id, {})
        for uid, p in m.items():
            if p["resolved"]:
                continue
            pts = self._score_prediction(p["home"], p["away"], fh, fa)
            p["resolved"], p["points"] = True, pts
            coins = pts * 10
            self.add_coins(uid, coins)
            if pts == 3:
                self.award_badge(uid, "Perfect Score")
            results.append({"user_id": uid, "points": pts, "coins_awarded": coins,
                            "predicted": f"{p['home']}-{p['away']}", "actual": f"{fh}-{fa}"})
        return sorted(results, key=lambda r: r["points"], reverse=True)

    @staticmethod
    def _score_prediction(ph, pa, fh, fa) -> int:
        if ph == fh and pa == fa:
            return 3                                  # exact scoreline
        if (ph - pa) == (fh - fa) or (ph > pa) == (fh > fa) and (ph == pa) == (fh == fa):
            return 1                                  # correct outcome / goal diff
        return 0

    def leaderboard(self, top: int = 20) -> list:
        rows = [{"user_id": u.user_id, "coins": u.coins,
                 "streak": u.quiz_streak, "badges": u.badges}
                for u in self._users.values()]
        rows.sort(key=lambda r: r["coins"], reverse=True)
        for i, r in enumerate(rows[:top], 1):
            r["rank"] = i
        return rows[:top]

    # ---- what he said rounds ----
    def open_whs_round(self, round_id: str, answer_index: int, payout: int, ttl: int = 30) -> None:
        self._whs_rounds[round_id] = {
            "answer_index": answer_index, "payout": payout,
            "expires": time.time() + ttl, "closed": False,
        }

    def get_whs_round(self, round_id: str) -> dict | None:
        return self._whs_rounds.get(round_id)

    def close_whs_round(self, round_id: str) -> None:
        if round_id in self._whs_rounds:
            self._whs_rounds[round_id]["closed"] = True


store = Store()
