"""
Video preprocessing — T2.09.

Extracts frames at 5 FPS, resized to 480p, for MediaPipe analysis.
Requires: opencv-python-headless.
"""
import os
from typing import Generator


def extract_frames(
    video_path: str,
    out_dir: str,
    fps: int = 5,
    max_dim: int = 854,
) -> list[str]:
    """
    Extract frames at `fps` frames-per-second from video.
    Frames are resized so the longer edge ≤ max_dim (≈480p landscape).
    Returns ordered list of PNG file paths.
    Raises ImportError if opencv is not installed.
    """
    try:
        import cv2
    except ImportError as exc:
        raise ImportError("opencv-python-headless is required for video analysis") from exc

    os.makedirs(out_dir, exist_ok=True)
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video: {video_path}")

    native_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    frame_interval = max(1, int(round(native_fps / fps)))

    paths: list[str] = []
    frame_idx = 0
    saved_idx = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if frame_idx % frame_interval == 0:
            # Resize preserving aspect ratio
            h, w = frame.shape[:2]
            if max(h, w) > max_dim:
                scale = max_dim / max(h, w)
                frame = cv2.resize(
                    frame,
                    (int(w * scale), int(h * scale)),
                    interpolation=cv2.INTER_AREA,
                )
            path = os.path.join(out_dir, f"frame_{saved_idx:06d}.png")
            cv2.imwrite(path, frame)
            paths.append(path)
            saved_idx += 1
        frame_idx += 1

    cap.release()
    return paths
