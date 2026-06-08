"""Cheap, dependency-light language detection for the multilingual layer.

Detects Latin-script Darija via markers, Arabic via unicode range, else French.
Returns a hint we prepend to the user message so the legend replies in kind.
"""
import re

DARIJA_MARKERS = re.compile(
    r"\b(wach|wash|kifach|chno|fin|fain|mnin|chkoun|bghit|kayn|kayen|nta|nti|"
    r"mazal|daba|ghir|bzzaf|walou|yallah|safi|mzyan|labas)\b",
    re.IGNORECASE,
)
ARABIC_RANGE = re.compile(r"[\u0600-\u06FF]")

HINTS = {
    "darija_latin": "[Fan writes in Darija (Latin). Reply warmly in a French-Darija mix.]",
    "darija_arabic": "[Fan writes in Darija/Arabic. Reply in warm Moroccan Arabic.]",
    "french": "[Fan writes in French. Reply in French.]",
    "english": "[Fan writes in English. Reply in English.]",
}

PREFERRED_HINTS = {
    "fr": "[The fan prefers French. Reply in warm, conversational French.]",
    "en": "[The fan prefers English. Reply in clear, natural English.]",
    "ar": "[The fan prefers Arabic. Reply in warm Moroccan Arabic (Darija is fine in emotional moments).]",
}


def detect_language(text: str) -> str:
    if ARABIC_RANGE.search(text):
        return "darija_arabic"
    if DARIJA_MARKERS.search(text):
        return "darija_latin"
    # crude French vs English: French function words
    if re.search(r"\b(le|la|les|je|tu|c'est|qu'|est|pour|avec|qui)\b", text, re.IGNORECASE):
        return "french"
    if re.search(r"\b(the|you|what|is|for|with|who|how)\b", text, re.IGNORECASE):
        return "english"
    return "french"


def with_language_hint(text: str, preferred: str | None = None) -> str:
    if preferred and preferred in PREFERRED_HINTS:
        return f"{PREFERRED_HINTS[preferred]}\n{text}"
    lang = detect_language(text)
    return f"{HINTS.get(lang, HINTS['french'])}\n{text}"
