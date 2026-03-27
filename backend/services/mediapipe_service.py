"""
MediaPipe service — T2.14 (Face Mesh) and T2.15 (Pose).

Analyses video frames to compute:
  - eye_contact_pct: proportion of frames where nose X is within centre ±15% of frame width
  - posture_score: 100 - head_tilt*2 - shoulder_diff/5 (clamped 0–100)
  - confidence_flags: { face_ok, pose_ok }

Requires: mediapipe, opencv-python-headless
"""
import math
from typing import Optional


def _nose_in_center(landmarks, img_w: int, threshold: float = 0.15) -> bool:
    """Nose X within centre ±threshold of frame width (nose landmark index 1)."""
    nose_x = landmarks.landmark[1].x  # normalised 0–1
    return abs(nose_x - 0.5) <= threshold


def _posture_score(pose_landmarks) -> float:
    """
    Score = 100 - head_tilt*2 - shoulder_diff/5, clamped 0–100.
    head_tilt   = abs angle of nose (0) relative to mid-hip (23/24)
    shoulder_diff = abs(left_shoulder.y - right_shoulder.y) * 100 (pct of frame)
    """
    lm = pose_landmarks.landmark
    # Nose = 0, left_shoulder = 11, right_shoulder = 12
    nose = lm[0]
    ls = lm[11]
    rs = lm[12]

    mid_shoulder_x = (ls.x + rs.x) / 2
    mid_shoulder_y = (ls.y + rs.y) / 2

    # Head tilt: angle of nose relative to shoulder midpoint (degrees)
    dx = nose.x - mid_shoulder_x
    dy = nose.y - mid_shoulder_y
    head_tilt = abs(math.degrees(math.atan2(dx, -dy)))  # 0° = perfectly upright

    # Shoulder height difference (as % of frame)
    shoulder_diff = abs(ls.y - rs.y) * 100

    score = 100 - head_tilt * 2 - shoulder_diff / 5
    return round(max(0.0, min(100.0, score)), 1)


async def analyse_video(video_path: str) -> dict:
    """
    Analyse video frames at 5 FPS for eye contact and posture.
    Falls back gracefully if mediapipe or opencv is not installed.

    Returns:
      { eye_contact_pct, posture_score, confidence_flags: { face_ok, pose_ok } }
    """
    try:
        import cv2
        import mediapipe as mp
    except ImportError:
        return {
            "eye_contact_pct": None,
            "posture_score": None,
            "confidence_flags": {"face_ok": False, "pose_ok": False},
        }

    mp_face = mp.solutions.face_mesh
    mp_pose = mp.solutions.pose

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return {
            "eye_contact_pct": None,
            "posture_score": None,
            "confidence_flags": {"face_ok": False, "pose_ok": False},
        }

    native_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    sample_interval = max(1, int(round(native_fps / 5)))  # sample at 5 FPS

    eye_contact_frames = 0
    posture_scores: list[float] = []
    face_detected = 0
    pose_detected = 0
    total_sampled = 0
    frame_idx = 0

    with mp_face.FaceMesh(
        static_image_mode=False,
        max_num_faces=1,
        refine_landmarks=False,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    ) as face_mesh, mp_pose.Pose(
        static_image_mode=False,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    ) as pose:
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            if frame_idx % sample_interval != 0:
                frame_idx += 1
                continue

            total_sampled += 1
            img_h, img_w = frame.shape[:2]
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            # Face Mesh — eye contact
            face_results = face_mesh.process(rgb)
            if face_results.multi_face_landmarks:
                face_detected += 1
                fl = face_results.multi_face_landmarks[0]
                if _nose_in_center(fl, img_w):
                    eye_contact_frames += 1

            # Pose — posture
            pose_results = pose.process(rgb)
            if pose_results.pose_landmarks:
                pose_detected += 1
                posture_scores.append(_posture_score(pose_results.pose_landmarks))

            frame_idx += 1

    cap.release()

    if total_sampled == 0:
        return {
            "eye_contact_pct": None,
            "posture_score": None,
            "confidence_flags": {"face_ok": False, "pose_ok": False},
        }

    eye_pct = round((eye_contact_frames / total_sampled) * 100, 1) if face_detected > 0 else None
    avg_posture = round(sum(posture_scores) / len(posture_scores), 1) if posture_scores else None

    return {
        "eye_contact_pct": eye_pct,
        "posture_score": avg_posture,
        "confidence_flags": {
            "face_ok": face_detected > 0,
            "pose_ok": pose_detected > 0,
        },
    }
