"""Live match data fetcher — RapidAPI / API-Football v3.

Polls the API-Football 'live fixtures' endpoint every POLL_INTERVAL seconds.
When a live fixture involving Morocco (or any configured team) is found, it
pushes events into current_match via the state machine.

Activated automatically when SIMULATION_MODE=false and FOOTBALL_API_KEY is set.
Falls back silently — no crash if the API is unavailable.
"""
import asyncio
import httpx
from app.config import settings
from app.match.state_machine import current_match

POLL_INTERVAL = 60          # seconds between API polls
_BASE = "https://api-football-v1.p.rapidapi.com/v3"
_HEADERS = {
    "X-RapidAPI-Key":  settings.FOOTBALL_API_KEY,
    "X-RapidAPI-Host": settings.RAPIDAPI_HOST,
}

# Track the last event IDs we already processed so we don't re-fire them
_seen_events: set = set()
_current_fixture_id: int | None = None


async def _fetch_json(path: str, params: dict) -> dict:
    async with httpx.AsyncClient(timeout=12.0) as client:
        r = await client.get(f"{_BASE}{path}", headers=_HEADERS, params=params)
    r.raise_for_status()
    return r.json()


def _map_api_status(short: str) -> str:
    """Map API-Football status short codes to our internal status strings."""
    live = {"1H", "HT", "2H", "ET", "BT", "P", "SUSP", "INT", "LIVE"}
    if short in live:
        return "LIVE"
    if short == "FT":
        return "FINISHED"
    return "NOT_STARTED"


async def _process_fixture(fixture: dict) -> None:
    """Update current_match from a live API-Football fixture payload."""
    global _current_fixture_id

    fix = fixture.get("fixture", {})
    teams = fixture.get("teams", {})
    goals = fixture.get("goals", {})
    status = fix.get("status", {})

    fixture_id = fix.get("id")
    _current_fixture_id = fixture_id

    home_name = teams.get("home", {}).get("name", "Home")
    away_name = teams.get("away", {}).get("name", "Away")
    home_score = goals.get("home") or 0
    away_score = goals.get("away") or 0
    minute_raw = status.get("elapsed") or 0
    status_short = status.get("short", "NS")
    api_status = _map_api_status(status_short)

    # Update basic match state directly (no event needed)
    current_match.home_team = home_name
    current_match.away_team = away_name
    current_match.minute = minute_raw
    current_match.status = api_status

    # Detect score changes → fire synthetic GOAL events
    old_home = current_match.home_score
    old_away = current_match.away_score

    if home_score > old_home:
        for _ in range(home_score - old_home):
            current_match.process_event({
                "type": "GOAL",
                "team": home_name,
                "scorer": "",
                "minute": minute_raw,
            })
        print(f"[live] GOAL {home_name} — {home_name} {home_score}-{away_score} {away_name}")

    elif away_score > old_away:
        for _ in range(away_score - old_away):
            current_match.process_event({
                "type": "GOAL",
                "team": away_name,
                "scorer": "",
                "minute": minute_raw,
            })
        print(f"[live] GOAL {away_name} — {home_name} {home_score}-{away_score} {away_name}")

    # Keep scores in sync even if no event fired
    current_match.home_score = home_score
    current_match.away_score = away_score

    if api_status == "FINISHED" and current_match.status != "FINISHED":
        current_match.process_event({"type": "FULLTIME", "minute": minute_raw})
        print(f"[live] FULLTIME — {home_name} {home_score}-{away_score} {away_name}")

    if api_status == "LIVE" and old_home == 0 and old_away == 0 and minute_raw <= 5:
        current_match.process_event({"type": "KICKOFF", "minute": 0})


async def _find_best_fixture() -> dict | None:
    """Return the best live fixture: Morocco first, then any live match."""
    try:
        data = await _fetch_json("/fixtures", {"live": "all"})
        fixtures = data.get("response", [])
        if not fixtures:
            # No live games right now — try today's scheduled fixtures for Morocco
            from datetime import date
            today = date.today().isoformat()
            data2 = await _fetch_json("/fixtures", {"team": "1", "date": today})  # 1 = Morocco (adjust if needed)
            fixtures = data2.get("response", [])
        if not fixtures:
            return None
        # Prefer Morocco
        for fix in fixtures:
            teams = fix.get("teams", {})
            names = {teams.get("home", {}).get("name", ""), teams.get("away", {}).get("name", "")}
            if "Morocco" in names or "Maroc" in names:
                return fix
        # Fall back to first live fixture
        return fixtures[0]
    except Exception as e:
        print(f"[live] API-Football fetch failed: {e}")
        return None


async def live_poll_loop() -> None:
    """Background coroutine — polls API-Football every POLL_INTERVAL seconds."""
    print(f"[live] Starting live match poller (interval={POLL_INTERVAL}s)")
    while True:
        fixture = await _find_best_fixture()
        if fixture:
            await _process_fixture(fixture)
            fix_id = fixture.get("fixture", {}).get("id", "?")
            home = fixture.get("teams", {}).get("home", {}).get("name", "?")
            away = fixture.get("teams", {}).get("away", {}).get("name", "?")
            print(f"[live] Tracking fixture #{fix_id}: {home} vs {away} | min={current_match.minute} status={current_match.status}")
        else:
            print("[live] No live fixture found — match state unchanged")
        await asyncio.sleep(POLL_INTERVAL)
