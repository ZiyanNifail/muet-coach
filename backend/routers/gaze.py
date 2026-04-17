"""
Real-time gaze check endpoint — T3.09 (guided mode eye contact feedback).

Accepts a base64-encoded JPEG frame from the browser and returns whether
the speaker's iris gaze is directed at the camera using MediaPipe FaceMesh.
No authentication required — frame data is ephemeral and not stored.
"""
import base64
import logging

from fastapi import APIRouter
from pydantic import BaseModel

from services.mediapipe_service import _iris_gaze_on_camera

logger = logging.getLogger(__name__)

router = APIRouter()


class GazeCheckRequest(BaseModel):
    image_base64: str  # base64-encoded JPEG (no data-URI prefix)


class GazeCheckResponse(BaseModel):
    on_camera: bool
    face_detected: bool


@router.post("/check", response_model=GazeCheckResponse)
async def gaze_check(req: GazeCheckRequest) -> GazeCheckResponse:
    """
    Decode the JPEG frame, run MediaPipe FaceMesh, and return gaze status.
    Falls back to on_camera=True / face_detected=False if mediapipe or
    opencv are not installed (so guided mode degrades gracefully).
    """
    try:
        import cv2
        import mediapipe as mp
        import numpy as np
    except ImportError:
        return GazeCheckResponse(on_camera=True, face_detected=False)

    try:
        # Strip data-URI prefix if the client accidentally includes it
        b64 = req.image_base64
        if "," in b64:
            b64 = b64.split(",", 1)[1]

        img_bytes = base64.b64decode(b64)
        nparr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            return GazeCheckResponse(on_camera=True, face_detected=False)

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        mp_face = mp.solutions.face_mesh
        with mp_face.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
        ) as face_mesh:
            results = face_mesh.process(rgb)
            if not results.multi_face_landmarks:
                return GazeCheckResponse(on_camera=False, face_detected=False)

            on_camera = _iris_gaze_on_camera(results.multi_face_landmarks[0])
            return GazeCheckResponse(on_camera=on_camera, face_detected=True)

    except Exception as exc:
        logger.warning("gaze_check failed: %s", exc)
        return GazeCheckResponse(on_camera=True, face_detected=False)
