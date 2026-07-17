import { PathLabelBadge } from '@/components/blueprint/PathLabelBadge'
import { PathTypeBadge } from '@/components/blueprint/PathTypeBadge'
import { getPathTypeSectionBorderStyle } from '@/lib/pathTypeTheme'
import { blueprintPanelSectionFillColor } from '@/lib/blueprintTheme'
import {
  COMPARE_PATH_SECTION_INSET,
  COMPARE_PATH_SECTION_TOP_INSET,
  COMPARE_PATH_SECTION_BOTTOM_INSET,
} from '@/lib/sideBySideCompareLayout'
import type { BlueprintData } from '@/types/blueprint'

/** Uniform inset for single-path service blueprint section frames. */
export const SERVICE_PATH_SECTION_INSET = 8

type ComparePathSectionFrameProps = {
  blueprint: BlueprintData
  compact?: boolean
  /** When false, only the colored path outline is rendered (service blueprint). */
  showTitle?: boolean
  /** Overview mode: show path-type badge instead of path name on the frame edge. */
  showPathTypeBadge?: boolean
  /** Compare uses extra top inset for the title badge; service uses uniform inset. */
  variant?: 'compare' | 'service'
}

/** Figma-style section: path-type outline, grouped fill, optional title on the top edge. */
export function ComparePathSectionFrame({
  blueprint,
  compact,
  showTitle = true,
  showPathTypeBadge = false,
  variant = 'compare',
}: ComparePathSectionFrameProps) {
  const { path } = blueprint
  const pathBorder = getPathTypeSectionBorderStyle(path.path_type, path)
  const { borderColor, borderStyle, borderWidth } = pathBorder
  const sectionFill = blueprintPanelSectionFillColor()

  const inset =
    variant === 'compare'
      ? {
          top: -COMPARE_PATH_SECTION_TOP_INSET,
          left: -COMPARE_PATH_SECTION_INSET,
          right: -COMPARE_PATH_SECTION_INSET,
          bottom: -COMPARE_PATH_SECTION_BOTTOM_INSET,
        }
      : {
          top: -SERVICE_PATH_SECTION_INSET,
          left: -SERVICE_PATH_SECTION_INSET,
          right: -SERVICE_PATH_SECTION_INSET,
          bottom: -SERVICE_PATH_SECTION_INSET,
        }

  const titleTop =
    variant === 'compare' ? -COMPARE_PATH_SECTION_TOP_INSET : -SERVICE_PATH_SECTION_INSET
  const titleLeft =
    variant === 'compare'
      ? COMPARE_PATH_SECTION_INSET + 2
      : SERVICE_PATH_SECTION_INSET + 2

  return (
    <>
      <div
        aria-hidden
        className="blueprint-panel-section-frame pointer-events-none absolute rounded-xl"
        style={{
          ...inset,
          borderWidth,
          borderStyle,
          borderColor,
          backgroundColor: sectionFill,
        }}
      />
      {showTitle ? (
        showPathTypeBadge ? (
          <PathTypeBadge
            pathType={path.path_type}
            description={path.description}
            compact={compact}
            className="pointer-events-auto absolute z-50 max-w-[calc(100%-12px)]"
            style={{
              top: titleTop,
              left: titleLeft,
              transform: 'translateY(-50%)',
            }}
          />
        ) : (
          <PathLabelBadge
            name={path.name}
            description={path.description}
            pathType={path.path_type}
            compact={compact}
            className="pointer-events-auto absolute z-50 max-w-[calc(100%-12px)]"
            style={{
              top: titleTop,
              left: titleLeft,
              transform: 'translateY(-50%)',
            }}
          />
        )
      ) : null}
    </>
  )
}
