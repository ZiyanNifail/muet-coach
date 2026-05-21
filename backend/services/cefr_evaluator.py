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
    score = 2.7  # lower baseline — bonuses must be earned, not assumed

    # WPM — only ideal range earns a bonus; acceptable is neutral; poor is penalised
    if wpm_avg is not None:
        if WPM_IDEAL_MIN <= wpm_avg <= WPM_IDEAL_MAX:
            score += 0.5
        elif wpm_avg < WPM_POOR_MIN or wpm_avg > WPM_POOR_MAX:
            score -= 0.5
        # acceptable range (110–170 excl. ideal): no bonus — neutral

    # Eye contact — skipped entirely when face not detected (None)
    if eye_contact_pct is not None:
        if eye_contact_pct >= EYE_CONTACT_GOOD:       # ≥70 %
            score += 0.5
        elif eye_contact_pct >= EYE_CONTACT_OK:        # 50–70 %: neutral
            pass
        elif eye_contact_pct >= EYE_CONTACT_POOR:      # 30–50 %: mild penalty
            score -= 0.2
        else:                                           # <30 %: hard penalty
            score -= 0.5

    # Filler density — 5–10/min is now penalised (was neutral at 0)
    if filler_density is not None:
        if filler_density < FILLER_GOOD:               # <3/min
            score += 0.5
        elif filler_density < FILLER_OK:               # 3–5/min
            score += 0.1
        elif filler_density <= FILLER_POOR:            # 5–10/min: mild penalty
            score -= 0.2
        else:                                           # >10/min
            score -= 0.5

    # Posture — skipped entirely when pose not detected (None)
    if posture_score is not None:
        if posture_score >= POSTURE_GOOD:              # ≥80
            score += 0.3
        elif posture_score < POSTURE_OK:               # <60: neutral → only poor gets hit
            pass
        if posture_score < POSTURE_POOR:               # <40
            score -= 0.3

    # Lexical diversity (type-token ratio)
    if lexical_diversity is not None:
        if lexical_diversity >= TTR_GOOD:
            score += 0.2
        elif lexical_diversity < TTR_POOR:
            score -= 0.2

    return round(max(1.0, min(6.0, score)), 1)


