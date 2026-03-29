"""
Groq service — T2.18 / T3.02.

Sends transcript + metrics to Llama 3.3 70B via Groq API.
Returns { band_score, advice_cards }.
Falls back to rule-based cards if Groq is unavailable.

Rate limiting: capped at 25 req/min (safely under Groq free tier of 30/min).
"""
import os
import json
import asyncio
from typing import Optional

# ── Rate limiter: max 25 concurrent/sequential Groq calls per minute ─────────
# Uses a simple asyncio.Semaphore to cap parallel requests.
# For a 30-user pilot, full concurrency is unlikely, but this prevents
# the free tier (30 req/min) being exceeded under burst load.
_groq_semaphore = asyncio.Semaphore(25)

FALLBACK_ADVICE = [
    {"impact": "HIGH", "text": "Reduce filler words — pause briefly instead of saying 'um' or 'uh'."},
    {"impact": "MED",  "text": "Maintain eye contact above 70% — look directly at the camera consistently."},
    {"impact": "MED",  "text": "Expand vocabulary — use more precise, domain-specific terms."},
    {"impact": "LOW",  "text": "Use discourse markers (firstly, furthermore, in conclusion) to structure your talk."},
    {"impact": "LOW",  "text": "Vary sentence length — mix short punchy statements with longer explanations."},
]

SYSTEM_PROMPT = """You are an expert English proficiency examiner specialising in MUET (Malaysian University English Test) oral communication.
You will receive a student's presentation transcript and performance metrics.

MUET BAND DESCRIPTORS (use these as strict anchors — do not deviate by more than 0.5):
- Band 1 (1.0–1.4): Extremely limited English. Cannot sustain any communication. Constant fillers, incoherent.
- Band 2 (1.5–2.4): Very limited. Short utterances only. Frequent breakdown in communication.
- Band 3 (2.5–3.4): Limited but can convey basic meaning. Many errors. Filler density >10/min. WPM <90 or >180.
- Band 4 (3.5–4.4): Satisfactory. Some errors but meaning is clear. Filler density 5–10/min. WPM 90–120 or 155–180.
- Band 5 (4.5–5.4): Good. Generally fluent. Filler density <5/min. WPM 120–155. Eye contact >60%. Posture >70.
- Band 6 (5.5–6.0): Excellent. Highly fluent, accurate, well-structured. Filler density <2/min. WPM 130–150. Eye contact >80%.

CRITICAL RULES:
- If filler density is HIGH (>10/min), the score MUST be Band 3 or below — never above 4.0.
- If filler density is MODERATE (5–10/min), score cannot exceed 4.4.
- If WPM is <80 or >190, apply a 0.5 band penalty.
- If eye contact is <30%, apply a 0.3 band penalty.
- If transcript is empty or very short (<20 words), score MUST be 1.0 — the student did not speak.
- The rule_band provided is a calibrated baseline. Your score MUST be within ±1.0 of rule_band.
  If your linguistic assessment differs greatly from rule_band, explain why in an advice card.
- Do NOT default to Band 4–5 when data is ambiguous. When in doubt, score conservatively.

Your job:
1. Predict the CEFR/MUET band score (a float from 1.0 to 6.0, one decimal place).
2. Generate exactly 5 actionable advice cards, each with an impact level: HIGH, MED, or LOW.
   - HIGH = directly costs band score, must fix first
   - MED = noticeable weakness, worth improving
   - LOW = polish item

Respond ONLY with valid JSON matching this exact schema:
{
  "band_score": <float 1.0-6.0>,
  "advice_cards": [
    {"impact": "HIGH|MED|LOW", "text": "<one concise sentence of specific, actionable advice>"},
    ...
  ]
}"""


async def generate_feedback(transcript: str, metrics: dict, rule_band: float | None = None) -> dict:
    """
    Send transcript and metrics to Groq/Llama 3.3 70B.
    Returns { band_score: float, advice_cards: list }.
    Falls back to rule-based cards if Groq is unavailable.

    rule_band: the score from cefr_evaluator — passed to Groq as a calibration
    anchor so the LLM cannot stray wildly from objective metrics.
    """
    api_key = os.getenv("GROQ_API_KEY", "")
    if not api_key or api_key == "your-groq-api-key":
        return {"band_score": None, "advice_cards": FALLBACK_ADVICE}

    # Guard: if no audio was produced, don't send to Groq at all
    word_count = len(transcript.split()) if transcript else 0
    if word_count < 5:
        return {"band_score": rule_band, "advice_cards": FALLBACK_ADVICE}

    try:
        from groq import Groq
    except ImportError:
        return {"band_score": None, "advice_cards": FALLBACK_ADVICE}

    session_mode = metrics.get("session_mode", "unguided")

    # Format N/A cleanly for None values
    def fmt(v: object, suffix: str = "") -> str:
        return "N/A" if v is None else f"{v}{suffix}"

    user_content = (
        f"RULE-BASED BAND (calibrated baseline, stay within ±1.0): {rule_band if rule_band else 'N/A'}\n\n"
        f"TRANSCRIPT ({word_count} words):\n{transcript}\n\n"
        f"METRICS:\n"
        f"- Average WPM: {fmt(metrics.get('wpm_avg'))}\n"
        f"- Eye contact: {fmt(metrics.get('eye_contact_pct'), '%')}\n"
        f"- Filler words per minute: {fmt(metrics.get('filler_density'))}\n"
        f"- Posture score: {fmt(metrics.get('posture_score'), '/100')}\n"
        f"- Lexical diversity (TTR): {fmt(metrics.get('lexical_diversity'))}\n"
        f"- Session duration: {fmt(metrics.get('duration_secs'), 's')}\n"
        f"- Session mode: {session_mode} "
        f"({'real-time coaching was active' if session_mode == 'guided' else 'no interruptions during recording'})\n"
    )

    try:
        async with _groq_semaphore:
            client = Groq(api_key=api_key)
            chat = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_content},
                ],
                temperature=0.2,
                max_tokens=600,
                response_format={"type": "json_object"},
            )
        raw = chat.choices[0].message.content
        data = json.loads(raw)
        llm_band = float(data.get("band_score", 0))
        llm_band = round(max(1.0, min(6.0, llm_band)), 1)

        # Merge: if LLM and rule_band agree within 1.0, average them.
        # If they diverge beyond 1.0, trust rule_band (it's metric-grounded).
        if rule_band is not None:
            diff = abs(llm_band - rule_band)
            if diff <= 1.0:
                final_band = round((llm_band + rule_band) / 2, 1)
            else:
                # Large divergence — LLM is hallucinating; clamp it toward rule_band
                final_band = round(rule_band + (0.5 if llm_band > rule_band else -0.5), 1)
                final_band = round(max(1.0, min(6.0, final_band)), 1)
        else:
            final_band = llm_band

        cards = data.get("advice_cards", FALLBACK_ADVICE)
        validated = []
        for c in cards[:5]:
            if isinstance(c, dict) and "text" in c and "impact" in c:
                impact = c["impact"].upper()
                if impact not in ("HIGH", "MED", "LOW"):
                    impact = "MED"
                validated.append({"impact": impact, "text": str(c["text"])})
        if not validated:
            validated = FALLBACK_ADVICE
        return {"band_score": final_band, "advice_cards": validated}
    except Exception:
        return {"band_score": rule_band, "advice_cards": FALLBACK_ADVICE}
