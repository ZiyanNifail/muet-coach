"""
Pronunciation Trainer service.

Provides:
  validate_word   — Free Dictionary API lookup (rejects gibberish)
  syllabify       — pyphen syllable split
  enrich_with_groq — Groq enrichment (stress, tips, usage, extra examples)
  score_syllable  — phonetic similarity scoring via jellyfish
  score_sentence_usage — lemma-match + Groq context scoring
"""
import os
import re
import json
import logging

import httpx

logger = logging.getLogger(__name__)


async def validate_word(word: str) -> dict | None:
    """
    Call the Free Dictionary API for `word`.
    Returns structured dict on success, None if the word is not found (gibberish / typo).
    """
    word = word.strip().lower()
    if not word or not re.match(r'^[a-zA-Z]+$', word):
        return None

    url = f"https://api.dictionaryapi.dev/api/v2/entries/en/{word}"
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            res = await client.get(url)

        if res.status_code == 404:
            return None
        if res.status_code != 200:
            logger.warning("Dictionary API returned %s for word '%s'", res.status_code, word)
            return None

        data = res.json()
        entry = data[0] if data else {}

        # IPA phonetic
        ipa = entry.get("phonetic", "")
        if not ipa:
            for ph in entry.get("phonetics", []):
                if ph.get("text"):
                    ipa = ph["text"]
                    break

        # First definition + up to 3 example sentences
        meaning_def = ""
        examples: list[str] = []
        for meaning in entry.get("meanings", []):
            for defn in meaning.get("definitions", []):
                if not meaning_def and defn.get("definition"):
                    meaning_def = defn["definition"]
                if defn.get("example") and len(examples) < 3:
                    examples.append(defn["example"])
            if meaning_def and len(examples) >= 2:
                break

        return {
            "word": word,
            "ipa": ipa,
            "definition": meaning_def,
            "examples": examples,
        }
    except Exception:
        logger.exception("validate_word failed for '%s'", word)
        return None


def syllabify(word: str) -> list[str]:
    """Split a word into syllables using pyphen (offline, no API call)."""
    try:
        import pyphen
        dic = pyphen.Pyphen(lang="en_US")
        hyphenated = dic.inserted(word.lower())
        parts = [p for p in hyphenated.split("-") if p]
        return parts if parts else [word.lower()]
    except Exception:
        logger.warning("pyphen unavailable — returning word as single syllable")
        return [word.lower()]


async def enrich_with_groq(
    word: str,
    syllables: list[str],
    definition: str,
    examples: list[str],
) -> dict:
    """
    Ask Groq to add: stressed syllable index, per-syllable pronunciation tip,
    one-line usage hint, and 2 fresh example sentences.
    Gracefully degrades if Groq is unavailable.
    """
    from services.groq_service import _chat

    syl_str = " · ".join(syllables)
    ex_str = "\n".join(f"- {e}" for e in examples) if examples else "None available"

    prompt = (
        f"You are an English pronunciation coach for Malaysian university students (MUET context).\n"
        f"Word: {word}\n"
        f"Syllables: {syl_str}\n"
        f"Definition: {definition or 'N/A'}\n"
        f"Dictionary examples:\n{ex_str}\n\n"
        f"Return ONLY a JSON object with exactly these fields (no markdown fences):\n"
        f'{{"stress_index": <0-based index of the primary stressed syllable>, '
        f'"syllable_tips": [<one short tip per syllable, max 8 words each>], '
        f'"usage_hint": "<one sentence: when or where to use this word in academic/formal English>", '
        f'"extra_examples": ["<natural sentence using {word}>", "<another natural sentence using {word}>"] }}'
    )

    fallback: dict = {
        "stress_index": 0,
        "syllable_tips": ["" for _ in syllables],
        "usage_hint": (
            f'Use "{word}" in academic writing and formal speech to express this concept precisely.'
        ),
        "extra_examples": [f"Understanding {word} is important in this context."],
    }

    try:
        raw = await _chat(prompt, max_tokens=500, temperature=0.3)
        if not raw:
            return fallback
        raw = re.sub(r"```(?:json)?\s*|\s*```", "", raw).strip()
        data = json.loads(raw)

        stress_idx = int(data.get("stress_index", 0))
        tips: list[str] = list(data.get("syllable_tips", []))
        while len(tips) < len(syllables):
            tips.append("")

        return {
            "stress_index": max(0, min(stress_idx, len(syllables) - 1)),
            "syllable_tips": tips[: len(syllables)],
            "usage_hint": str(data.get("usage_hint", fallback["usage_hint"])),
            "extra_examples": list(data.get("extra_examples", fallback["extra_examples"]))[:3],
        }
    except Exception:
        logger.exception("enrich_with_groq failed for '%s'", word)
        return fallback


