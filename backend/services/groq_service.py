"""
Groq service — T2.18 / T3.02.

Sends transcript + metrics to Llama 3.3 70B via Groq API.
Returns { band_score, advice_cards }.
Falls back to rule-based cards if Groq is unavailable.

Rate limiting: token-bucket capped at 25 req/min (safely under Groq free tier of 30/min).
"""
import os
import re
import json
import asyncio
import logging
import time
from typing import Optional

logger = logging.getLogger(__name__)

_groq_client = None


def _get_groq_client():
    global _groq_client
    if _groq_client is None:
        api_key = os.getenv("GROQ_API_KEY", "")
        if api_key and api_key != "your-groq-api-key":
            from groq import Groq
            _groq_client = Groq(api_key=api_key)
    return _groq_client


# ── Token-bucket rate limiter: max 25 requests per 60-second window ──────────
# A plain Semaphore only limits concurrency, not rate — 25 requests could all
# complete in <1 s and then another 25 start immediately, easily hitting 50/min.
# This token bucket refills at 25 tokens/60 s, enforcing a true per-minute cap.
class _TokenBucket:
    def __init__(self, rate: int, period: float = 60.0):
        self._rate   = rate
        self._period = period
        self._tokens = float(rate)
        self._last   = time.monotonic()
        self._lock   = asyncio.Lock()

    async def acquire(self) -> None:
        async with self._lock:
            now = time.monotonic()
            elapsed = now - self._last
            self._tokens = min(self._rate, self._tokens + elapsed * (self._rate / self._period))
            self._last = now
            if self._tokens < 1:
                wait = (1 - self._tokens) * (self._period / self._rate)
                await asyncio.sleep(wait)
                self._tokens = 0
            else:
                self._tokens -= 1

_rate_limiter = _TokenBucket(rate=25, period=60.0)


async def _chat(prompt: str, max_tokens: int = 400, temperature: float = 0.4) -> str | None:
    """
    Generic single-turn Groq chat helper. Returns text content or None on failure.
    Shares the same rate limiter as generate_feedback.
    """
    client = _get_groq_client()
    if client is None:
        return None
    try:
        await _rate_limiter.acquire()

        def _call() -> object:
            return client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                temperature=temperature,
                max_tokens=max_tokens,
            )

        chat = await asyncio.to_thread(_call)
        return chat.choices[0].message.content or ""
    except Exception:
        logger.exception("_chat failed")
        return None


def _build_fallback_advice(metrics: dict) -> list[dict]:
    """Metric-aware fallback advice cards used when Groq is unavailable."""
    cards: list[dict] = []
    fd = metrics.get("filler_density") or 0
    ec = metrics.get("eye_contact_pct")
    wpm = metrics.get("wpm_avg")

    if fd > 5:
        cards.append({
            "impact": "HIGH",
            "text": f"You used filler words {fd:.0f} times per minute. Try pausing silently instead — a quiet pause sounds far more confident than 'um' or 'uh'.",
        })
    if ec is not None and ec < 60:
        cards.append({
            "impact": "HIGH",
            "text": f"Your eye contact was {ec:.0f}% — below the 70% target. Try looking directly at the camera more consistently throughout your talk.",
        })
    if wpm is not None and wpm < 100:
        cards.append({
            "impact": "MED",
            "text": f"You spoke at {wpm:.0f} WPM, which is quite slow. Aim for 110–160 WPM to sound more fluent and natural.",
        })
    elif wpm is not None and wpm > 170:
        cards.append({
            "impact": "MED",
            "text": f"You spoke at {wpm:.0f} WPM, which is too fast for listeners to follow comfortably. Slow down to 110–160 WPM.",
        })

    generic = [
        {"impact": "LOW", "text": "Connect your ideas with phrases like 'firstly', 'another key reason is', or 'in conclusion' — this guides your listener through your talk."},
        {"impact": "LOW", "text": "Try using more varied vocabulary. Instead of repeating simple words, use synonyms or more precise alternatives to show a wider range."},
        {"impact": "LOW", "text": "Practise recording yourself regularly. Watching your own recordings is the fastest way to spot habits you don't notice in the moment."},
    ]
    for g in generic:
        if len(cards) >= 5:
            break
        cards.append(g)
    return cards[:5]


RUBRIC_CRITERIA = (
    "task_fulfilment",
    "coherence_cohesion",
    "lexical_resource",
    "grammatical_range_accuracy",
    "pronunciation",
)

