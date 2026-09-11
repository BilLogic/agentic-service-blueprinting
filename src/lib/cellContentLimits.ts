/**
 * The cell-content budget: a canvas cell is read at a glance, and the lane
 * grid's row rhythm assumes a handful of wrapped lines. The numbers that
 * name that geometry live on the deployment config — this module reads them
 * and turns a length into advice. Detail beyond the budget belongs in
 * `summary`, which the panel scrolls.
 *
 * Advice, never a refusal. Nothing in the schema enforces a length, and the
 * canvas clamps its preview to a fixed face rather than growing to fit, so a
 * longer cell costs the board nothing — the budget is a judgement about how
 * much copy looks right in a card. A person sees the same note under the
 * field that the agent receives in its tool result; neither writer is
 * stopped.
 */
import {
  asbDefaultCellBudget,
  type CellContentBudget,
} from '@/deploymentConfig'
import { shouldUseTouchpointCellContent } from '@/lib/blueprintLayout'

/** Which of the two per-kind budgets a stretch of cell text is measured against. */
export type CellBudgetKind = 'prose' | 'touchpointLabels'

export type CellContentLengthGuidance = {
  /** The first rung the message names. */
  target: number
  /** The second rung the message names. */
  warning: number
  overTarget: boolean
  overWarning: boolean
  /** Advice when the content runs past the target; null when it fits. */
  message: string | null
}

/**
 * Clone a budget so a later mutation of the host object cannot reach the
 * table this module reads.
 */
function copyBudget(budget: CellContentBudget): CellContentBudget {
  return {
    prose: { target: budget.prose.target, warning: budget.prose.warning },
    touchpointLabels: {
      target: budget.touchpointLabels.target,
      warning: budget.touchpointLabels.warning,
    },
  }
}

/**
 * The template fallback, read from config rather than restated here. The
 * provider overwrites this before paint; tests call {@link configureCellBudget}
 * directly.
 */
function templateBudget(): CellContentBudget {
  return copyBudget(asbDefaultCellBudget)
}

let budget: CellContentBudget = templateBudget()

/**
 * Replace the budget {@link getCellContentLengthGuidance} reads.
 *
 * Called from `DeploymentConfigProvider` in a layout effect, and from tests
 * directly. Replaces rather than merges: the resolved config is the whole
 * table. The object is copied, so a later mutation of the host cannot reach
 * into the guidance.
 *
 * @param next Complete budget, both kinds, both rungs.
 */
export function configureCellBudget(next: CellContentBudget): void {
  budget = copyBudget(next)
}

/**
 * Which budget a lane's cell text is measured against: touchpoint-lane
 * labels vs everyone else's prose.
 */
export function cellBudgetKindForLane(
  lane: { name: string; role?: string | null } | null | undefined,
): CellBudgetKind {
  if (!lane) return 'prose'
  return shouldUseTouchpointCellContent(lane) ? 'touchpointLabels' : 'prose'
}

function rungsFor(kind: CellBudgetKind): {
  target: number
  warning: number
} {
  return kind === 'touchpointLabels' ? budget.touchpointLabels : budget.prose
}

/**
 * Advice, never a refusal.
 *
 * The same string the person sees under the field and the agent receives in
 * its tool result. When target and warning differ, both are named; when they
 * are the same number (the template default) the message names that one
 * budget, matching the single-cap wording that used to live here.
 *
 * @param content The text being written.
 * @param kind Which per-kind budget to measure against. Defaults to prose.
 */
export function getCellContentLengthGuidance(
  content: string,
  kind: CellBudgetKind = 'prose',
): CellContentLengthGuidance {
  const { target, warning } = rungsFor(kind)
  const length = content.length
  const overTarget = length > target
  const overWarning = length > warning
  const named =
    target === warning
      ? `${target} is the canvas budget`
      : `the target is ${target} and the warning is ${warning}`
  return {
    target,
    warning,
    overTarget,
    overWarning,
    message: overTarget
      ? `Cell content is ${length} characters; ${named}. The canvas shows what fits and the panel holds the rest — consider moving supporting detail (statistics, caveats, evidence) into the summary.`
      : null,
  }
}
