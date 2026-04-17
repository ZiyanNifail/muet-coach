"""
Sentiment analysis service — T2.12B.

Uses VADER (Valence Aware Dictionary and sEntiment Reasoner) — a lightweight,
pure-Python sentiment analyser that requires no GPU and installs in seconds.
VADER is well-suited to spoken/informal English (vs. SST-2 which was trained on
movie reviews and often mislabels presentation speech).

Returns a float 0.0–1.0 where 1.0 is fully positive delivery.
"""
import logging

logger = logging.getLogger(__name__)

_analyzer = None
_load_failed = False


def _load_analyzer():
    """Lazy-load VADER. Returns None if vaderSentiment is not installed."""
    global _analyzer, _load_failed
    if _analyzer is not None:
        return _analyzer
    if _load_failed:
        return None
    try:
        from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
        _analyzer = SentimentIntensityAnalyzer()
        logger.info("VADER sentiment analyser loaded")
        return _analyzer
    except ImportError:
        logger.warning(
            "vaderSentiment not installed — sentiment analysis unavailable. "
            "Install with: pip install vaderSentiment"
        )
        _load_failed = True
        return None
    except Exception as exc:
        logger.warning("Failed to load VADER analyser: %s", exc)
        _load_failed = True
        return None


def analyse_sentiment(text: str) -> float | None:
    """
    Analyse the sentiment of a transcript.

    Returns a float 0.0–1.0 where:
      1.0 = very positive / confident delivery
      0.5 = neutral
      0.0 = very negative / hesitant

    VADER compound score is in [-1, 1]; we map it to [0, 1].
    Returns None if the analysis cannot be performed.
    Never raises.
    """
    if not text or not text.strip():
        return None
    try:
        analyzer = _load_analyzer()
        if analyzer is None:
            return None
        scores = analyzer.polarity_scores(text)
        compound = scores.get("compound", 0.0)  # -1.0 to 1.0
        # Map [-1, 1] → [0, 1]
        normalised = round((compound + 1.0) / 2.0, 4)
        return normalised
    except Exception as exc:
        logger.warning("Sentiment analysis failed: %s", exc)
        return None
