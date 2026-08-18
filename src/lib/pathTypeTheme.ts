import {
  getPathArrowColor as getPathIdentityArrowColor,
  getPathSectionBorderStyle as getPathIdentitySectionBorderStyle,
  PATH_TYPE_ARROW_COLORS,
  PATH_TYPE_COLORS,
  type PathColorInput,
} from '@/lib/pathColorTheme'
import type { PathType } from '@/types/database'

export { PATH_TYPE_ARROW_COLORS, PATH_TYPE_COLORS } from '@/lib/pathColorTheme'

export const PATH_TYPE_SHORT_LABELS: Record<PathType, string> = {
  happy: 'Happy',
  unhappy: 'Unhappy',
  exception: 'Exception',
  alternative: 'Alternative',
}

export const PATH_TYPE_LABELS: Record<PathType, string> = {
  happy: 'Happy path',
  unhappy: 'Unhappy path',
  exception: 'Exception',
  alternative: 'Alternative',
}
export const PATH_TYPE_SECTION_BORDER_WIDTH = 3

export function getPathTypeSectionBorderStyle(
  pathType: PathType,
  path?: Pick<PathColorInput, 'name'>,
): {
  borderColor: string
  borderStyle: 'solid' | 'dashed'
  borderWidth: number
} {
  if (path?.name) {
    return getPathIdentitySectionBorderStyle({
      path_type: pathType,
      name: path.name,
    })
  }

  return {
    borderColor: PATH_TYPE_COLORS[pathType],
    // Solid only for the happy path — matches the arrow dash vocabulary.
    borderStyle: pathType === 'happy' ? 'solid' : 'dashed',
    borderWidth: PATH_TYPE_SECTION_BORDER_WIDTH,
  }
}

export function getPathTypeArrowColor(
  pathType: PathType,
  path?: Pick<PathColorInput, 'name'>,
): string {
  if (path?.name) {
    return getPathIdentityArrowColor({ path_type: pathType, name: path.name })
  }

  return PATH_TYPE_ARROW_COLORS[pathType]
}

/** Path-type suffix for compare labels — omitted when the name already implies the type. */
export function getPathTypeSuffixIfNeeded(path: {
  name: string
  path_type: PathType
}): string | null {
  const short = PATH_TYPE_SHORT_LABELS[path.path_type]
  const full = PATH_TYPE_LABELS[path.path_type]
  const normalized = path.name.toLowerCase()

  if (
    normalized.includes(path.path_type) ||
    normalized.includes(short.toLowerCase()) ||
    normalized.includes(full.toLowerCase())
  ) {
    return null
  }

  return short
}

/**
 * Generic path names (Happy Path, Alternate Path, …) can show a type badge.
 * A path with its own title (an `alternative` named for the activity it
 * covers) shows that title instead — the badge would say less than the name.
 */
const GENERIC_PATH_TYPE_NAMES = new Set([
  'happy path',
  'sad path',
  'unhappy path',
  'alternate path',
  'alternative path',
  'exception',
  'exception path',
])

export function isGenericPathTypeName(name: string): boolean {
  return GENERIC_PATH_TYPE_NAMES.has(name.trim().toLowerCase())
}

/** Overview frames: type badge only for generic archetype names. */
export function shouldShowPathTypeBadge(path: {
  name: string
  path_type?: PathType
}): boolean {
  return isGenericPathTypeName(path.name)
}
