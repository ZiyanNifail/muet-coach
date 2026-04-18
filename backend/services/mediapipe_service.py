"""
MediaPipe service — T2.14 (Face Landmark) and T2.15 (Pose).

Uses MediaPipe Tasks API (0.10.x+). Models are downloaded on first use to
backend/models/ and reused on subsequent calls.

Analyses video frames to compute:
  - eye_contact_pct: proportion of frames where iris gaze is directed at camera
  - posture_score: 100 - head_tilt*2 - shoulder_diff/5 (clamped 0–100)
  - confidence_flags: { face_ok, pose_ok }
"""
import math
import os
import urllib.request
import logging
from typing import Optional

logger = logging.getLogger(__name__)

_PROCESS_WIDTH = 640
_PROCESS_HEIGHT = 360

_MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
_FACE_MODEL_PATH = os.path.join(_MODELS_DIR, "face_landmarker.task")
_POSE_MODEL_PATH = os.path.join(_MODELS_DIR, "pose_landmarker_lite.task")
_FACE_MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
_POSE_MODEL_URL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task"


def _ensure_model(path: str, url: str) -> bool:
    """Download model file if not present. Returns True if available."""
    if os.path.exists(path):
        return True
    os.makedirs(os.path.dirname(path), exist_ok=True)
    try:
        logger.info("Downloading MediaPipe model from %s ...", url)
        tmp = path + ".tmp"
        urllib.request.urlretrieve(url, tmp)
        os.replace(tmp, path)
        logger.info("Model saved to %s", path)
        return True
    except Exception as exc:
        logger.warning("Could not download MediaPipe model: %s", exc)
        return False


def _iris_gaze_on_camera(lm: list) -> bool:
    """
    Estimate gaze direction using iris landmark positions.

    Tasks API: lm is a plain list of NormalizedLandmark (same indices as FaceMesh).
    Iris centres:   left=468, right=473
    Eye corners:    left outer=33, inner=133 / right outer=263, inner=362

    A normalised iris-X ratio in [0.35, 0.65] means looking at camera.
    Falls back to nose-centering heuristic when iris landmarks are absent.
    """
    if len(lm) >= 478:
        def _ratio(iris_idx: int, outer_idx: int, inner_idx: int) -> float:
            iris_x  = lm[iris_idx].x
            outer_x = lm[outer_idx].x
            inner_x = lm[inner_idx].x
            span = inner_x - outer_x
            if abs(span) < 1e-6:
                return 0.5
            return (iris_x - outer_x) / span

        left_ratio  = _ratio(468, 33, 133)
        right_ratio = _ratio(473, 263, 362)
        return 0.35 <= left_ratio <= 0.65 and 0.35 <= right_ratio <= 0.65

    if len(lm) >= 10:
        nose_x      = lm[1].x
        left_eye_x  = lm[33].x
        right_eye_x = lm[263].x
        eye_mid_x   = (left_eye_x + right_eye_x) / 2
        return abs(nose_x - eye_mid_x) < 0.15

    return False


def _posture_score(lm: list) -> float:
    """
    Score = 100 - head_tilt*2 - shoulder_diff/5, clamped 0–100.
    Tasks API: lm is a plain list of NormalizedLandmark.
    Nose=0, left_shoulder=11, right_shoulder=12.
    """
    nose = lm[0]
    ls   = lm[11]
    rs   = lm[12]

    mid_shoulder_x = (ls.x + rs.x) / 2
    mid_shoulder_y = (ls.y + rs.y) / 2

    dx = nose.x - mid_shoulder_x
    dy = nose.y - mid_shoulder_y
    head_tilt     = abs(math.degrees(math.atan2(dx, -dy)))
    shoulder_diff = abs(ls.y - rs.y) * 100

    score = 100 - head_tilt * 2 - shoulder_diff / 5
    return round(max(0.0, min(100.0, score)), 1)


