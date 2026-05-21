"""
Real-time gaze check endpoint — T3.09 (guided mode eye contact feedback).

Accepts a base64-encoded JPEG frame from the browser and returns whether
the speaker's iris gaze is directed at the camera using MediaPipe Tasks API.
No authentication required — frame data is ephemeral and not stored.
"""
import base64
import logging
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from services.mediapipe_service import (
    _iris_gaze_on_camera, _ensure_model, _FACE_MODEL_PATH, _FACE_MODEL_URL,
)

logger = logging.getLogger(__name__)
router = APIRouter()

_face_landmarker = None


def _get_landmarker():
    global _face_landmarker
    if _face_landmarker is not None:
        return _face_landmarker
    try:
        import mediapipe as mp
        from mediapipe.tasks import python as mp_python
        from mediapipe.tasks.python import vision as mp_vision

        if not _ensure_model(_FACE_MODEL_PATH, _FACE_MODEL_URL):
            return None

        opts = mp_vision.FaceLandmarkerOptions(
            base_options=mp_python.BaseOptions(model_asset_path=_FACE_MODEL_PATH),
            running_mode=mp_vision.RunningMode.IMAGE,
            num_faces=1,
            min_face_detection_confidence=0.3,
            min_face_presence_confidence=0.3,
            output_face_blendshapes=False,
            output_facial_transformation_matrixes=False,
        )
        _face_landmarker = mp_vision.FaceLandmarker.create_from_options(opts)
        logger.info("Gaze landmarker ready")
        return _face_landmarker
    except Exception as exc:
        logger.warning("Failed to create gaze landmarker: %s", exc)
        return None


# Eye/brow outline indices (478-point FaceMesh with iris refinement)
_LEFT_EYE  = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]
_RIGHT_EYE = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398]
_LEFT_BROW = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46]
_RIGHT_BROW = [300, 293, 334, 296, 336, 285, 295, 282, 283, 276]


class EyePoints(BaseModel):
    left: list[dict]
    right: list[dict]
    left_brow: list[dict]
    right_brow: list[dict]


class GazeCheckRequest(BaseModel):
    image_base64: str


class GazeCheckResponse(BaseModel):
    on_camera: bool
    face_detected: bool
    eye_points: Optional[EyePoints] = None


@router.post("/check", response_model=GazeCheckResponse)
async def gaze_check(req: GazeCheckRequest) -> GazeCheckResponse:
    """
    Decode JPEG frame, run MediaPipe Tasks FaceLandmarker, return gaze status
    and eye landmark coordinates for the browser overlay.
    """
    try:
        import cv2
        import numpy as np
        import mediapipe as mp
    except ImportError:
        return GazeCheckResponse(on_camera=True, face_detected=False)

    try:
        b64 = req.image_base64
        if "," in b64:
            b64 = b64.split(",", 1)[1]

        img_bytes = base64.b64decode(b64)
        nparr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            return GazeCheckResponse(on_camera=True, face_detected=False)

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

        landmarker = _get_landmarker()
        if landmarker is None:
            return GazeCheckResponse(on_camera=True, face_detected=False)

        result = landmarker.detect(mp_image)
        if not result.face_landmarks:
            return GazeCheckResponse(on_camera=False, face_detected=False)

        lm = result.face_landmarks[0]
        on_camera = _iris_gaze_on_camera(lm)

        def pts(indices: list[int]) -> list[dict]:
            return [{"x": lm[i].x, "y": lm[i].y} for i in indices if i < len(lm)]

        eye_points = EyePoints(
            left=pts(_LEFT_EYE),
            right=pts(_RIGHT_EYE),
            left_brow=pts(_LEFT_BROW),
            right_brow=pts(_RIGHT_BROW),
        )
        return GazeCheckResponse(on_camera=on_camera, face_detected=True, eye_points=eye_points)

    except Exception as exc:
        logger.warning("gaze_check failed: %s", exc)
        return GazeCheckResponse(on_camera=True, face_detected=False)
