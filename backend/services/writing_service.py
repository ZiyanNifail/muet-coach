import json
import asyncio
from services.groq_service import _get_groq_client, _rate_limiter

SYSTEM_PROMPT = """You are a MUET (Malaysian University English Test) Writing examiner.
Assess TWO writing tasks using official MUET Band 1–6 criteria.

TASK 1 — Data Description (150–200 words):
- Content: accuracy, coverage of key trends and data points
- Language: grammar accuracy, vocabulary range
- Organisation: logical sequencing, appropriate discourse markers

TASK 2 — Argumentative Essay (350+ words):
- Content: relevance, depth of argument, quality of examples
- Language: accuracy, range, lexical variety, register
- Organisation: clear introduction/body/conclusion, cohesion, discourse markers

BAND DESCRIPTORS (apply to each task):
Band 6: Exceptional — near-flawless, sophisticated language, fully developed ideas
Band 5: Good — minor errors, well-organised, ideas clearly developed
Band 4: Satisfactory — some errors, reasonably organised, ideas mostly clear
Band 3: Adequate — frequent errors, basic organisation, ideas partially developed
Band 2: Limited — many errors impede meaning, poor organisation
Band 1: Very limited — severe errors, incomprehensible

Return ONLY valid JSON:
{
  "task1_band": <integer 1-6>,
  "task2_band": <integer 1-6>,
  "overall_band": <integer 1-6>,
  "advice_cards": [
    {"criterion": "content|language|organisation", "task": 1, "impact": "HIGH|MED|LOW", "text": "..."},
    {"criterion": "content|language|organisation", "task": 1, "impact": "HIGH|MED|LOW", "text": "..."},
    {"criterion": "content|language|organisation", "task": 1, "impact": "HIGH|MED|LOW", "text": "..."},
    {"criterion": "content|language|organisation", "task": 2, "impact": "HIGH|MED|LOW", "text": "..."},
    {"criterion": "content|language|organisation", "task": 2, "impact": "HIGH|MED|LOW", "text": "..."},
    {"criterion": "content|language|organisation", "task": 2, "impact": "HIGH|MED|LOW", "text": "..."}
  ]
}
Generate exactly 6 advice cards: 3 for Task 1 and 3 for Task 2, one per criterion."""


async def evaluate_writing(
    task1_prompt: str,
    task1_response: str,
    task1_word_count: int,
    task2_topic: str,
    task2_response: str,
    task2_word_count: int,
) -> dict:
    user_content = (
        f"=== TASK 1 ===\nPrompt: {task1_prompt}\nWord count: {task1_word_count}\n\n"
        f"Student response:\n{task1_response}\n\n"
        f"=== TASK 2 ===\nStatement: {task2_topic}\nWord count: {task2_word_count}\n\n"
        f"Student response:\n{task2_response}"
    )

    client = _get_groq_client()
    if client is None:
        raise RuntimeError("Groq client unavailable — check GROQ_API_KEY in backend/.env")

    await _rate_limiter.acquire()

    def _call():
        return client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            temperature=0.2,
            max_tokens=1024,
            response_format={"type": "json_object"},
        )

    resp = await asyncio.to_thread(_call)
    raw = resp.choices[0].message.content or "{}"
    data = json.loads(raw)

    task1_band = int(round(max(1.0, min(6.0, float(data.get("task1_band", 3))))))
    task2_band = int(round(max(1.0, min(6.0, float(data.get("task2_band", 3))))))
    overall_band = int(round((task1_band + task2_band * 2) / 3))

    return {
        "task1_band": task1_band,
        "task2_band": task2_band,
        "overall_band": overall_band,
        "advice_cards": data.get("advice_cards", []),
    }
