"""
Voice dynamics service — T2.12A.

Analyses pitch and energy from a WAV file using librosa.
Lazy-loads librosa; returns Nones gracefully if not installed or on any error.
"""
import logging

logger = logging.getLogger(__name__)


def analyse_voice_dynamics(wav_path: str) -> dict:
    """
    Analyse pitch and energy of a WAV file.

    Returns:
        {
            "pitch_mean_hz": float | None,  — mean Hz of voiced frames only
            "energy_mean_db": float | None, — mean RMS energy in dB
        }
    Never raises — all errors are caught and logged.
    """
    try:
        import librosa  # lazy-load
        import numpy as np

        y, sr = librosa.load(wav_path, sr=None, mono=True)

        # ── Pitch via pyin ────────────────────────────────────────────────────
        pitch_mean_hz = None
        try:
            f0, voiced_flag, _ = librosa.pyin(
                y,
                fmin=80.0,
                fmax=400.0,
                sr=sr,
            )
            # Average voiced frames only (voiced_flag == True, f0 > 0)
            voiced_f0 = f0[voiced_flag & (f0 > 0)] if f0 is not None else np.array([])
            if len(voiced_f0) > 0:
                pitch_mean_hz = float(round(float(np.mean(voiced_f0)), 2))
        except Exception as exc:
            logger.warning("Pitch analysis failed: %s", exc)

        # ── Energy via RMS ────────────────────────────────────────────────────
        energy_mean_db = None
        try:
            rms = librosa.feature.rms(y=y)
            rms_mean = float(np.mean(rms))
            if rms_mean > 0:
                db = librosa.amplitude_to_db(np.array([rms_mean]))[0]
                energy_mean_db = float(round(float(db), 2))
        except Exception as exc:
            logger.warning("Energy analysis failed: %s", exc)

        return {"pitch_mean_hz": pitch_mean_hz, "energy_mean_db": energy_mean_db}

    except ImportError:
        logger.warning("librosa not installed — voice dynamics unavailable. Install with: pip install librosa")
        return {"pitch_mean_hz": None, "energy_mean_db": None}
    except Exception as exc:
        logger.warning("Voice dynamics analysis failed for %s: %s", wav_path, exc)
        return {"pitch_mean_hz": None, "energy_mean_db": None}
