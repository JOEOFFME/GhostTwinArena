"""Central configuration. All tunables live here, read from environment with safe defaults."""
import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # --- AI / Voice keys (optional: backend degrades gracefully if absent) ---
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    ELEVENLABS_API_KEY: str = os.getenv("ELEVENLABS_API_KEY", "")
    ELEVENLABS_VOICE_ID: str = os.getenv("ELEVENLABS_VOICE_ID", "")

    # Model used for legend reactions. Haiku = fastest/cheapest for live audio reactions;
    # override with a stronger model for long-form chat if you like.
    CLAUDE_MODEL: str = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-6")
    REACTION_MAX_TOKENS: int = int(os.getenv("REACTION_MAX_TOKENS", "220"))
    CHAT_MAX_TOKENS: int = int(os.getenv("CHAT_MAX_TOKENS", "600"))

    # --- Demo / data mode ---
    SIMULATION_MODE: bool = os.getenv("SIMULATION_MODE", "true").lower() == "true"
    FOOTBALL_API_KEY: str = os.getenv("FOOTBALL_API_KEY", "")

    # --- Monetization gates (free tier) ---
    FREE_QUIZ_PER_DAY: int = int(os.getenv("FREE_QUIZ_PER_DAY", "5"))
    FREE_COIN_CAP: int = int(os.getenv("FREE_COIN_CAP", "500"))
    STARTING_COINS: int = int(os.getenv("STARTING_COINS", "50"))

    # --- Game economics ---
    COINS_CORRECT_PREDICTION: int = 50
    COINS_QUIZ_BASE: int = 10           # multiplied by question points/10
    COINS_WHAT_HE_SAID: int = 25
    QUIZ_STREAK_BONUS: int = 5          # added per consecutive correct answer

    # --- Paths ---
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    PROFILES_DIR: str = os.path.join(BASE_DIR, "app", "legends", "profiles")
    STATIC_DIR: str = os.path.join(BASE_DIR, "static")


settings = Settings()