async def analyse_video(video_path: str) -> dict:
    """
    Analyse video frames at 3 FPS for eye contact and posture.
    Uses MediaPipe Tasks API. Falls back gracefully if models or packages unavailable.

    Returns:
      { eye_contact_pct, posture_score, eye_contact_timeline,
        confidence_flags: { face_ok, pose_ok } }
    """
    _EMPTY = {
        "eye_contact_pct": None,
        "posture_score": None,
        "eye_contact_timeline": None,
        "confidence_flags": {"face_ok": False, "pose_ok": False},
    }

    try:
        import cv2
        import mediapipe as mp
        from mediapipe.tasks import python as mp_python
        from mediapipe.tasks.python import vision as mp_vision
    except ImportError:
        return _EMPTY

    face_model_ok = _ensure_model(_FACE_MODEL_PATH, _FACE_MODEL_URL)
    pose_model_ok = _ensure_model(_POSE_MODEL_PATH, _POSE_MODEL_URL)

    if not face_model_ok and not pose_model_ok:
        logger.warning("No MediaPipe models available — skipping visual analysis")
        return _EMPTY

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return _EMPTY

    total_frames  = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 1
    native_fps    = cap.get(cv2.CAP_PROP_FPS) or 30.0
    duration_secs = total_frames / native_fps

    if duration_secs < 120:
        target_fps = 3.0
    elif duration_secs < 300:
        target_fps = 2.0
    else:
        target_fps = 1.5
    n_samples        = max(10, min(120, int(duration_secs * target_fps)))
    sample_positions = [int(i * total_frames / n_samples) for i in range(n_samples)]

    eye_contact_frames = 0
    posture_scores: list[float] = []
    face_detected  = 0
    pose_detected  = 0
    total_sampled  = 0

    CHUNK_SECS = 10
    chunk_gaze: dict[int, list[bool]] = {}

    face_lm = None
    pose_lm = None
    try:
        if face_model_ok:
            face_options = mp_vision.FaceLandmarkerOptions(
                base_options=mp_python.BaseOptions(model_asset_path=_FACE_MODEL_PATH),
                running_mode=mp_vision.RunningMode.IMAGE,
                num_faces=1,
                min_face_detection_confidence=0.5,
                min_face_presence_confidence=0.5,
                output_face_blendshapes=False,
                output_facial_transformation_matrixes=False,
            )
            face_lm = mp_vision.FaceLandmarker.create_from_options(face_options)

        if pose_model_ok:
            pose_options = mp_vision.PoseLandmarkerOptions(
                base_options=mp_python.BaseOptions(model_asset_path=_POSE_MODEL_PATH),
                running_mode=mp_vision.RunningMode.IMAGE,
                min_pose_detection_confidence=0.5,
                min_pose_presence_confidence=0.5,
            )
            pose_lm = mp_vision.PoseLandmarker.create_from_options(pose_options)

        for frame_pos in sample_positions:
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_pos)
            ret, frame = cap.read()
            if not ret:
                continue

            total_sampled += 1
            t_sec     = frame_pos / native_fps
            chunk_key = int(t_sec / CHUNK_SECS)

            frame_small = cv2.resize(frame, (_PROCESS_WIDTH, _PROCESS_HEIGHT))
            rgb         = cv2.cvtColor(frame_small, cv2.COLOR_BGR2RGB)
            mp_image    = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

            eye_on = False
            if face_lm is not None:
                face_result = face_lm.detect(mp_image)
                if face_result.face_landmarks:
                    face_detected += 1
                    lm     = face_result.face_landmarks[0]
                    eye_on = _iris_gaze_on_camera(lm)
                    if eye_on:
                        eye_contact_frames += 1
            chunk_gaze.setdefault(chunk_key, []).append(eye_on)

            if pose_lm is not None:
                pose_result = pose_lm.detect(mp_image)
                if pose_result.pose_landmarks:
                    pose_detected += 1
                    posture_scores.append(_posture_score(pose_result.pose_landmarks[0]))

    finally:
        cap.release()
        if face_lm is not None:
            face_lm.close()
        if pose_lm is not None:
            pose_lm.close()

    eye_contact_timeline = [
        {"t": chunk_key * CHUNK_SECS, "value": round(sum(v) / len(v) * 100, 1)}
        for chunk_key, v in sorted(chunk_gaze.items())
        if v
    ]

    if total_sampled == 0:
        return _EMPTY

    eye_pct      = round((eye_contact_frames / total_sampled) * 100, 1) if face_detected > 0 else None
    avg_posture  = round(sum(posture_scores) / len(posture_scores), 1) if posture_scores else None

    return {
        "eye_contact_pct":      eye_pct,
        "posture_score":        avg_posture,
        "eye_contact_timeline": eye_contact_timeline if len(eye_contact_timeline) > 1 else None,
        "confidence_flags": {
            "face_ok": face_detected > 0,
            "pose_ok": pose_detected > 0,
        },
    }
