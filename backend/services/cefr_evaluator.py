"""
CEFR Evaluation Layer — maps raw metrics to a MUET band score (1.0–6.0).
Implemented in T2.16.

Band 5 baseline (per PRD FR-AI-09):
  - WPM: 130–150
  - Eye contact: >= 60%
  - Filler density: < 5/min
  - Posture score: >= 70

CRIT-04 fix: metrics that are None (flagged N/A by confidence_flags) are
excluded from the band calculation entirely rather than defaulting to 0,
which would unfairly penalise the score when face or audio detection fails.
"""

# Band 5 thresholds as named constants for auditability (WARN-12 fix).
WPM_IDEAL_MIN = 130
WPM_IDEAL_MAX = 150
WPM_ACCEPTABLE_MIN = 110
WPM_ACCEPTABLE_MAX = 170
WPM_POOR_MIN = 80
WPM_POOR_MAX = 200

EYE_CONTACT_GOOD = 70
EYE_CONTACT_OK = 50
EYE_CONTACT_POOR = 30

FILLER_GOOD = 3
FILLER_OK = 5
FILLER_POOR = 10

POSTURE_GOOD = 80
POSTURE_OK = 60
POSTURE_POOR = 40

TTR_GOOD = 0.65
TTR_POOR = 0.35


def compute_band_score(
    wpm_avg: float | None,
    eye_contact_pct: float | None,
    filler_density: float | None,
    posture_score: float | None,
    lexical_diversity: float | None = 0.5,
) -> float:
    """
    Rule-based CEFR band mapping. Supplemented by Groq LLM scoring in T3.02.

    Metrics that are None (confidence_flags indicated N/A) are skipped —
    they do not contribute positively or negatively to the final score.

    Returns a float between 1.0 and 6.0.
    """
    score = 3.0  # baseline

    # WPM
    if wpm_avg is not None:
        if WPM_IDEAL_MIN <= wpm_avg <= WPM_IDEAL_MAX:
            score += 0.5
        elif WPM_ACCEPTABLE_MIN <= wpm_avg < WPM_IDEAL_MIN or WPM_IDEAL_MAX < wpm_avg <= WPM_ACCEPTABLE_MAX:
            score += 0.2
        elif wpm_avg < WPM_POOR_MIN or wpm_avg > WPM_POOR_MAX:
            score -= 0.5

    # Eye contact — skipped entirely when face not detected (None)
    if eye_contact_pct is not None:
        if eye_contact_pct >= EYE_CONTACT_GOOD:
            score += 0.5
        elif eye_contact_pct >= EYE_CONTACT_OK:
            score += 0.2
        elif eye_contact_pct < EYE_CONTACT_POOR:
            score -= 0.5

    # Filler density
    if filler_density is not None:
        if filler_density < FILLER_GOOD:
            score += 0.5
        elif filler_density < FILLER_OK:
            score += 0.2
        elif filler_density > FILLER_POOR:
            score -= 0.5

    # Posture — skipped entirely when pose not detected (None)
    if posture_score is not None:
        if posture_score >= POSTURE_GOOD:
            score += 0.3
        elif posture_score >= POSTURE_OK:
            score += 0.1
        elif posture_score < POSTURE_POOR:
            score -= 0.3

    # Lexical diversity (type-token ratio)
    if lexical_diversity is not None:
        if lexical_diversity >= TTR_GOOD:
            score += 0.2
        elif lexical_diversity < TTR_POOR:
            score -= 0.2

    return round(max(1.0, min(6.0, score)), 1)
