import json
import asyncio
import logging

logger = logging.getLogger(__name__)

ICEBREAKERS = [
    "Hello! Welcome to your mock interview. How are you doing today, and are you feeling ready to get started?",
    "Great! Let's warm up a little. Could you tell me about yourself and highlight what you consider to be your key strengths?",
]

QUESTION_BANK: dict[str, list[str]] = {
    "data_analyst": [
        "Can you walk me through how you would approach a brand new data analysis project from start to finish?",
        "Tell me about a time you used data to influence a business decision. What tools did you use and what was the outcome?",
        "How do you handle missing or inconsistent data in a dataset?",
        "What is the difference between a left join and an inner join? Can you give a practical example of when you would use each?",
        "Where do you see data analytics heading in the next few years, and how are you personally preparing for those changes?",
    ],
    "data_science": [
        "Can you explain the difference between supervised and unsupervised learning, and give an example use case for each?",
        "Walk me through how you would build and evaluate a machine learning model for a classification problem.",
        "How do you handle overfitting in a model? What regularisation or other techniques do you typically reach for?",
        "Describe a time you dealt with a highly imbalanced dataset. How did you address it?",
        "What is your experience with deep learning frameworks, and when would you choose them over traditional machine learning approaches?",
    ],
    "software_engineer": [
        "Can you explain the difference between REST and GraphQL APIs? When would you choose one over the other?",
        "Walk me through your process when you encounter a bug in production.",
        "What does SOLID mean to you, and can you give an example of applying one of its principles in a real project?",
        "How do you approach writing unit tests, and what is your view on test coverage targets?",
        "Describe a technically challenging project you have worked on. What was your role and how did you overcome the key difficulties?",
    ],
    "marketing": [
        "How would you develop a marketing strategy for a new product launching in a competitive market?",
        "Can you walk me through a successful campaign you have worked on? What made it successful?",
        "How do you measure the ROI of a digital marketing campaign?",
        "How do you stay up to date with digital marketing trends, and how have you recently applied a new trend in your work?",
        "Tell me about a time a campaign did not perform as expected. How did you respond and what did you learn from it?",
    ],
}

TOTAL_QUESTIONS = 7  # 2 icebreakers + 5 role-specific


def get_question(role: str, index: int) -> str:
    if index < 2:
        return ICEBREAKERS[index]
    role_questions = QUESTION_BANK.get(role, QUESTION_BANK["software_engineer"])
    return role_questions[index - 2]


# ── Whisper STT (via Groq) ────────────────────────────────────────────────────

async def transcribe_audio(audio_bytes: bytes) -> str:
    from services.groq_service import _get_groq_client, _rate_limiter

    client = _get_groq_client()
    if client is None:
        return ""

    await _rate_limiter.acquire()

    def _call():
        return client.audio.transcriptions.create(
            file=("answer.webm", audio_bytes, "audio/webm"),
            model="whisper-large-v3-turbo",
        )

    resp = await asyncio.to_thread(_call)
    return resp.text.strip()


# ── Groq: evaluate one answer ─────────────────────────────────────────────────

async def evaluate_answer(question: str, transcript: str, role: str) -> dict:
    from services.groq_service import _get_groq_client, _rate_limiter

    client = _get_groq_client()
    if client is None:
        return {"score": 5.0, "feedback": "Unable to evaluate — AI service unavailable."}

    system = (
        "You are an experienced job interviewer evaluating a candidate's answer. "
        "Return ONLY valid JSON: {\"score\": <float 1-10>, \"feedback\": \"<2-3 sentences of specific, constructive feedback>\"}. "
        "Score 1-10 where 10 is a perfect answer. Be honest and specific."
    )
    user = (
        f"Role being interviewed for: {role.replace('_', ' ').title()}\n"
        f"Question asked: {question}\n"
        f"Candidate's answer: {transcript}\n\n"
        "Evaluate the answer quality. Give a score from 1-10 and 2-3 sentences of specific, actionable feedback."
    )

    await _rate_limiter.acquire()

    def _call():
        return client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
            temperature=0.3,
            max_tokens=256,
            response_format={"type": "json_object"},
        )

    try:
        resp = await asyncio.to_thread(_call)
    except Exception:
        logger.exception("evaluate_answer Groq call failed")
        return {"score": 5.0, "feedback": "Unable to evaluate — AI service unavailable."}

    raw = resp.choices[0].message.content or "{}"
    try:
        data = json.loads(raw)
        return {"score": float(data.get("score", 5.0)), "feedback": str(data.get("feedback", ""))}
    except Exception:
        return {"score": 5.0, "feedback": "Unable to parse evaluation."}


# ── Groq: generate overall report ─────────────────────────────────────────────

async def generate_overall_report(questions_answers: list, role: str) -> dict:
    from services.groq_service import _get_groq_client, _rate_limiter

    client = _get_groq_client()
    if client is None:
        return _fallback_report()

    qa_text = "\n\n".join(
        f"Q{i+1}: {qa['question']}\nAnswer: {qa['answer_transcript']}\nScore: {qa['score']}/10\nFeedback: {qa['feedback']}"
        for i, qa in enumerate(questions_answers)
    )

    system = (
        "You are a senior hiring manager writing a post-interview assessment. "
        'Return ONLY valid JSON: {"overall_band": <float 1-6>, "overall_feedback": "<3-4 sentences>", '
        '"advice_cards": [{"impact": "HIGH|MED|LOW", "text": "<actionable tip>"}]}. '
        "Generate exactly 4 advice cards. overall_band maps: 1-2=poor, 3=below average, 4=average, 5=good, 6=excellent."
    )
    user = (
        f"Role: {role.replace('_', ' ').title()}\n\n"
        f"Full interview transcript:\n{qa_text}\n\n"
        "Provide an overall assessment with a band score, overall feedback, and 4 actionable improvement tips."
    )

    await _rate_limiter.acquire()

    def _call():
        return client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
            temperature=0.3,
            max_tokens=600,
            response_format={"type": "json_object"},
        )

    resp = await asyncio.to_thread(_call)
    raw = resp.choices[0].message.content or "{}"
    try:
        data = json.loads(raw)
        return {
            "overall_band": float(data.get("overall_band", 3.0)),
            "overall_feedback": str(data.get("overall_feedback", "")),
            "advice_cards": data.get("advice_cards", []),
        }
    except Exception:
        return _fallback_report()


def _fallback_report() -> dict:
    return {
        "overall_band": 3.0,
        "overall_feedback": "Your interview has been recorded. Please try again to receive AI-powered feedback.",
        "advice_cards": [
            {"impact": "HIGH", "text": "Structure your answers using the STAR method: Situation, Task, Action, Result."},
            {"impact": "HIGH", "text": "Quantify your achievements where possible — numbers make answers memorable."},
            {"impact": "MED", "text": "Research the company and role thoroughly before the real interview."},
            {"impact": "LOW", "text": "Practise speaking at a measured pace — avoid rushing when nervous."},
        ],
    }
