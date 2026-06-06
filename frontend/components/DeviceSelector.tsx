'use client'
import { Camera, Mic } from 'lucide-react'
import type { MediaDeviceOption } from '@/lib/useMediaDevices'

interface DeviceSelectorProps {
  cameras?: MediaDeviceOption[]
  microphones?: MediaDeviceOption[]
  selectedCameraId?: string | null
  selectedMicId?: string | null
  onSelectCamera?: (id: string | null) => void
  onSelectMic?: (id: string | null) => void
  showCamera?: boolean
  showMic?: boolean
  disabled?: boolean
}

const selectStyle: React.CSSProperties = {
  background: 'var(--bg-panel)',
  border: '1px solid var(--border-subtle)',
  color: 'var(--text-primary)',
  borderRadius: 8,
  padding: '6px 10px',
  fontSize: 12,
  width: '100%',
  outline: 'none',
}

function Row({
  icon,
  options,
  value,
  onChange,
  disabled,
}: {
  icon: React.ReactNode
  options: MediaDeviceOption[]
  value: string | null | undefined
  onChange: (id: string | null) => void
  disabled?: boolean
}) {
  if (options.length <= 1) return null
  return (
    <label className="flex items-center gap-2 flex-1 min-w-0">
      <span className="flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>{icon}</span>
      <select
        value={value ?? ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value || null)}
        style={{ ...selectStyle, opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
      >
        <option value="">Default</option>
        {options.map((o) => (
          <option key={o.deviceId} value={o.deviceId}>{o.label}</option>
        ))}
      </select>
    </label>
  )
}

export function DeviceSelector({
  cameras = [],
  microphones = [],
  selectedCameraId,
  selectedMicId,
  onSelectCamera,
  onSelectMic,
  showCamera = true,
  showMic = true,
  disabled = false,
}: DeviceSelectorProps) {
  const camOk = showCamera && onSelectCamera && cameras.length > 1
  const micOk = showMic && onSelectMic && microphones.length > 1
  if (!camOk && !micOk) return null

  return (
    <div className="flex flex-col sm:flex-row gap-2 w-full">
      {camOk && (
        <Row icon={<Camera size={14} />} options={cameras} value={selectedCameraId} onChange={onSelectCamera!} disabled={disabled} />
      )}
      {micOk && (
        <Row icon={<Mic size={14} />} options={microphones} value={selectedMicId} onChange={onSelectMic!} disabled={disabled} />
      )}
    </div>
  )
}
