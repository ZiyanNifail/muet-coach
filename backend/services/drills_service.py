"""
Weakness-targeted drill recommendations — surfaces per-criterion MUET drills
based on the lowest rubric sub-band from a feedback report.
"""
import logging

logger = logging.getLogger(__name__)

RUBRIC_LABELS = {
    "task_fulfilment":            "Task Fulfilment",
    "coherence_cohesion":         "Coherence & Cohesion",
    "lexical_resource":           "Lexical Resource",
    "grammatical_range_accuracy": "Grammatical Range & Accuracy",
    "pronunciation":              "Pronunciation",
}

DRILL_CATALOGUE: dict[str, list[dict]] = {
    "task_fulfilment": [
        {
            "type": "topic_micro_pitch",
            "title": "Topic Micro-Pitch",
            "description": "Pick any topic and speak for 90 seconds: introduction (15s), 3 main points (60s), conclusion (15s). Focus on staying on-topic and developing each point.",
            "duration_mins": 2,
            "target": "Develop content depth and topic relevance",
        },
        {
            "type": "structure_outline_30s",
            "title": "Structure-First Outline",
            "description": "Before speaking, write a 3-point outline in 30 seconds. Then deliver it in 2 minutes, following your outline strictly. Re-record if you deviate.",
            "duration_mins": 3,
            "target": "Build organised, on-topic responses",
        },
        {
            "type": "expand_and_exemplify",
            "title": "Expand & Exemplify",
            "description": "Make a claim about any topic, then support it with 2 specific examples or real-world evidence. Record 60 seconds per claim — no vague statements allowed.",
            "duration_mins": 2,
            "target": "Develop ideas with supporting evidence",
        },
    ],
    "coherence_cohesion": [
        {
            "type": "discourse_marker_drill",
            "title": "Discourse Marker Drill",
            "description": "Speak for 90 seconds on any topic, deliberately using at least 5 discourse markers: 'firstly', 'furthermore', 'however', 'as a result', and 'in conclusion'.",
            "duration_mins": 2,
            "target": "Build automatic use of logical signposting",
        },
        {
            "type": "connective_retell",
            "title": "Connective Retell",
            "description": "Summarise a short news article in 2 minutes. Every new sentence must begin with a connective ('therefore', 'however', 'in addition', 'on the other hand', etc.).",
            "duration_mins": 2,
            "target": "Develop cohesive linking across sentences",
        },
        {
            "type": "pause_replace_drill",
            "title": "Pause-Replace Drill",
            "description": "Speak for 90 seconds on any topic. Every time you feel the urge to say 'um' or 'uh', replace it with a silent 2-second pause instead. Count your pauses afterward.",
            "duration_mins": 2,
            "target": "Reduce filler words for smoother delivery",
        },
    ],
    "lexical_resource": [
        {
            "type": "synonym_ladder",
            "title": "Synonym Ladder",
            "description": "Choose 5 common words you overuse (e.g. 'good', 'bad', 'thing', 'very', 'said'). Find 2 more precise alternatives for each, then use them in sentences aloud.",
            "duration_mins": 5,
            "target": "Expand vocabulary range and precision",
        },
        {
            "type": "word_upgrade_speech",
            "title": "Word Upgrade Speech",
            "description": "Give a 90-second speech on any topic. Immediately identify 3 basic words you used. Re-record the same speech replacing those words with higher-band alternatives.",
            "duration_mins": 4,
            "target": "Replace basic vocabulary with band 5–6 alternatives",
        },
        {
            "type": "topic_vocabulary_sprint",
            "title": "Topic Vocabulary Sprint",
            "description": "Pick a MUET topic (e.g. environment, technology, health). List 10 topic-specific collocations or phrases in 2 minutes, then use at least 5 of them in a 90-second talk.",
            "duration_mins": 4,
            "target": "Develop topic-specific lexical range",
        },
    ],
    "grammatical_range_accuracy": [
        {
            "type": "tense_switch_retell",
            "title": "Tense Switch Retell",
            "description": "Describe a current issue for 90 seconds: past tense for what happened, present perfect for current impact, and conditional ('if this continues...') for implications.",
            "duration_mins": 2,
            "target": "Demonstrate accurate tense control across a single speech",
        },
        {
            "type": "complex_clause_builder",
            "title": "Complex Clause Builder",
            "description": "Give a 90-second opinion speech. Every 3 sentences, deliberately include a complex or compound sentence using 'although', 'which', 'despite', or 'provided that'.",
            "duration_mins": 2,
            "target": "Increase grammatical range with subordinate clauses",
        },
        {
            "type": "conditional_opinion",
            "title": "Conditional Opinion",
            "description": "Pick a MUET discussion topic and give your opinion in 90 seconds. Use at least two conditional structures: one first conditional and one second or third conditional.",
            "duration_mins": 2,
            "target": "Demonstrate grammatical variety with conditional structures",
        },
    ],
    "pronunciation": [
        {
            "type": "minimal_pairs",
            "title": "Minimal Pairs Practice",
            "description": "Practise these word pairs slowly then at normal speed: ship/sheep, wet/vet, thin/tin, three/tree, leave/live, pull/pool. Record and compare each pair.",
            "duration_mins": 3,
            "target": "Sharpen phoneme distinctions common to Malaysian English",
            "link": "/pronunciation",
        },
        {
            "type": "stress_pattern_repeat",
            "title": "Word Stress Patterns",
            "description": "Say each word with correct stress: pho-TO-graph, pho-TOG-ra-phy, PHO-to-graph-ic, de-VE-lop, DE-ve-lop-ment. Use each in a full sentence. Repeat 3 times.",
            "duration_mins": 3,
            "target": "Improve word-level stress for clearer pronunciation",
            "link": "/pronunciation",
        },
        {
            "type": "read_aloud_shadowing",
            "title": "Read-Aloud Shadowing",
            "description": "Find a 1-minute English news clip. Listen once, then shadow word-by-word alongside the speaker, matching their rhythm, stress, and linking. Focus on clarity, not speed.",
            "duration_mins": 5,
            "target": "Improve prosody and natural English rhythm",
        },
    ],
}


def recommend_drills(rubric_bands: dict, max_drills: int = 3) -> dict:
    """
    Given a rubric_bands dict, identify the lowest-scoring criterion and
    return up to max_drills drill cards targeting it.

    Returns {"criterion": str, "criterion_label": str, "score": float, "drills": list}.
    """
    if not rubric_bands:
        return {"criterion": None, "criterion_label": None, "score": None, "drills": []}

    # Find the lowest-scoring criterion
    worst_crit = min(rubric_bands, key=lambda c: rubric_bands[c].get("score", 6.0))
    worst_score = rubric_bands[worst_crit].get("score", 6.0)
    drills = DRILL_CATALOGUE.get(worst_crit, [])[:max_drills]

    return {
        "criterion": worst_crit,
        "criterion_label": RUBRIC_LABELS.get(worst_crit, worst_crit),
        "score": worst_score,
        "drills": drills,
    }
