import type { PostgrestError } from '@supabase/supabase-js'

/**
 * An authoring failure, already phrased for a person.
 *
 * `message` is what the UI shows. `raw` is the database's own text, which
 * goes to the console and nowhere else: the trigger messages are precise and
 * correct ("cells.step_id must be linked to cells.path_id in path_steps") and
 * mean nothing to someone drawing a blueprint.
 */
export class AuthoringError extends Error {
  readonly raw: string

  constructor(message: string, raw: string) {
    super(message)
    this.name = 'AuthoringError'
    this.raw = raw
  }
}

/**
 * Database text the app must never show, mapped to what actually went wrong.
 *
 * Matching is by substring rather than by SQLSTATE because these are raised
 * by `raise exception`, which yields P0001 for all of them — the code carries
 * no information, only the text does.
 *
 * The RPCs in `20260731001000_blueprint_authoring_operations.sql` deliberately
 * raise sentences ("A blueprint needs a name"), so they are absent here and
 * pass through untouched. Only the older structural triggers, and Postgres's
 * own constraint machinery, need translating.
 */
const TRANSLATIONS: Array<{ match: string; message: string }> = [
  {
    match: 'cells.step_id must be linked',
    message:
      'That column is not part of this version yet. Add the column to the version before putting a cell in it.',
  },
  {
    match: 'cells.path_id must match layers.path_id',
    message: 'That lane belongs to a different version of this journey.',
  },
  {
    match: 'cells: layer_id does not exist',
    message: 'That lane no longer exists — it may have been deleted in another tab.',
  },
  {
    match: 'path_steps_path_column_unique',
    message: 'Two columns ended up in the same position. Reload and try the move again.',
  },
  {
    match: 'layers_path_row_unique',
    message: 'Two lanes ended up in the same position. Reload and try the move again.',
  },
  {
    match: 'duplicate key value',
    message: 'Something with that name or position already exists here.',
  },
  {
    match: 'violates foreign key constraint',
    message: 'Something this refers to no longer exists — reload and try again.',
  },
  {
    match: 'permission denied',
    message:
      'This session cannot write. Authoring needs the dev server with a local authoring key.',
  },
  {
    match: 'violates row-level security',
    message:
      'This session cannot write. Authoring needs the dev server with a local authoring key.',
  },
]

/** Last resort. Never shows database text. */
const FALLBACK = 'That change could not be saved. The details are in the console.'

/**
 * Turn a PostgREST error into something worth showing.
 *
 * Everything the app raises deliberately is a sentence already; anything else
 * is either translated or replaced. The raw text always survives on `.raw` so
 * the console keeps the diagnosable version.
 */
export function toAuthoringError(error: PostgrestError | Error): AuthoringError {
  const raw = [
    error.message,
    'details' in error ? error.details : null,
    'hint' in error ? error.hint : null,
  ]
    .filter((part): part is string => Boolean(part))
    .join(' — ')

  const haystack = raw.toLowerCase()
  for (const { match, message } of TRANSLATIONS) {
    if (haystack.includes(match.toLowerCase())) return new AuthoringError(message, raw)
  }

  // Sentences the RPCs raise on purpose: capitalised, spaced, no identifier
  // punctuation. Anything shaped like `relation "x" does not exist` fails this
  // and takes the fallback.
  if (isHumanSentence(error.message)) {
    return new AuthoringError(error.message, raw)
  }

  return new AuthoringError(FALLBACK, raw)
}

function isHumanSentence(message: string): boolean {
  if (!message) return false
  if (message.length > 160) return false
  if (/[_"]|\b[a-z]+\.[a-z_]+\b/.test(message)) return false
  return /^[A-Z]/.test(message) && message.includes(' ')
}
