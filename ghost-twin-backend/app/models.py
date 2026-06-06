"""Pydantic schemas for requests and responses across the API."""
from typing import Optional, List
from pydantic import BaseModel, Field


# ---------- Match / events ----------
class MatchEvent(BaseModel):
    type: str = Field(..., description="GOAL | RED_CARD | VAR | PENALTY | KICKOFF | FULLTIME")
    team: Optional[str] = None
    scorer: Optional[str] = None
    player: Optional[str] = None
    minute: Optional[int] = None


# ---------- Chat / reactions ----------
class ChatRequest(BaseModel):
    user_id: str = "guest"
    message: str


class ReactionResponse(BaseModel):
    text: str
    audio_url: Optional[str] = None
    emotional_state: str
    avatar: dict
    match_context: str


# ---------- Predictions / Fan vs Fan ----------
class PredictionRequest(BaseModel):
    user_id: str = "guest"
    match_id: str = "demo-match"
    home_score: int
    away_score: int


class PredictionResolve(BaseModel):
    match_id: str = "demo-match"
    final_home: int
    final_away: int


# ---------- Quiz ----------
class QuizAnswer(BaseModel):
    user_id: str = "guest"
    legend_id: str = "hadji"
    question_id: str
    answer_index: int


# ---------- What He Said ----------
class WhatHeSaidGuess(BaseModel):
    user_id: str = "guest"
    round_id: str
    choice_index: int
