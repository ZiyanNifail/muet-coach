"""
Sentiment analysis service — T2.12B.

Uses VADER (Valence Aware Dictionary and sEntiment Reasoner) as primary analyser.
Falls back to a built-in word-list approach if VADER is unavailable.

Returns a float 0.0–1.0 where 1.0 is fully positive delivery.
"""
import logging

logger = logging.getLogger(__name__)

_analyzer = None
_load_failed = False

_POSITIVE = frozenset([
    'good', 'great', 'excellent', 'amazing', 'wonderful', 'positive', 'success',
    'successful', 'effective', 'important', 'significant', 'strong', 'clear',
    'confident', 'powerful', 'improve', 'better', 'best', 'achievement', 'growth',
    'progress', 'well', 'helpful', 'benefit', 'support', 'develop', 'learn',
    'knowledge', 'skill', 'opportunity', 'innovative', 'solution', 'advantage',
])
_NEGATIVE = frozenset([
    'bad', 'poor', 'fail', 'failure', 'problem', 'issue', 'difficult', 'wrong',
    'negative', 'weak', 'struggle', 'lack', 'inadequate', 'insufficient',
    'unfortunately', 'concern', 'challenge', 'unable', 'cannot', 'never',
])


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


def _word_list_sentiment(text: str) -> float:
    words = [w.strip('.,!?;:\'"').lower() for w in text.split()]
    pos = sum(1 for w in words if w in _POSITIVE)
    neg = sum(1 for w in words if w in _NEGATIVE)
    total = pos + neg
    if total == 0:
        return 0.55
    return round(0.5 + (pos - neg) / (2 * max(total, 1)), 4)


def analyse_sentiment(text: str) -> float | None:
    """
    Analyse the sentiment of a transcript.

    Returns a float 0.0–1.0 where:
      1.0 = very positive / confident delivery
      0.5 = neutral
      0.0 = very negative / hesitant

    Uses VADER if available, falls back to built-in word-list approach.
    Never raises.
    """
    if not text or not text.strip():
        return None
    try:
        analyzer = _load_analyzer()
        if analyzer is not None:
            scores = analyzer.polarity_scores(text)
            compound = scores.get("compound", 0.0)
            return round((compound + 1.0) / 2.0, 4)
        return _word_list_sentiment(text)
    except Exception as exc:
        logger.warning("Sentiment analysis failed: %s", exc)
        try:
            return _word_list_sentiment(text)
        except Exception:
            return None
