'use client'
import { useCallback, useEffect, useState } from 'react'

export interface MediaDeviceOption {
  deviceId: string
  label: string
}

const CAMERA_KEY = 'pc.cameraId'
const MIC_KEY = 'pc.micId'

// Base constraints — mirror the previously hardcoded values across the app.
const BASE_VIDEO: MediaTrackConstraints = { width: { ideal: 1280 }, height: { ideal: 720 } }
const BASE_AUDIO: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: false,
}

function readStored(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStored(key: string, value: string | null) {
  if (typeof window === 'undefined') return
  try {
    if (value) window.localStorage.setItem(key, value)
    else window.localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

/**
 * Enumerates available cameras/microphones and persists the user's selection in
 * localStorage so it is shared across SessionPrep → RecordingInterface → interview.
 * Exposes constraint builders that merge the selected deviceId into the base
 * constraints; pass these straight into getUserMedia.
 */
export function useMediaDevices() {
  const [cameras, setCameras] = useState<MediaDeviceOption[]>([])
  const [microphones, setMicrophones] = useState<MediaDeviceOption[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(() => readStored(CAMERA_KEY))
  const [selectedMicId, setSelectedMicId] = useState<string | null>(() => readStored(MIC_KEY))

  const refresh = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const toOption = (d: MediaDeviceInfo, fallback: string): MediaDeviceOption => ({
        deviceId: d.deviceId,
        label: d.label || fallback,
      })
      const cams = devices
        .filter((d) => d.kind === 'videoinput')
        .map((d, i) => toOption(d, `Camera ${i + 1}`))
      const mics = devices
        .filter((d) => d.kind === 'audioinput')
        .map((d, i) => toOption(d, `Microphone ${i + 1}`))
      setCameras(cams)
      setMicrophones(mics)
      // Drop a stored selection that no longer exists (device unplugged).
      setSelectedCameraId((prev) => (prev && !cams.some((c) => c.deviceId === prev) ? null : prev))
      setSelectedMicId((prev) => (prev && !mics.some((m) => m.deviceId === prev) ? null : prev))
    } catch {
      /* enumeration not permitted yet — labels populate after getUserMedia */
    }
  }, [])

  useEffect(() => {
    refresh()
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) return
    const handler = () => refresh()
    navigator.mediaDevices.addEventListener?.('devicechange', handler)
    return () => navigator.mediaDevices.removeEventListener?.('devicechange', handler)
  }, [refresh])

  const selectCamera = useCallback((id: string | null) => {
    setSelectedCameraId(id)
    writeStored(CAMERA_KEY, id)
  }, [])

  const selectMic = useCallback((id: string | null) => {
    setSelectedMicId(id)
    writeStored(MIC_KEY, id)
  }, [])

  // Clears a stored id after an OverconstrainedError so the next attempt uses the default.
  const clearCamera = useCallback(() => selectCamera(null), [selectCamera])
  const clearMic = useCallback(() => selectMic(null), [selectMic])

  const buildVideoConstraints = useCallback(
    (extra?: MediaTrackConstraints): MediaTrackConstraints => ({
      ...BASE_VIDEO,
      ...extra,
      ...(selectedCameraId ? { deviceId: { exact: selectedCameraId } } : {}),
    }),
    [selectedCameraId],
  )

  const buildAudioConstraints = useCallback(
    (extra?: MediaTrackConstraints): MediaTrackConstraints => ({
      ...BASE_AUDIO,
      ...extra,
      ...(selectedMicId ? { deviceId: { exact: selectedMicId } } : {}),
    }),
    [selectedMicId],
  )

  return {
    cameras,
    microphones,
    selectedCameraId,
    selectedMicId,
    selectCamera,
    selectMic,
    clearCamera,
    clearMic,
    refresh,
    buildVideoConstraints,
    buildAudioConstraints,
  }
}
