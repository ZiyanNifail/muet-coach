"""
Groq service — T2.18 / T3.02.

Sends transcript + metrics to Llama 3.3 70B via Groq API.
Returns { band_score, advice_cards }.
Falls back to rule-based cards if Groq is unavailable.
"""
import os
import json
from typing import Optional

FALLBACK_ADVICE = [
    {"impact": "HIGH", "text": "Reduce filler words — pause briefly instead of saying 'um' or 'uh'."},
    {"impact": "MED",  "text": "Maintain eye contact above 70% — look directly at the camera consistently."},
    {"impact": "MED",  "text": "Expand vocabulary — use more precise, domain-specific terms."},
    {"impact": "LOW",  "text": "Use discourse markers (firstly, furthermore, in conclusion) to structure your talk."},
    {"impact": "LOW",  "text": "Vary sentence length — mix short punchy statements with longer explanations."},
]

SYSTEM_PROMPT = """You are an expert English proficiency examiner specialising in MUET (Malaysian University English Test) oral communication.
You will receive a student's presentation transcript and performance metrics.
Your job is to:
1. Predict the CEFR/MUET band score (a float from 1.0 to 6.0, one decimal place).
2. Generate exactly 5 actionable advice cards, each with an impact level: HIGH, MED, or LOW.

Respond ONLY with valid JSON matching this exact schema:
{
  "band_score": <float 1.0-6.0>,
  "advice_cards": [
    {"impact": "HIGH|MED|LOW", "text": "<one concise sentence of advice>"},
    ...
  ]
}"""


async def generate_feedback(transcript: str, metrics: dict) -> dict:
    """
    Send transcript and metrics to Groq/Llama 3.3 70B.
    Returns { band_score: float, advice_cards: list }.
    Falls back to rule-based cards if Groq is unavailable.
    """
    api_key = os.getenv("GROQ_API_KEY", "")
    if not api_key or api_key == "your-groq-api-key":
        return {"band_score": None, "advice_cards": FALLBACK_ADVICE}

    try:
        from groq import Groq
    except ImportError:
        return {"band_score": None, "advice_cards": FALLBACK_ADVICE}

    user_content = (
        f"TRANSCRIPT:\n{transcript or '(no transcript available)'}\n\n"
        f"METRICS:\n"
        f"- Average WPM: {metrics.get('wpm_avg', 'N/A')}\n"
        f"- Eye contact: {metrics.get('eye_contact_pct', 'N/A')}%\n"
        f"- Filler words per minute: {metrics.get('filler_density', 'N/A')}\n"
        f"- Posture score: {metrics.get('posture_score', 'N/A')}/100\n"
        f"- Lexical diversity (TTR): {metrics.get('lexical_diversity', 'N/A')}\n"
        f"- Session duration: {metrics.get('duration_secs', 'N/A')} seconds\n"
    )

    try:
        client = Groq(api_key=api_key)
        chat = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            temperature=0.3,
            max_tokens=512,
            response_format={"type": "json_object"},
        )
        raw = chat.choices[0].message.content
        data = json.loads(raw)
        band = float(data.get("band_score", 0))
        band = round(max(1.0, min(6.0, band)), 1)
        cards = data.get("advice_cards", FALLBACK_ADVICE)
        # Validate card structure
        validated = []
        for c in cards[:5]:
            if isinstance(c, dict) and "text" in c and "impact" in c:
                impact = c["impact"].upper()
                if impact not in ("HIGH", "MED", "LOW"):
                    impact = "MED"
                validated.append({"impact": impact, "text": str(c["text"])})
        if not validated:
            validated = FALLBACK_ADVICE
        return {"band_score": band, "advice_cards": validated}
    except Exception:
        return {"band_score": None, "advice_cards": FALLBACK_ADVICE}
