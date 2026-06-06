"""ElevenLabs TTS. Returns a base64 data URL the mobile app can play directly.

If keys are missing it returns None and the app simply shows text - no crash.
"""
import base64
import httpx
from app.config import settings

ELEVENLABS_BASE = "https://api.elevenlabs.io/v1"


async def synthesize(text: str) -> str | None:
    if not (settings.ELEVENLABS_API_KEY and settings.ELEVENLABS_VOICE_ID):
        return None
    url = f"{ELEVENLABS_BASE}/text-to-speech/{settings.ELEVENLABS_VOICE_ID}"
    headers = {"xi-api-key": settings.ELEVENLABS_API_KEY, "Content-Type": "application/json"}
    payload = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.45,          # lower = more emotional variation
            "similarity_boost": 0.85,   # higher = closer to cloned voice
            "style": 0.6,
            "use_speaker_boost": True,
        },
    }
    try:
        async with httpx.AsyncClient() as client:
            r = await client.post(url, headers=headers, json=payload, timeout=15.0)
        if r.status_code == 200:
            b64 = base64.b64encode(r.content).decode()
            return f"data:audio/mpeg;base64,{b64}"
    except Exception as e:  # noqa: BLE001
        print(f"[voice] TTS failed: {e}")
    return None
