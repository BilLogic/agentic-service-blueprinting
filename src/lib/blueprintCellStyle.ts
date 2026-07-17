import { cn } from '@/lib/utils'
import type { BlueprintLayerStyle } from '@/lib/blueprintTheme'
import type { CSSProperties } from 'react'

export const BLUEPRINT_CELL_TEXT_COLOR = '#000000'
export const BLUEPRINT_CELL_BORDER_COLOR = '#000000'

function normalizeHex(hex: string): string {
  return hex.trim().toUpperCase()
}

function hexToHsl(hex: string): [h: number, s: number, l: number] {
  const normalized = normalizeHex(hex)
  const r = parseInt(normalized.slice(1, 3), 16) / 255
  const g = parseInt(normalized.slice(3, 5), 16) / 255
  const b = parseInt(normalized.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      default:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return [h * 360, s * 100, l * 100]
}

function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100
  const light = l / 100
  const c = (1 - Math.abs(2 * light - 1)) * sat
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = light - c / 2
  let r = 0
  let g = 0
  let b = 0

  if (h < 60) {
    r = c
    g = x
  } else if (h < 120) {
    r = x
    g = c
  } else if (h < 180) {
    g = c
    b = x
  } else if (h < 240) {
    g = x
    b = c
  } else if (h < 300) {
    r = x
    b = c
  } else {
    r = c
    b = x
  }

  const toHex = (channel: number) =>
    Math.round((channel + m) * 255)
      .toString(16)
      .padStart(2, '0')

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/** Per-cell interaction tones — same hue as fill, tuned for hover/pressed/focus. */
export function getBlueprintCellInteractionColors(fill: string): {
  bg: string
  bgHover: string
  bgPressed: string
  ring: string
  ringSoft: string
} {
  const [h, s, l] = hexToHsl(fill)

  // Neutral visual cells — keep grey family
  if (s < 10) {
    return {
      bg: fill,
      bgHover: hslToHex(h, s, l * 0.94),
      bgPressed: hslToHex(h, Math.min(s + 6, 18), l * 0.86),
      ring: hslToHex(h, 14, 42),
      ringSoft: hslToHex(h, 10, 58),
    }
  }

  const isVivid = s > 45 && l < 82
  const hoverLightness = isVivid ? l * 0.88 : l > 88 ? l * 0.91 : l * 0.93
  const pressedLightness = isVivid ? l * 0.78 : l > 88 ? l * 0.84 : l * 0.86
  const hoverSat = isVivid
    ? Math.min(s * 1.04, 90)
    : Math.min(s * 1.1, 92)
  const pressedSat = isVivid
    ? Math.min(s * 1.08, 92)
    : Math.min(s * 1.16, 94)
  const ringSat = Math.min(s * 1.3, 88)
  const ringSoftSat = Math.min(s * 1.18, 82)

  return {
    bg: fill,
    bgHover: hslToHex(h, hoverSat, hoverLightness),
    bgPressed: hslToHex(h, pressedSat, pressedLightness),
    ring: hslToHex(h, ringSat, Math.max(l * 0.42, 26)),
    ringSoft: hslToHex(h, ringSoftSat, Math.max(l * 0.54, 36)),
  }
}

export function getBlueprintCellInteractionStyle(
  fill: string,
): Record<string, string> {
  const colors = getBlueprintCellInteractionColors(fill)
  return {
    '--blueprint-cell-bg-origin': colors.bg,
    '--blueprint-cell-bg': colors.bg,
    '--blueprint-cell-bg-hover': colors.bgHover,
    '--blueprint-cell-bg-pressed': colors.bgPressed,
    '--blueprint-cell-ring': colors.ring,
    '--blueprint-cell-ring-soft': colors.ringSoft,
  }
}

/** @deprecated Use getBlueprintCellInteractionColors().ring */
export function getBlueprintCellRingColor(fill: string): string {
  return getBlueprintCellInteractionColors(fill).ring
}

export function getBlueprintCellSurfaceStyle(
  fill: string,
  extra?: CSSProperties,
): CSSProperties {
  return {
    backgroundColor: fill,
    color: BLUEPRINT_CELL_TEXT_COLOR,
    borderColor: BLUEPRINT_CELL_BORDER_COLOR,
    ...extra,
  }
}

export function getBlueprintCellSurfaceStyleFromLane(
  laneStyle: BlueprintLayerStyle,
  extra?: CSSProperties,
): CSSProperties {
  return getBlueprintCellSurfaceStyle(laneStyle.lane, extra)
}

export function blueprintCellButtonClassName({
  compact = false,
  variant = 'cell',
  className,
}: {
  compact?: boolean
  variant?: 'cell' | 'pill' | 'visual'
  className?: string
} = {}) {
  const shared = cn(
    'h-auto w-full font-normal whitespace-normal shadow-none ring-offset-0',
    compact ? 'text-xs' : 'text-sm',
  )

  if (variant === 'pill') {
    return cn(
      shared,
      'rounded-full text-center leading-snug',
      compact ? 'px-2.5 py-2' : 'px-3 py-2.5',
      className,
    )
  }

  if (variant === 'visual') {
    return cn(
      shared,
      'rounded-lg flex items-center justify-center',
      compact ? 'px-2 py-3' : 'px-3 py-4',
      className,
    )
  }

  return cn(
    shared,
    'rounded-lg flex-1 items-start justify-start text-left leading-relaxed',
    compact ? 'px-3 py-2.5' : 'px-4 py-3.5',
    className,
  )
}
