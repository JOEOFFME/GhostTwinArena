"""Legend Memory Quiz - framed as the legend testing the fan.

Free tier: FREE_QUIZ_PER_DAY questions/day. Correct answers earn coins scaled by
difficulty, plus a streak bonus that rewards daily retention.
"""
import random
from app.config import settings
from app.legends.registry import get_legend
from app.store.memory_store import store


def next_question(legend_id: str, user_id: str) -> dict:
    remaining = store.quiz_remaining(user_id)
    if remaining <= 0:
        return {"locked": True,
                "reason": "daily_limit",
                "message": "You've used your free quizzes for today. Twin Pass unlocks unlimited.",
                "remaining_today": 0}

    legend = get_legend(legend_id)
    q = random.choice(legend["quiz_bank"])
    return {
        "locked": False,
        "legend_id": legend_id,
        "question_id": q["id"],
        "lead_in": q["lead_in"],            # the legend "testing you"
        "question": q["question"],
        "options": q["options"],
        "difficulty": q["difficulty"],
        "points": q["points"],
        "remaining_today": remaining,
    }


def grade(legend_id: str, user_id: str, question_id: str, answer_index: int) -> dict:
    legend = get_legend(legend_id)
    q = next((x for x in legend["quiz_bank"] if x["id"] == question_id), None)
    if q is None:
        return {"error": "unknown question_id"}

    store.record_quiz_attempt(user_id)
    correct = answer_index == q["answer_index"]
    streak = store.bump_streak(user_id, correct)

    coins = 0
    if correct:
        base = q["points"]                                   # difficulty-scaled
        bonus = max(0, streak - 1) * settings.QUIZ_STREAK_BONUS
        coins = base + bonus
        store.add_coins(user_id, coins)
        if streak == 5:
            store.award_badge(user_id, "Quiz Streak x5")

    return {
        "correct": correct,
        "correct_index": q["answer_index"],
        "explanation": q["explanation"],     # legend explains in his own voice
        "coins_awarded": coins,
        "streak": streak,
        "balance": store.user(user_id).coins,
        "remaining_today": store.quiz_remaining(user_id),
    }