def score_syllable(transcript: str, target_syllable: str) -> dict:
    """
    Score how well the transcribed utterance matches the target syllable.
    Uses Metaphone phonetic matching + Jaro-Winkler similarity.
    Returns {score: 0-100, pass: bool, method: str}
    """
    # Use the first word of the transcript (student should say just the syllable)
    words = transcript.strip().lower().split()
    t = words[0] if words else ""
    target = target_syllable.strip().lower()

    if not t:
        return {"score": 0, "pass": False, "method": "empty"}

    # Exact match
    if t == target:
        return {"score": 100, "pass": True, "method": "exact"}

    try:
        import jellyfish

        # Phonetic (Metaphone) — correct sound even if spelling differs
        try:
            if jellyfish.metaphone(t) == jellyfish.metaphone(target):
                return {"score": 90, "pass": True, "method": "phonetic"}
        except Exception:
            pass

        # Jaro-Winkler similarity
        jw = jellyfish.jaro_winkler_similarity(t, target)
        score = int(jw * 100)
        return {"score": score, "pass": score >= 70, "method": "jaro_winkler"}

    except ImportError:
        logger.warning("jellyfish not installed — using substring fallback for syllable scoring")

    # Fallback: simple substring / prefix check
    if target in t or t in target:
        return {"score": 65, "pass": False, "method": "substring"}
    return {"score": 0, "pass": False, "method": "no_match"}


async def score_sentence_usage(transcript: str, word: str) -> dict:
    """
    1. Check if the student included the target word (root-form match).
    2. If present, ask Groq to score naturalness and grammar.
    Returns {has_word: bool, score: 0-100, feedback: str}
    """
    from services.groq_service import _chat

    if not transcript.strip():
        return {
            "has_word": False,
            "score": 0,
            "feedback": "No speech detected — please try again.",
        }

    transcript_lower = transcript.lower()
    word_lower = word.lower()

    # Root-form match: allow common inflections (-s, -ed, -ing, -ly, -er, -ion …)
    root = word_lower[:max(4, len(word_lower) - 2)]
    has_word = bool(re.search(r"\b" + re.escape(root) + r"\w{0,5}\b", transcript_lower))

    if not has_word:
        return {
            "has_word": False,
            "score": 20,
            "feedback": (
                f'Your sentence didn\'t clearly include "{word}". '
                f"Try again and make sure to use it in your sentence."
            ),
        }

    # Groq context/grammar check
    prompt = (
        f'Target word: "{word}"\n'
        f'Student sentence: "{transcript}"\n\n'
        f'Is this sentence natural, grammatically correct English that uses "{word}" appropriately '
        f"for a Malaysian university student context (MUET)?\n"
        f'Return ONLY JSON (no markdown): {{"score": <0-100>, "feedback": "<one encouraging sentence of specific feedback>"}}'
    )

    fallback_feedback = (
        f'Good effort! You used "{word}" in a sentence. '
        f"Try to add more context to show you understand its meaning."
    )

    try:
        raw = await _chat(prompt, max_tokens=150, temperature=0.3)
        if not raw:
            return {"has_word": True, "score": 75, "feedback": fallback_feedback}
        raw = re.sub(r"```(?:json)?\s*|\s*```", "", raw).strip()
        data = json.loads(raw)
        score = max(0, min(100, int(data.get("score", 75))))
        feedback = str(data.get("feedback", fallback_feedback))
        return {"has_word": True, "score": score, "feedback": feedback}
    except Exception:
        logger.exception("score_sentence_usage Groq call failed for word '%s'", word)
        return {"has_word": True, "score": 75, "feedback": fallback_feedback}