SYSTEM_PROMPT = """You are an expert English proficiency examiner specialising in MUET (Malaysian University English Test) oral communication.
You will receive a student's transcript, performance metrics, and rule-based anchor scores for each criterion.

MUET SPEAKING RUBRIC — score each criterion 1–6 (integers only, no decimals):
- task_fulfilment: Did the student address the topic with adequate content and idea development?
- coherence_cohesion: Is the speech logically organised with discourse markers and smooth flow?
- lexical_resource: Does the student use varied, precise vocabulary suited to the task?
- grammatical_range_accuracy: Are grammatical structures accurate and varied?
- pronunciation: Is speech clear, well-stressed, and easy to understand?

BAND DESCRIPTORS (apply to each criterion):
- Band 1: Minimal — barely communicates, virtually no control
- Band 2: Very limited — only short utterances, frequent breakdown
- Band 3: Limited — conveys basic meaning, many errors, restricted range
- Band 4: Satisfactory — meaning clear, some errors, adequate range
- Band 5: Good — generally accurate and fluent, good range
- Band 6: Excellent — highly accurate, wide range, near-native fluency

CRITICAL RULES:
- Each criterion score MUST stay within ±1 of its provided rule_subband anchor.
- If filler density >10/min: coherence_cohesion cannot exceed 3.
- If filler density >5/min: coherence_cohesion cannot exceed 4.
- If transcript is <20 words: all criteria MUST be 1.
- A score of 5 or above requires WPM 110–160 AND filler density <5/min.
- Do NOT default to 4 when evidence is ambiguous — score conservatively.
- band_score MUST equal the mean of the 5 criterion scores, rounded to the nearest integer.
- Each justification must be 1–2 sentences (max 40 words). Reference the actual metric value where relevant (e.g. "spoke at 145 WPM" or "used 8 discourse markers").

Respond ONLY with valid JSON — no markdown fences, no extra keys:
{
  "rubric_bands": {
    "task_fulfilment":            {"score": <integer 1-6>, "justification": "<1–2 sentences referencing actual metrics>"},
    "coherence_cohesion":         {"score": <integer 1-6>, "justification": "<1–2 sentences referencing actual metrics>"},
    "lexical_resource":           {"score": <integer 1-6>, "justification": "<1–2 sentences referencing actual metrics>"},
    "grammatical_range_accuracy": {"score": <integer 1-6>, "justification": "<1–2 sentences referencing actual metrics>"},
    "pronunciation":              {"score": <integer 1-6>, "justification": "<1–2 sentences referencing actual metrics>"}
  },
  "band_score": <integer — mean of 5 scores, rounded>,
  "advice_cards": [
    {"impact": "HIGH|MED|LOW", "text": "<plain-English tip that quotes an actual phrase from the transcript and shows a better alternative — e.g. 'You said \"I like it\" — try \"I strongly believe this is beneficial\" to sound more persuasive.'>"},
    {"impact": "HIGH|MED|LOW", "text": "..."},
    {"impact": "HIGH|MED|LOW", "text": "..."},
    {"impact": "HIGH|MED|LOW", "text": "..."},
    {"impact": "HIGH|MED|LOW", "text": "..."}
  ]
}

ADVICE CARD RULES (strictly follow):
- Write for a student who has NEVER studied linguistics. No academic terms like "lexical resource", "coherence", "task fulfilment", "discourse markers", "grammatical range".
- Each card MUST quote a real phrase from the transcript (use double quotes) then suggest a better version.
- Format: "You said [quote]. [Why it's weak in one short sentence]. Try: [improved version]."
- If the issue is filler words, quote the actual filler (e.g. "You said 'um' 14 times"). Suggest a pause instead.
- If the issue is eye contact or posture (from metrics), describe the physical behaviour plainly.
- Keep each card under 55 words. Friendly and encouraging tone, not critical."""


