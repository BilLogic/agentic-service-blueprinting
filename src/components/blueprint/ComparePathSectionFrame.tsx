import { PathLabelBadge } from '@/components/blueprint/PathLabelBadge'
import { PathTypeBadge } from '@/components/blueprint/PathTypeBadge'
import {
  getPathTypeSectionBorderStyle,
  shouldShowPathTypeBadge,
} from '@/lib/pathTypeTheme'
import {
  blueprintPanelLabelRailColor,
  blueprintPanelSectionFillColor,
} from '@/lib/blueprintTheme'
import {
  COMPARE_PATH_SECTION_INSET,
  COMPARE_PATH_SECTION_TOP_INSET,
  COMPARE_PATH_SECTION_BOTTOM_INSET,
  COMPARE_STEP_HEADER_HEIGHT,
} from '@/lib/sideBySideCompareLayout'
import type { BlueprintData } from '@/types/blueprint'

/** Uniform inset for single-path service blueprint section frames. */
export const SERVICE_PATH_SECTION_INSET = 8

type ComparePathSectionFrameProps = {
  blueprint: BlueprintData
  compact?: boolean
  /**
   * Extends the frame upward (px) so it also wraps the step-header row —
   * step names are facts about the path's columns and belong INSIDE the
   * path frame (plan 2026-08-17-002 U1). The header row itself stays bare
   * labels: no container of its own.
   */
  extraTopInset?: number
  /** When false, only the colored path outline is rendered (service blueprint). */
  showTitle?: boolean
  /**
   * Overview mode: prefer a path-type badge for generic names (Happy Path, etc.).
   * Named paths (Set Goals, …) always show their title.
   */
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
  extraTopInset = 0,
}: ComparePathSectionFrameProps) {
  const { path } = blueprint
  const pathBorder = getPathTypeSectionBorderStyle(path.path_type, path)
  const { borderColor, borderStyle, borderWidth } = pathBorder
  const sectionFill = blueprintPanelSectionFillColor()
  const useTypeBadge = showPathTypeBadge && shouldShowPathTypeBadge(path)

  const inset =
    variant === 'compare'
      ? {
          top: -COMPARE_PATH_SECTION_TOP_INSET - extraTopInset,
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
    variant === 'compare'
      ? -COMPARE_PATH_SECTION_TOP_INSET - extraTopInset
      : -SERVICE_PATH_SECTION_INSET
  const titleLeft =
    variant === 'compare'
      ? COMPARE_PATH_SECTION_INSET + 2
      : SERVICE_PATH_SECTION_INSET + 2

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute rounded-xl"
        style={{
          ...inset,
          borderWidth,
          borderStyle,
          borderColor,
          backgroundColor: sectionFill,
        }}
      />
      {extraTopInset > 0 ? (
        // The wrapped step-header row gets a light band — the horizontal
        // counterpart of the lane-label rail, one tint lighter so the two
        // axes read as related but distinct. Offset 3px inside the frame
        // edges so it never paints over the frame's border.
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-t-[9px]"
          style={{
            top: inset.top + 3,
            left: inset.left + 3,
            right: inset.right + 3,
            height: COMPARE_STEP_HEADER_HEIGHT - 3,
            backgroundColor: `color-mix(in oklab, ${blueprintPanelLabelRailColor()} 45%, transparent)`,
          }}
        />
      ) : null}
      {showTitle ? (
        useTypeBadge ? (
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
