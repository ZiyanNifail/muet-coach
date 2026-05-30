#!/usr/bin/env python3
"""Pre-generate all interview question audio files using ElevenLabs TTS.

Run ONCE from the backend directory (with venv activated):
    python scripts/generate_interview_audio.py

Output: frontend/public/interview-audio/*.mp3
Naming:
    icebreaker_0.mp3, icebreaker_1.mp3
    data_analyst_0.mp3 … data_analyst_4.mp3
    data_science_0.mp3 … data_science_4.mp3
    software_engineer_0.mp3 … software_engineer_4.mp3
    marketing_0.mp3 … marketing_4.mp3
"""

import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from dotenv import load_dotenv
load_dotenv(BACKEND_DIR / ".env")

from services.interview_service import ICEBREAKERS, QUESTION_BANK

OUTPUT_DIR = BACKEND_DIR.parent / "frontend" / "public" / "interview-audio"


def synthesize(text: str, voice_id: str, client) -> bytes:
    chunks = client.text_to_speech.convert(
        voice_id=voice_id,
        text=text,
        model_id="eleven_flash_v2_5",
        output_format="mp3_22050_32",
    )
    return b"".join(chunks)


def main():
    api_key = os.getenv("ELEVENLABS_API_KEY", "")
    voice_id = os.getenv("ELEVENLABS_VOICE_ID", "EXAVITQu4vr4xnSDxMaL")

    if not api_key:
        print("ERROR: ELEVENLABS_API_KEY not set in backend/.env")
        sys.exit(1)

    try:
        from elevenlabs.client import ElevenLabs
    except ImportError:
        print("ERROR: elevenlabs not installed. Run: pip install elevenlabs")
        sys.exit(1)

    client = ElevenLabs(api_key=api_key)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Output: {OUTPUT_DIR}\n")

    generated = 0
    skipped = 0

    for i, text in enumerate(ICEBREAKERS):
        filename = OUTPUT_DIR / f"icebreaker_{i}.mp3"
        if filename.exists():
            print(f"  SKIP  icebreaker_{i}.mp3 (already exists)")
            skipped += 1
            continue
        print(f"  GEN   icebreaker_{i}.mp3 …", end="", flush=True)
        audio = synthesize(text, voice_id, client)
        filename.write_bytes(audio)
        print(f" {len(audio) // 1024}KB")
        generated += 1

    for role, questions in QUESTION_BANK.items():
        for i, text in enumerate(questions):
            filename = OUTPUT_DIR / f"{role}_{i}.mp3"
            if filename.exists():
                print(f"  SKIP  {role}_{i}.mp3 (already exists)")
                skipped += 1
                continue
            print(f"  GEN   {role}_{i}.mp3 …", end="", flush=True)
            audio = synthesize(text, voice_id, client)
            filename.write_bytes(audio)
            print(f" {len(audio) // 1024}KB")
            generated += 1

    total = 2 + sum(len(q) for q in QUESTION_BANK.values())
    print(f"\nDone — {generated} generated, {skipped} skipped ({total} total files)")


if __name__ == "__main__":
    main()
