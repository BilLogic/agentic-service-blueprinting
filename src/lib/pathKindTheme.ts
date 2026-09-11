import {
  getPathArrowColor as getPathIdentityArrowColor,
  getPathSectionBorderStyle as getPathIdentitySectionBorderStyle,
  PATH_KIND_ARROW_COLORS,
  PATH_KIND_COLORS,
  type PathColorInput,
} from '@/lib/pathColorTheme'
import type { PathKind } from '@/types/database'

export { PATH_KIND_ARROW_COLORS, PATH_KIND_COLORS } from '@/lib/pathColorTheme'

/**
 * The one word a path kind is called, wherever it is shown: the badge, the
 * colour key, the new-path picker. One map, so the same kind cannot read
 * "Happy" in one place and "Happy path" in the next.
 */
export const PATH_KIND_LABELS: Record<PathKind, string> = {
  happy: 'Happy',
  variant: 'Variant',
  exception: 'Exception',
}

export const PATH_KIND_SECTION_BORDER_WIDTH = 3

export function getPathKindSectionBorderStyle(
  pathKind: PathKind,
  path?: Pick<PathColorInput, 'name'>,
): {
  borderColor: string
  borderStyle: 'solid' | 'dashed'
  borderWidth: number
} {
  if (path?.name) {
    return getPathIdentitySectionBorderStyle({
      kind: pathKind,
      name: path.name,
    })
  }

  return {
    borderColor: PATH_KIND_COLORS[pathKind],
    // Solid only for the happy path — matches the arrow dash vocabulary.
    borderStyle: pathKind === 'happy' ? 'solid' : 'dashed',
    borderWidth: PATH_KIND_SECTION_BORDER_WIDTH,
  }
}

export function getPathKindArrowColor(
  pathKind: PathKind,
  path?: Pick<PathColorInput, 'name'>,
): string {
  if (path?.name) {
    return getPathIdentityArrowColor({ kind: pathKind, name: path.name })
  }

  return PATH_KIND_ARROW_COLORS[pathKind]
}

/** Path-type suffix for compare labels — omitted when the name already implies the type. */
export function getPathKindSuffixIfNeeded(path: {
  name: string
  kind: PathKind
}): string | null {
  const label = PATH_KIND_LABELS[path.kind]
  const normalized = path.name.toLowerCase()

  if (
    normalized.includes(path.kind) ||
    normalized.includes(label.toLowerCase())
  ) {
    return null
  }

  return label
}

/**
 * Generic path names (Happy Path, Alternate Path, …) can show a type badge.
 * A path with its own title (an `alternative` named for the activity it
 * covers) shows that title instead — the badge would say less than the name.
 */
const GENERIC_PATH_KIND_NAMES = new Set([
  'happy path',
  'sad path',
  'unhappy path',
  'alternate path',
  'alternative path',
  'exception',
  'exception path',
])

export function isGenericPathKindName(name: string): boolean {
  return GENERIC_PATH_KIND_NAMES.has(name.trim().toLowerCase())
}

/** Overview frames: type badge only for generic archetype names. */
export function shouldShowPathKindBadge(path: {
  name: string
  kind?: PathKind
}): boolean {
  return isGenericPathKindName(path.name)
}
