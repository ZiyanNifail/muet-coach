"""
Pronunciation Trainer router.

POST /api/pronunciation/validate        — validate word, syllabify, Groq-enrich
POST /api/pronunciation/check-syllable  — score a syllable recording via Whisper + phonetics
POST /api/pronunciation/check-sentence  — score a full sentence recording via Whisper + Groq
"""
import os
import tempfile
import logging

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from pydantic import BaseModel

from services.auth_deps import get_current_user_id
from services.pronunciation_service import (
    validate_word,
    syllabify,
    enrich_with_groq,
    score_syllable,
    score_sentence_usage,
)
from services.whisper_service import transcribe

logger = logging.getLogger(__name__)
router = APIRouter()


class ValidateBody(BaseModel):
    word: str


# ── /validate ─────────────────────────────────────────────────────────────────

@router.post("/validate")
async def validate_word_endpoint(
    body: ValidateBody,
    user_id: str = Depends(get_current_user_id),
):
    """
    Validate that `word` is a real English word, then return syllables,
    IPA, definition, examples, and Groq-generated pronunciation guidance.
    """
    word = body.word.strip().lower()
    if not word:
        raise HTTPException(400, "Word cannot be empty.")

    word_data = await validate_word(word)
    if word_data is None:
        raise HTTPException(
            400,
            f'"{body.word}" doesn\'t appear to be a valid English word. Please try another.',
        )

    syllables = syllabify(word)
    enrichment = await enrich_with_groq(
        word,
        syllables,
        word_data.get("definition", ""),
        word_data.get("examples", []),
    )

    # Merge dictionary examples + Groq extra examples (deduplicate)
    dict_examples = word_data.get("examples", [])
    extra = enrichment.get("extra_examples", [])
    all_examples = dict_examples + [e for e in extra if e not in dict_examples]

    return {
        "word": word,
        "ipa": word_data.get("ipa", ""),
        "definition": word_data.get("definition", ""),
        "syllables": syllables,
        "stress_index": enrichment["stress_index"],
        "syllable_tips": enrichment["syllable_tips"],
        "examples": all_examples[:5],
        "usage_hint": enrichment["usage_hint"],
    }


# ── /check-syllable ───────────────────────────────────────────────────────────

@router.post("/check-syllable")
async def check_syllable_endpoint(
    audio: UploadFile = File(...),
    syllable: str = Form(...),
    word: str = Form(...),
    index: int = Form(0),
    user_id: str = Depends(get_current_user_id),
):
    """
    Transcribe a short syllable recording via Whisper, then score it
    phonetically against the target syllable.
    """
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(400, "Empty audio — no recording received.")

    # Write to temp file for Whisper
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        result = await transcribe(tmp_path)
        transcript_text = (
            result.get("transcript", "").strip()
            if isinstance(result, dict)
            else str(result).strip()
        )
    except Exception:
        logger.exception("Whisper transcription failed in check_syllable (syllable=%s)", syllable)
        transcript_text = ""
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

    score_result = score_syllable(transcript_text, syllable)

    # Fetch a short Groq tip only on failure (preserves rate-limit quota)
    tip = ""
    if not score_result["pass"]:
        from services.groq_service import _chat
        try:
            raw_tip = await _chat(
                f'The student tried to pronounce the syllable "{syllable}" from the word "{word}" '
                f'but said "{transcript_text or "(nothing detected)"}". '
                f"Give one short, friendly, actionable pronunciation tip. Max 12 words.",
                max_tokens=60,
                temperature=0.4,
            )
            tip = raw_tip.strip() if raw_tip else ""
        except Exception:
            logger.warning("Groq tip fetch failed for syllable '%s'", syllable)

    return {
        "transcript": transcript_text,
        "score": score_result["score"],
        "pass": score_result["pass"],
        "tip": tip,
    }


# ── /check-sentence ───────────────────────────────────────────────────────────

@router.post("/check-sentence")
async def check_sentence_endpoint(
    audio: UploadFile = File(...),
    word: str = Form(...),
    user_id: str = Depends(get_current_user_id),
):
    """
    Transcribe the student's sentence recording, verify the target word is present,
    and ask Groq to score grammar + naturalness.
    """
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(400, "Empty audio — no recording received.")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        result = await transcribe(tmp_path)
        transcript_text = (
            result.get("transcript", "").strip()
            if isinstance(result, dict)
            else str(result).strip()
        )
    except Exception:
        logger.exception("Whisper transcription failed in check_sentence (word=%s)", word)
        transcript_text = ""
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

    score_result = await score_sentence_usage(transcript_text, word)

    return {
        "transcript": transcript_text,
        "has_word": score_result["has_word"],
        "score": score_result["score"],
        "feedback": score_result["feedback"],
    }