def compute_subband_scores(
    wpm_avg: float | None = None,
    filler_density: float | None = None,
    lexical_diversity: float | None = None,
    voice_clarity_score: float | None = None,
    pitch_mean_hz: float | None = None,
    energy_mean_db: float | None = None,
    duration_secs: float | None = None,
    word_count: int | None = None,
    discourse_marker_count: int | None = None,
    sentence_length_variance: float | None = None,
) -> dict:
    """
    Rule-based per-criterion MUET sub-band scores (1.0–6.0 each).
    Returns {criterion: {"score": float, "justification": str}}.
    Passed to Groq as calibration anchors — Groq may shift each by ±0.5.
    """

    # ── Task Fulfilment ──────────────────────────────────────────────────────
    tf = 3.0
    tf_notes: list[str] = []
    if word_count is not None:
        if word_count >= 200:
            tf += 0.5; tf_notes.append("good content length")
        elif word_count >= 100:
            tf += 0.3; tf_notes.append("adequate length")
        elif word_count < 50:
            tf -= 0.5; tf_notes.append("insufficient content")
    if lexical_diversity is not None:
        if lexical_diversity >= TTR_GOOD:
            tf += 0.2; tf_notes.append("varied vocabulary")
        elif lexical_diversity < TTR_POOR:
            tf -= 0.2; tf_notes.append("repetitive vocabulary")
    if duration_secs is not None and duration_secs >= 90:
        tf += 0.2; tf_notes.append("sustained delivery")
    tf = round(max(1.0, min(6.0, tf)), 1)
    tf_just = (
        "Well-developed content with clear ideas." if tf >= 4.5 else
        "Adequate content development." if tf >= 3.5 else
        "Limited content — needs more development."
    ) + (f" ({', '.join(tf_notes)})" if tf_notes else "")

    # ── Coherence & Cohesion ─────────────────────────────────────────────────
    cc = 3.0
    cc_notes: list[str] = []
    if discourse_marker_count is not None:
        if discourse_marker_count >= 5:
            cc += 0.5; cc_notes.append(f"{discourse_marker_count} discourse markers")
        elif discourse_marker_count >= 3:
            cc += 0.3; cc_notes.append(f"{discourse_marker_count} discourse markers")
        elif discourse_marker_count >= 1:
            cc += 0.1; cc_notes.append("few discourse markers")
        else:
            cc -= 0.2; cc_notes.append("no discourse markers")
    if filler_density is not None:
        if filler_density < FILLER_GOOD:
            cc += 0.3
        elif filler_density < FILLER_OK:
            cc += 0.1
        elif filler_density <= FILLER_POOR:
            cc -= 0.2; cc_notes.append("frequent fillers disrupt flow")
        else:
            cc -= 0.5; cc_notes.append("excessive fillers")
    cc = round(max(1.0, min(6.0, cc)), 1)
    cc_just = (
        "Well-organised with clear logical progression." if cc >= 4.5 else
        "Generally organised with adequate cohesion." if cc >= 3.5 else
        "Lacks clear structure and cohesive devices."
    ) + (f" ({', '.join(cc_notes)})" if cc_notes else "")

    # ── Lexical Resource ─────────────────────────────────────────────────────
    lr = 3.0
    lr_notes: list[str] = []
    if lexical_diversity is not None:
        if lexical_diversity >= 0.70:
            lr += 0.7; lr_notes.append(f"TTR {lexical_diversity:.2f}")
        elif lexical_diversity >= 0.65:
            lr += 0.5; lr_notes.append(f"TTR {lexical_diversity:.2f}")
        elif lexical_diversity >= 0.55:
            lr += 0.3; lr_notes.append(f"TTR {lexical_diversity:.2f}")
        elif lexical_diversity >= 0.45:
            lr += 0.1
        elif lexical_diversity < TTR_POOR:
            lr -= 0.5; lr_notes.append(f"TTR {lexical_diversity:.2f} — very limited range")
    if word_count is not None and word_count >= 150:
        lr += 0.2; lr_notes.append("sufficient sample size")
    lr = round(max(1.0, min(6.0, lr)), 1)
    lr_just = (
        "Wide and precise vocabulary range." if lr >= 4.5 else
        "Adequate vocabulary range." if lr >= 3.5 else
        "Limited vocabulary — aim for more varied word choices."
    ) + (f" ({', '.join(lr_notes)})" if lr_notes else "")

    # ── Grammatical Range & Accuracy ─────────────────────────────────────────
    ga = 3.5  # neutral baseline — LLM assessment dominates this criterion
    ga_notes: list[str] = []
    if sentence_length_variance is not None:
        if sentence_length_variance > 100:
            ga += 0.3; ga_notes.append("varied sentence structures")
        elif sentence_length_variance < 20:
            ga -= 0.2; ga_notes.append("monotonous sentence length")
    if wpm_avg is not None and 90 <= wpm_avg <= 160:
        ga += 0.1  # fluent pace suggests grammatical ease
    ga = round(max(1.0, min(6.0, ga)), 1)
    ga_just = (
        "Uses varied and accurate grammatical structures." if ga >= 4.5 else
        "Adequate grammatical range with some errors." if ga >= 3.5 else
        "Limited grammatical range — focus on sentence variety."
    ) + (f" ({', '.join(ga_notes)})" if ga_notes else "")

    # ── Pronunciation ─────────────────────────────────────────────────────────
    pr = 3.0
    pr_notes: list[str] = []
    if voice_clarity_score is not None:
        if voice_clarity_score >= 80:
            pr += 0.7; pr_notes.append(f"clarity {voice_clarity_score:.0f}%")
        elif voice_clarity_score >= 70:
            pr += 0.5; pr_notes.append(f"clarity {voice_clarity_score:.0f}%")
        elif voice_clarity_score >= 60:
            pr += 0.3; pr_notes.append(f"clarity {voice_clarity_score:.0f}%")
        elif voice_clarity_score < 50:
            pr -= 0.5; pr_notes.append(f"low clarity {voice_clarity_score:.0f}%")
    if pitch_mean_hz is not None:
        if 100 <= pitch_mean_hz <= 220:
            pr += 0.2; pr_notes.append("natural pitch")
    if energy_mean_db is not None and -30 <= energy_mean_db <= -15:
        pr += 0.1; pr_notes.append("good projection")
    pr = round(max(1.0, min(6.0, pr)), 1)
    pr_just = (
        "Clear, well-articulated pronunciation with natural rhythm." if pr >= 4.5 else
        "Generally intelligible with minor pronunciation issues." if pr >= 3.5 else
        "Pronunciation affects intelligibility — practise enunciation."
    ) + (f" ({', '.join(pr_notes)})" if pr_notes else "")

    return {
        "task_fulfilment":            {"score": tf, "justification": tf_just},
        "coherence_cohesion":         {"score": cc, "justification": cc_just},
        "lexical_resource":           {"score": lr, "justification": lr_just},
        "grammatical_range_accuracy": {"score": ga, "justification": ga_just},
        "pronunciation":              {"score": pr, "justification": pr_just},
    }