async def generate_feedback(
    transcript: str,
    metrics: dict,
    rule_band: float | None = None,
    rule_subbands: dict | None = None,
) -> dict:
    """
    Send transcript and metrics to Groq/Llama 3.3 70B.
    Returns { band_score, advice_cards, rubric_bands }.
    Falls back to rule-based values if Groq is unavailable.

    rule_band: overall score from cefr_evaluator (calibration anchor).
    rule_subbands: per-criterion scores from compute_subband_scores (per-criterion anchors).
    """
    client = _get_groq_client()
    if client is None:
        return {"band_score": None, "advice_cards": _build_fallback_advice(metrics), "rubric_bands": rule_subbands}

    word_count = len(transcript.split()) if transcript else 0
    if word_count < 5:
        return {"band_score": rule_band, "advice_cards": _build_fallback_advice(metrics), "rubric_bands": rule_subbands}

    session_mode = metrics.get("session_mode", "unguided")

    def fmt(v: object, suffix: str = "") -> str:
        return "N/A" if v is None else f"{v}{suffix}"

    # Build per-criterion anchor section for the prompt
    if rule_subbands:
        anchor_lines = "\n".join(
            f"- {crit}: {rule_subbands[crit]['score']}"
            for crit in RUBRIC_CRITERIA if crit in rule_subbands
        )
        subband_block = f"\nRULE-BASED SUB-BAND ANCHORS (stay within ±1 of each):\n{anchor_lines}\n"
    else:
        subband_block = f"\nRULE-BASED OVERALL BAND (calibrated baseline): {rule_band if rule_band else 'N/A'}\n"

    user_content = (
        subband_block
        + f"\nTRANSCRIPT ({word_count} words):\n{transcript[:5000]}\n\n"
        + "METRICS:\n"
        + f"- Average WPM: {fmt(metrics.get('wpm_avg'))}\n"
        + f"- Eye contact: {fmt(metrics.get('eye_contact_pct'), '%')}\n"
        + f"- Filler words per minute: {fmt(metrics.get('filler_density'))}\n"
        + f"- Posture score: {fmt(metrics.get('posture_score'), '/100')}\n"
        + f"- Lexical diversity (TTR): {fmt(metrics.get('lexical_diversity'))}\n"
        + f"- Word count: {fmt(metrics.get('word_count'))}\n"
        + f"- Voice clarity score: {fmt(metrics.get('voice_clarity_score'), '%')}\n"
        + f"- Discourse markers detected: {fmt(metrics.get('discourse_marker_count'))}\n"
        + f"- Sentence length variance: {fmt(metrics.get('sentence_length_variance'))}\n"
        + f"- Session duration: {fmt(metrics.get('duration_secs'), 's')}\n"
        + f"- Session mode: {session_mode} "
        + f"({'real-time coaching was active' if session_mode == 'guided' else 'no interruptions during recording'})\n"
    )

    try:
        await _rate_limiter.acquire()

        def _call() -> object:
            return client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_content},
                ],
                temperature=0.2,
                max_tokens=1600,
                response_format={"type": "json_object"},
            )

        chat = await asyncio.to_thread(_call)
        raw = chat.choices[0].message.content

        # Strip markdown fences even with json_object mode (CRIT-B04 fix)
        raw = re.sub(r'```(?:json)?\s*|\s*```', '', raw).strip()
        data = json.loads(raw)

        # ── Parse and clamp per-criterion rubric bands ────────────────────────
        raw_rubric = data.get("rubric_bands", {})
        validated_rubric: dict = {}
        for crit in RUBRIC_CRITERIA:
            entry = raw_rubric.get(crit)
            if not isinstance(entry, dict):
                # Missing criterion — fall back to rule-based anchor
                if rule_subbands and crit in rule_subbands:
                    validated_rubric[crit] = rule_subbands[crit].copy()
                continue
            score = int(round(max(1.0, min(6.0, float(entry.get("score", 3))))))
            justification = str(entry.get("justification", ""))[:400]
            if rule_subbands and crit in rule_subbands:
                anchor = rule_subbands[crit]["score"]
                diff = score - anchor
                if abs(diff) > 1:
                    score = int(round(max(1.0, min(6.0, anchor + (1 if diff > 0 else -1)))))
            validated_rubric[crit] = {"score": score, "justification": justification}

        # ── Compute final overall band from validated sub-bands ───────────────
        if len(validated_rubric) == len(RUBRIC_CRITERIA):
            scores = [v["score"] for v in validated_rubric.values()]
            final_band = int(round(max(1.0, min(6.0, sum(scores) / len(scores)))))
        else:
            # Partial rubric — fall back to old overall merge logic
            llm_band = int(round(max(1.0, min(6.0, float(data.get("band_score", 0))))))
            if rule_band is not None:
                diff = abs(llm_band - rule_band)
                if diff <= 1:
                    final_band = int(round((llm_band + rule_band) / 2))
                else:
                    final_band = int(round(max(1.0, min(6.0, rule_band + (1 if llm_band > rule_band else -1)))))
            else:
                final_band = llm_band

        # ── Validate advice cards ─────────────────────────────────────────────
        cards = data.get("advice_cards", [])
        validated = []
        for c in cards[:5]:
            if isinstance(c, dict) and "text" in c and "impact" in c:
                impact = c["impact"].upper()
                if impact not in ("HIGH", "MED", "LOW"):
                    impact = "MED"
                validated.append({"impact": impact, "text": str(c["text"])})
        if not validated:
            validated = _build_fallback_advice(metrics)

        return {
            "band_score": final_band,
            "advice_cards": validated,
            "rubric_bands": validated_rubric if validated_rubric else rule_subbands,
        }
    except Exception:
        logger.exception("Groq generate_feedback failed — falling back to rule-based advice")
        return {"band_score": rule_band, "advice_cards": _build_fallback_advice(metrics), "rubric_bands": rule_subbands}


async def generate_brainstorm_points(topic: str) -> list[str]:
    """
    Generate up to 5 extremely brief talking points for a MUET speaking topic.
    Each point is 4–8 words — just enough to spark an idea.
    Returns an empty list if Groq is unavailable.
    """
    prompt = (
        f'A student is about to give a MUET speaking presentation on this topic: "{topic}"\n\n'
        "Give them exactly 5 extremely brief talking points (4–8 words each) they can use as ideas.\n"
        "Each point must be a short phrase, not a full sentence.\n"
        "Respond ONLY with valid JSON — no markdown, no extra keys:\n"
        '{"points": ["...", "...", "...", "...", "..."]}'
    )
    raw = await _chat(prompt, max_tokens=180, temperature=0.7)
    if not raw:
        return []
    try:
        raw = re.sub(r'```(?:json)?\s*|\s*```', '', raw).strip()
        data = json.loads(raw)
        return [str(p).strip() for p in data.get("points", [])[:5] if str(p).strip()]
    except Exception:
        logger.exception("generate_brainstorm_points parse failed")
        return []
