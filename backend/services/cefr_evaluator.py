"""
CEFR Evaluation Layer — maps raw metrics to a MUET band score (1.0–6.0).
Implemented in T2.16.

Band 5 baseline (per PRD FR-AI-09):
  - WPM: 130–150
  - Eye contact: >= 60%
  - Filler density: < 5/min
  - Posture score: >= 70
"""


def compute_band_score(
    wpm_avg: float,
    eye_contact_pct: float,
    filler_density: float,
    posture_score: float,
    lexical_diversity: float = 0.5,
) -> float:
    """
    Rule-based CEFR band mapping. Will be supplemented by Groq LLM scoring in T3.02.

    Returns a float between 1.0 and 6.0.
    """
    score = 3.0  # baseline

    # WPM
    if 130 <= wpm_avg <= 150:
        score += 0.5
    elif 110 <= wpm_avg < 130 or 150 < wpm_avg <= 170:
        score += 0.2
    elif wpm_avg < 80 or wpm_avg > 200:
        score -= 0.5

    # Eye contact
    if eye_contact_pct >= 70:
        score += 0.5
    elif eye_contact_pct >= 50:
        score += 0.2
    elif eye_contact_pct < 30:
        score -= 0.5

    # Filler density
    if filler_density < 3:
        score += 0.5
    elif filler_density < 5:
        score += 0.2
    elif filler_density > 10:
        score -= 0.5

    # Posture
    if posture_score >= 80:
        score += 0.3
    elif posture_score >= 60:
        score += 0.1
    elif posture_score < 40:
        score -= 0.3

    # Lexical diversity (type-token ratio)
    if lexical_diversity >= 0.65:
        score += 0.2
    elif lexical_diversity < 0.35:
        score -= 0.2

    return round(max(1.0, min(6.0, score)), 1)
