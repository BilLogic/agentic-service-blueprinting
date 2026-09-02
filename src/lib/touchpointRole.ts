/**
 * Whether a touchpoint is the point of this moment, or merely present at it.
 *
 * `cell_touchpoints.role` sits on the PLACEMENT and not on the catalog
 * entry, and that is the whole idea: a poster is core at recruitment and
 * incidental three phases later, so the same artifact is both depending on
 * where you are standing. A column on `touchpoints` could only ever answer
 * "how important is this tool", which is a question about the tool rather
 * than about the service.
 *
 * ── The third state is the common one ──────────────────────────────────────
 *
 * There are two values in the check constraint and THREE states a reader can
 * meet, because the column is nullable and most placements will never be
 * marked. Unmarked is not a quiet `peripheral`: it means nobody has judged
 * this placement, and rendering it as anything — a grey badge, a dash, the
 * word "Unmarked" — would put a judgement on screen that nobody made. So the
 * read side renders NOTHING for null, and only the editor names the state, in
 * a control where "leave it unmarked" has to be a choosable option.
 *
 * That asymmetry is deliberate and is the reason this file exists rather than
 * the two strings being inlined: a label list that says what unset means is
 * the thing that stops the next reader from adding a third badge.
 */

/** The two values `cell_touchpoints_role_check` admits. */
export const TOUCHPOINT_ROLE = ['core', 'peripheral'] as const

export type TouchpointRole = (typeof TOUCHPOINT_ROLE)[number]

/**
 * What a placement carries, unmarked included.
 *
 * `null` is a real member of this type rather than an absence to be defaulted
 * away — every read of the column has to answer for the unmarked case, and a
 * type that hid it would let a `?? 'peripheral'` slip in somewhere.
 */
export type TouchpointRoleValue = TouchpointRole | null

/**
 * The badge's words.
 *
 * "at this step" and not "Core", because the bare word is the misreading this
 * column exists to avoid: a reader who sees `Core` on an intake-portal placement
 * reads "the portal is a core tool", which is a claim about the catalog. The
 * phrase puts the judgement back where the column put it.
 */
export const TOUCHPOINT_ROLE_LABEL: Record<TouchpointRole, string> =
  {
    core: 'Core at this step',
    peripheral: 'Peripheral at this step',
  }

/** What each value means, for the badge's hover and the field's guidance. */
export const TOUCHPOINT_ROLE_DEFINITION: Record<
  TouchpointRole,
  string
> = {
  core: 'The moment happens through this touchpoint. Take it away and the step does not work.',
  peripheral:
    'Present at this moment but not what it turns on — a reference, a notification, a place the work is recorded.',
}

/**
 * The editor's options, unmarked first and selected by default.
 *
 * First because it is the state almost every placement is in, and a control
 * whose default sits third teaches an author that they are correcting
 * something. Its label says "not judged" rather than naming a middle value,
 * so choosing it is not choosing a third degree of importance.
 */
export const TOUCHPOINT_ROLE_OPTIONS: ReadonlyArray<{
  value: TouchpointRoleValue
  label: string
}> = [
  { value: null, label: 'Unmarked — nobody has judged this' },
  { value: 'core', label: TOUCHPOINT_ROLE_LABEL.core },
  { value: 'peripheral', label: TOUCHPOINT_ROLE_LABEL.peripheral },
]

/**
 * Narrow whatever came back from the database to the vocabulary.
 *
 * The column is `text` with a CHECK, so a value that predates the constraint
 * or arrives through a seed is possible in principle; anything unrecognised
 * reads as unmarked, which is the state that asserts the least.
 */
export function normalizeRole(
  value: string | null | undefined,
): TouchpointRoleValue {
  return value === 'core' || value === 'peripheral' ? value : null
}
