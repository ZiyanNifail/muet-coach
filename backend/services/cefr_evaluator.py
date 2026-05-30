"""
CEFR Evaluation Layer — maps raw metrics to a MUET band score (1.0–6.0).

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


def _adjusted_ttr(ttr: float | None, word_count: int | None) -> float | None:
    """
    Normalise TTR down for short texts to reduce length bias.
    Raw TTR is inflated for short recordings because fewer words naturally
    repeat less — a 60-word talk will score higher than a 300-word talk even
    with identical vocabulary range.
    """
    if ttr is None or word_count is None:
        return ttr
    if word_count < 80:
        return ttr * 0.85
    if word_count < 150:
        return ttr * 0.92
    return ttr


def compute_band_score(
    wpm_avg: float | None,
    eye_contact_pct: float | None,
    filler_density: float | None,
    posture_score: float | None,
    lexical_diversity: float | None = 0.5,
    duration_secs: float | None = None,
    word_count: int | None = None,
) -> float:
    """
    Rule-based CEFR band mapping. Supplemented by Groq LLM scoring in T3.02.

    Metrics that are None (confidence_flags indicated N/A) are skipped —
    they do not contribute positively or negatively to the final score.

    Returns a float between 1.0 and 6.0.
    """
    score = 3.0  # raised from 2.7 — LLM shift is the primary calibration layer

    # Duration — sustained delivery earns a small bonus
    if duration_secs is not None and duration_secs >= 120:
        score += 0.3

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

    # Filler density — 5–10/min is penalised (was neutral at 0)
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

    # Lexical diversity — length-normalised to reduce short-text inflation
    adj_ttr = _adjusted_ttr(lexical_diversity, word_count)
    if adj_ttr is not None:
        if adj_ttr >= TTR_GOOD:
            score += 0.2
        elif adj_ttr < TTR_POOR:
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
    Passed to Groq as calibration anchors — Groq may shift each by ±1.
    """
    adj_ttr = _adjusted_ttr(lexical_diversity, word_count)

    # ── Task Fulfilment ──────────────────────────────────────────────────────
    tf = 3.0
    if word_count is not None:
        if word_count >= 200:
            tf += 0.5
        elif word_count >= 100:
            tf += 0.3
        elif word_count < 50:
            tf -= 0.5
    if adj_ttr is not None:
        if adj_ttr >= TTR_GOOD:
            tf += 0.2
        elif adj_ttr < TTR_POOR:
            tf -= 0.2
    if duration_secs is not None and duration_secs >= 90:
        tf += 0.2
    tf = round(max(1.0, min(6.0, tf)), 1)

    wc_str = f"{word_count} words" if word_count is not None else "word count unknown"
    ttr_str = f"TTR {adj_ttr:.2f}" if adj_ttr is not None else ""
    dur_str = f"{int(duration_secs)}s" if duration_secs is not None else ""
    if tf >= 4.5:
        tf_just = f"Strong content: {wc_str}{', ' + ttr_str if ttr_str else ''} — well-developed ideas with adequate detail."
    elif tf >= 3.5:
        tf_just = f"Adequate content ({wc_str}); aim for 200+ words and more varied vocabulary to reach a higher band."
    else:
        tf_just = f"Insufficient content ({wc_str}{', only ' + dur_str + ' recorded' if dur_str else ''}). Develop 2–3 clear ideas with examples."

    # ── Coherence & Cohesion ─────────────────────────────────────────────────
    cc = 3.0
    if discourse_marker_count is not None:
        if discourse_marker_count >= 5:
            cc += 0.5
        elif discourse_marker_count >= 3:
            cc += 0.3
        elif discourse_marker_count >= 1:
            cc += 0.1
        else:
            cc -= 0.2
    if filler_density is not None:
        if filler_density < FILLER_GOOD:
            cc += 0.3
        elif filler_density < FILLER_OK:
            cc += 0.1
        elif filler_density <= FILLER_POOR:
            cc -= 0.2
        else:
            cc -= 0.5
    cc = round(max(1.0, min(6.0, cc)), 1)

    dm_str = (
        f"{discourse_marker_count} discourse marker{'s' if discourse_marker_count != 1 else ''} detected"
        if discourse_marker_count is not None else ""
    )
    fd_str = f"{filler_density:.1f} fillers/min" if filler_density is not None else ""
    if cc >= 4.5:
        cc_just = f"Well-organised speech{' with ' + dm_str if dm_str else ''} and clear logical flow{' (' + fd_str + ')' if fd_str else ''}."
    elif cc >= 3.5:
        cc_just = (
            f"Generally organised{'; ' + dm_str if dm_str else ''}."
            + (f" Reduce filler words ({fd_str}) for smoother delivery." if fd_str else "")
        )
    else:
        cc_just = (
            f"Lacks clear structure{' — only ' + dm_str if dm_str else ''}. "
            + f"Use connectors like 'firstly', 'however', 'in conclusion'{' (' + fd_str + ')' if fd_str else ''}."
        )

    # ── Lexical Resource ─────────────────────────────────────────────────────
    lr = 3.0
    if adj_ttr is not None:
        if adj_ttr >= 0.70:
            lr += 0.7
        elif adj_ttr >= 0.65:
            lr += 0.5
        elif adj_ttr >= 0.55:
            lr += 0.3
        elif adj_ttr >= 0.45:
            lr += 0.1
        elif adj_ttr < TTR_POOR:
            lr -= 0.5
    if word_count is not None and word_count >= 150:
        lr += 0.2
    lr = round(max(1.0, min(6.0, lr)), 1)

    ttr_label = f"TTR {adj_ttr:.2f}" if adj_ttr is not None else "TTR unknown"
    if lr >= 4.5:
        lr_just = f"Wide and precise vocabulary ({ttr_label}) — good range for MUET speaking."
    elif lr >= 3.5:
        lr_just = f"Adequate vocabulary range ({ttr_label}); try more synonyms and academic phrases to stand out."
    else:
        lr_just = f"Limited vocabulary ({ttr_label}) — many words are repeated. Vary your word choices more deliberately."

    # ── Grammatical Range & Accuracy ─────────────────────────────────────────
    ga = 3.5  # neutral baseline — LLM assessment dominates this criterion
    if sentence_length_variance is not None:
        if sentence_length_variance > 100:
            ga += 0.3
        elif sentence_length_variance < 20:
            ga -= 0.2
    if wpm_avg is not None and 90 <= wpm_avg <= 160:
        ga += 0.1
    ga = round(max(1.0, min(6.0, ga)), 1)

    slv_str = f"sentence length variance {sentence_length_variance:.0f}" if sentence_length_variance is not None else ""
    if ga >= 4.5:
        ga_just = f"Uses varied grammatical structures{' (' + slv_str + ')' if slv_str else ''} with good accuracy throughout."
    elif ga >= 3.5:
        ga_just = f"Adequate grammar with some errors{' (' + slv_str + ')' if slv_str else ''}; vary sentence length and structure for higher marks."
    else:
        ga_just = f"Limited grammatical range{' (' + slv_str + ')' if slv_str else ''} — practise using compound and complex sentences."

    # ── Pronunciation ─────────────────────────────────────────────────────────
    pr = 3.0
    if voice_clarity_score is not None:
        if voice_clarity_score >= 80:
            pr += 0.7
        elif voice_clarity_score >= 70:
            pr += 0.5
        elif voice_clarity_score >= 60:
            pr += 0.3
        elif voice_clarity_score < 50:
            pr -= 0.5
    if pitch_mean_hz is not None:
        if 100 <= pitch_mean_hz <= 220:
            pr += 0.2
    if energy_mean_db is not None and -30 <= energy_mean_db <= -15:
        pr += 0.1
    pr = round(max(1.0, min(6.0, pr)), 1)

    vc_str = f"clarity {voice_clarity_score:.0f}%" if voice_clarity_score is not None else ""
    pitch_str = f"pitch {pitch_mean_hz:.0f} Hz" if pitch_mean_hz is not None else ""
    detail = ", ".join(filter(None, [vc_str, pitch_str]))
    if pr >= 4.5:
        pr_just = f"Clear, well-articulated speech{' (' + detail + ')' if detail else ''} with natural rhythm and good stress patterns."
    elif pr >= 3.5:
        pr_just = f"Generally intelligible{' (' + detail + ')' if detail else ''}; work on consistent enunciation and word stress."
    else:
        pr_just = f"Pronunciation affects intelligibility{' (' + detail + ')' if detail else ''} — practise enunciation and speak more clearly and deliberately."

    return {
        "task_fulfilment":            {"score": tf, "justification": tf_just},
        "coherence_cohesion":         {"score": cc, "justification": cc_just},
        "lexical_resource":           {"score": lr, "justification": lr_just},
        "grammatical_range_accuracy": {"score": ga, "justification": ga_just},
        "pronunciation":              {"score": pr, "justification": pr_just},
    }
