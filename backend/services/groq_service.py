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


FALLBACK_ADVICE = [
    {"impact": "HIGH", "text": "You used filler words like 'um' or 'uh' frequently. These make you sound unsure. Try pausing silently instead — a quiet pause sounds more confident."},
    {"impact": "MED",  "text": "Your eye contact was low during this session. Try looking directly at the camera instead of glancing away — aim for at least 70% of the time."},
    {"impact": "MED",  "text": "You repeated the same words several times. Instead of saying 'good' repeatedly, try alternatives like 'beneficial', 'effective', or 'valuable'."},
    {"impact": "LOW",  "text": "You jumped between points without connecting them. Try saying 'firstly...', 'another reason is...', 'in conclusion...' to guide your listener."},
    {"impact": "LOW",  "text": "Most of your sentences started with 'I'. Try mixing it up — for example, 'This shows that...' or 'One key point is...' adds variety."},
]

RUBRIC_CRITERIA = (
    "task_fulfilment",
    "coherence_cohesion",
    "lexical_resource",
    "grammatical_range_accuracy",
    "pronunciation",
)

SYSTEM_PROMPT = """You are an expert English proficiency examiner specialising in MUET (Malaysian University English Test) oral communication.
You will receive a student's transcript, performance metrics, and rule-based anchor scores for each criterion.

MUET SPEAKING RUBRIC — score each criterion 1.0–6.0:
- task_fulfilment: Did the student address the topic with adequate content and idea development?
- coherence_cohesion: Is the speech logically organised with discourse markers and smooth flow?
- lexical_resource: Does the student use varied, precise vocabulary suited to the task?
- grammatical_range_accuracy: Are grammatical structures accurate and varied?
- pronunciation: Is speech clear, well-stressed, and easy to understand?

BAND DESCRIPTORS (apply to each criterion):
- Band 1 (1.0–1.4): Minimal — barely communicates, virtually no control
- Band 2 (1.5–2.4): Very limited — only short utterances, frequent breakdown
- Band 3 (2.5–3.4): Limited — conveys basic meaning, many errors, restricted range
- Band 4 (3.5–4.4): Satisfactory — meaning clear, some errors, adequate range
- Band 5 (4.5–5.4): Good — generally accurate and fluent, good range
- Band 6 (5.5–6.0): Excellent — highly accurate, wide range, near-native fluency

CRITICAL RULES:
- Each criterion score MUST stay within ±0.5 of its provided rule_subband anchor.
- If filler density >10/min: coherence_cohesion cannot exceed 3.5.
- If filler density >5/min: coherence_cohesion cannot exceed 4.4.
- If transcript is <20 words: all criteria MUST be 1.0.
- A score above 4.0 requires WPM 110–160 AND filler density <5/min.
- Do NOT default to 4.0–4.5 when evidence is ambiguous — score conservatively.
- band_score MUST equal the mean of the 5 criterion scores, rounded to 1 decimal place.
- Each justification must be exactly one concise sentence (max 20 words).

Respond ONLY with valid JSON — no markdown fences, no extra keys:
{
  "rubric_bands": {
    "task_fulfilment":            {"score": <float 1.0-6.0>, "justification": "<one sentence>"},
    "coherence_cohesion":         {"score": <float 1.0-6.0>, "justification": "<one sentence>"},
    "lexical_resource":           {"score": <float 1.0-6.0>, "justification": "<one sentence>"},
    "grammatical_range_accuracy": {"score": <float 1.0-6.0>, "justification": "<one sentence>"},
    "pronunciation":              {"score": <float 1.0-6.0>, "justification": "<one sentence>"}
  },
  "band_score": <float — mean of 5 scores>,
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
- Keep each card under 35 words. Friendly and encouraging tone, not critical."""


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
        return {"band_score": None, "advice_cards": FALLBACK_ADVICE, "rubric_bands": rule_subbands}

    word_count = len(transcript.split()) if transcript else 0
    if word_count < 5:
        return {"band_score": rule_band, "advice_cards": FALLBACK_ADVICE, "rubric_bands": rule_subbands}

    session_mode = metrics.get("session_mode", "unguided")

    def fmt(v: object, suffix: str = "") -> str:
        return "N/A" if v is None else f"{v}{suffix}"

    # Build per-criterion anchor section for the prompt
    if rule_subbands:
        anchor_lines = "\n".join(
            f"- {crit}: {rule_subbands[crit]['score']}"
            for crit in RUBRIC_CRITERIA if crit in rule_subbands
        )
        subband_block = f"\nRULE-BASED SUB-BAND ANCHORS (stay within ±0.5 of each):\n{anchor_lines}\n"
    else:
        subband_block = f"\nRULE-BASED OVERALL BAND (calibrated baseline): {rule_band if rule_band else 'N/A'}\n"

    user_content = (
        subband_block
        + f"\nTRANSCRIPT ({word_count} words):\n{transcript}\n\n"
        + "METRICS:\n"
        + f"- Average WPM: {fmt(metrics.get('wpm_avg'))}\n"
        + f"- Eye contact: {fmt(metrics.get('eye_contact_pct'), '%')}\n"
        + f"- Filler words per minute: {fmt(metrics.get('filler_density'))}\n"
        + f"- Posture score: {fmt(metrics.get('posture_score'), '/100')}\n"
        + f"- Lexical diversity (TTR): {fmt(metrics.get('lexical_diversity'))}\n"
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
                max_tokens=1200,
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
            score = round(max(1.0, min(6.0, float(entry.get("score", 3.5)))), 1)
            justification = str(entry.get("justification", ""))[:200]
            # Per-criterion anchor clamp (mirrors overall band clamp at lines 200-207)
            if rule_subbands and crit in rule_subbands:
                anchor = rule_subbands[crit]["score"]
                diff = score - anchor
                if abs(diff) > 0.5:
                    score = round(max(1.0, min(6.0, anchor + (0.5 if diff > 0 else -0.5))), 1)
            validated_rubric[crit] = {"score": score, "justification": justification}

        # ── Compute final overall band from validated sub-bands ───────────────
        if len(validated_rubric) == len(RUBRIC_CRITERIA):
            scores = [v["score"] for v in validated_rubric.values()]
            final_band = round(max(1.0, min(6.0, sum(scores) / len(scores))), 1)
        else:
            # Partial rubric — fall back to old overall merge logic
            llm_band = round(max(1.0, min(6.0, float(data.get("band_score", 0)))), 1)
            if rule_band is not None:
                diff = abs(llm_band - rule_band)
                if diff <= 1.0:
                    final_band = round((llm_band + rule_band) / 2, 1)
                else:
                    final_band = round(max(1.0, min(6.0, rule_band + (0.5 if llm_band > rule_band else -0.5))), 1)
            else:
                final_band = llm_band

        # ── Validate advice cards ─────────────────────────────────────────────
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

        return {
            "band_score": final_band,
            "advice_cards": validated,
            "rubric_bands": validated_rubric if validated_rubric else rule_subbands,
        }
    except Exception:
        logger.exception("Groq generate_feedback failed — falling back to rule-based advice")
        return {"band_score": rule_band, "advice_cards": FALLBACK_ADVICE, "rubric_bands": rule_subbands}
