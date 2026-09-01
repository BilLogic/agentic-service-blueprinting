/**
 * Slice rules, enforced in the app.
 *
 * These mirror `scripts/slice_tools.py validate` in the skills repo one for
 * one. Both sides have to agree: a slice the app lets you save but the skill
 * refuses to regenerate (or vice versa) is a slice that silently stops being
 * maintainable. When one side changes, change the other.
 *
 * Deliberately plain predicates — no schema library. The rules are few, and
 * the failure messages are user-facing copy, not stack traces.
 */

export const SLICE_KINDS = ['journey', 'step', 'lane', 'cell', 'custom'] as const
export type SliceKind = (typeof SLICE_KINDS)[number]

export const SLICE_ORIGINS = ['generated', 'customized', 'human'] as const
export type SliceOrigin = (typeof SLICE_ORIGINS)[number]

export function isSliceKind(value: string): value is SliceKind {
  return (SLICE_KINDS as readonly string[]).includes(value)
}

export function isSliceOrigin(value: string): value is SliceOrigin {
  return (SLICE_ORIGINS as readonly string[]).includes(value)
}

/** A slide as the editor holds it, before it becomes a `slides` row. */
export type DraftSlide = {
  /** Existing row id; absent for a slide that has not been saved yet. */
  id?: string
  cells: string[]
  title: string
  narrative: string
}

export type DraftSlice = {
  title: string
  description: string
  sliceKind: SliceKind
  actor: string
  slides: DraftSlide[]
}

export type ValidationProblem = {
  /** Slide index the problem belongs to; absent means the slice as a whole. */
  slide?: number
  message: string
}

const TITLE_MAX = 120

/**
 * Every rule that makes a slice renderable. Returns user-facing messages, so
 * the editor can show them inline rather than failing the save with a
 * PostgREST error the user cannot act on.
 */
export function validateDraftSlice(draft: DraftSlice): ValidationProblem[] {
  const problems: ValidationProblem[] = []

  const title = draft.title.trim()
  if (!title) {
    problems.push({ message: 'A slice needs a title.' })
  } else if (title.length > TITLE_MAX) {
    problems.push({ message: `Title is longer than ${TITLE_MAX} characters.` })
  }

  if (!isSliceKind(draft.sliceKind)) {
    problems.push({ message: `Unknown slice type “${draft.sliceKind}”.` })
  }

  if (draft.slides.length === 0) {
    problems.push({ message: 'A slice needs at least one slide.' })
  }

  // A cell in two slides renders twice with two different sequence numbers —
  // the badge machinery keys on cell id, so the second wins and the first
  // silently loses its number.
  const seen = new Map<string, number>()
  draft.slides.forEach((slide, index) => {
    if (slide.cells.length === 0) {
      problems.push({ slide: index, message: 'This slide has no cells.' })
    }
    slide.cells.forEach((cellId) => {
      const first = seen.get(cellId)
      if (first !== undefined) {
        problems.push({
          slide: index,
          message: `A cell is already in slide ${first + 1}. Move it instead of adding it twice.`,
        })
      } else {
        seen.set(cellId, index)
      }
    })
  })

  return problems
}

/** True when the draft can be saved. */
export function isDraftSaveable(draft: DraftSlice): boolean {
  return validateDraftSlice(draft).length === 0
}

/**
 * Editing a generated slice makes it `customized`, which is what stops the
 * slice skill from regenerating over hand-written prose. `human` slices —
 * authored here in the first place — stay `human`.
 */
export function originAfterEdit(current: string): SliceOrigin {
  if (current === 'human') return 'human'
  return 'customized'
}
