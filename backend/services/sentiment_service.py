"""
Sentiment analysis service — T2.12B.

Analyses sentiment of a text string using distilbert.
Lazy-loads transformers; returns None gracefully if not installed or on any error.
"""
import logging

logger = logging.getLogger(__name__)

_pipeline = None
_pipeline_failed = False  # avoid repeated load attempts after a failure


def _load_pipeline():
    """Lazy-load the sentiment pipeline. Returns None if unavailable."""
    global _pipeline, _pipeline_failed
    if _pipeline is not None:
        return _pipeline
    if _pipeline_failed:
        return None
    try:
        from transformers import pipeline as hf_pipeline
        _pipeline = hf_pipeline(
            "sentiment-analysis",
            model="distilbert-base-uncased-finetuned-sst-2-english",
            truncation=True,
            max_length=512,
        )
        logger.info("Sentiment pipeline loaded (distilbert-base-uncased-finetuned-sst-2-english)")
        return _pipeline
    except ImportError:
        logger.warning("transformers not installed — sentiment analysis unavailable. Install with: pip install transformers torch")
        _pipeline_failed = True
        return None
    except Exception as exc:
        logger.warning("Failed to load sentiment pipeline: %s", exc)
        _pipeline_failed = True
        return None


def analyse_sentiment(text: str) -> float | None:
    """
    Analyse sentiment of text.

    Returns a float 0.0–1.0 where 1.0 is fully positive,
    or None if the analysis cannot be performed.
    Never raises.
    """
    if not text or not text.strip():
        return None
    try:
        pipe = _load_pipeline()
        if pipe is None:
            return None
        results = pipe(text[:512])  # extra safety truncation
        if not results:
            return None
        result = results[0]
        label = result.get("label", "").upper()
        score = float(result.get("score", 0.5))
        # Normalise: NEGATIVE => invert score so 1.0 = fully positive
        if label == "NEGATIVE":
            score = 1.0 - score
        return round(score, 4)
    except Exception as exc:
        logger.warning("Sentiment analysis failed: %s", exc)
        return None
