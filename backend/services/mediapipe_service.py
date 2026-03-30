"""
MediaPipe service — T2.14 (Face Mesh) and T2.15 (Pose).

Analyses video frames to compute:
  - eye_contact_pct: proportion of frames where iris gaze is directed at camera
  - posture_score: 100 - head_tilt*2 - shoulder_diff/5 (clamped 0–100)
  - confidence_flags: { face_ok, pose_ok }

Requires: mediapipe, opencv-python-headless
"""
import math
from typing import Optional


def _iris_gaze_on_camera(landmarks) -> bool:
    """
    Estimate gaze direction using iris landmark positions (requires refine_landmarks=True).

    Iris centres:      left=468, right=473
    Eye corners (inner/outer):
      Left eye:  inner=133, outer=33
      Right eye: inner=362, outer=263

    Computes the normalised iris-X ratio for each eye:
      ratio = (iris_x - corner_outer_x) / (corner_inner_x - corner_outer_x)
    A ratio in [0.35, 0.65] means the iris is roughly centred → looking at camera.
    Both eyes must pass for the frame to count as eye-contact.
    Falls back to True (non-penalising) when iris landmarks are absent.
    """
    lm = landmarks.landmark
    if len(lm) < 478:
        return True  # iris landmarks not available — don't penalise

    def _ratio(iris_idx: int, outer_idx: int, inner_idx: int) -> float:
        iris_x = lm[iris_idx].x
        outer_x = lm[outer_idx].x
        inner_x = lm[inner_idx].x
        span = inner_x - outer_x
        if abs(span) < 1e-6:
            return 0.5
        return (iris_x - outer_x) / span

    left_ratio = _ratio(468, 33, 133)
    right_ratio = _ratio(473, 263, 362)
    return 0.35 <= left_ratio <= 0.65 and 0.35 <= right_ratio <= 0.65


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
    Analyse video frames at 3 FPS for eye contact and posture.
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

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 1
    native_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    duration_secs = total_frames / native_fps

    # Sample at 3 FPS, capped at 120 frames — seek directly to avoid decoding every frame
    target_fps = 3.0
    n_samples = max(10, min(120, int(duration_secs * target_fps)))
    sample_positions = [int(i * total_frames / n_samples) for i in range(n_samples)]

    eye_contact_frames = 0
    posture_scores: list[float] = []
    face_detected = 0
    pose_detected = 0
    total_sampled = 0

    with mp_face.FaceMesh(
        static_image_mode=True,   # static_image_mode=True is faster when seeking
        max_num_faces=1,
        refine_landmarks=True,    # enables 478 landmarks including iris (indices 468–477)
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    ) as face_mesh, mp_pose.Pose(
        static_image_mode=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    ) as pose:
        for frame_pos in sample_positions:
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_pos)
            ret, frame = cap.read()
            if not ret:
                continue

            total_sampled += 1
            img_h, img_w = frame.shape[:2]
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            # Face Mesh — eye contact via iris gaze
            face_results = face_mesh.process(rgb)
            if face_results.multi_face_landmarks:
                face_detected += 1
                fl = face_results.multi_face_landmarks[0]
                if _iris_gaze_on_camera(fl):
                    eye_contact_frames += 1

            # Pose — posture
            pose_results = pose.process(rgb)
            if pose_results.pose_landmarks:
                pose_detected += 1
                posture_scores.append(_posture_score(pose_results.pose_landmarks))

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
