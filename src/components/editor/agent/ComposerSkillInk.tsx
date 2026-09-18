import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { SkillTokenSpan } from '@/lib/agent/skills'

/**
 * EVERY metric the composer's field and the layer behind it must agree on, in
 * one string both of them wear.
 *
 * The field is a real `<textarea>` and stays one: selection, IME composition,
 * the mobile keyboard, native undo and the mobile shell's own handling all
 * come from the browser, and a contenteditable rewrite would owe every one of
 * them back. So colouring a token inside it means drawing the same string
 * twice — a layer behind the field renders the prose with each resolved token
 * in a coloured span, and the field sits on top with transparent text and a
 * visible caret.
 *
 * Two copies of one string agree on where a line breaks only if they agree on
 * every property that decides it. A half-pixel disagreement is the failure
 * this technique is known for: the coloured text sits a fraction off the
 * caret, and the field appears to shimmer as it is typed into. Hence one
 * string — both rungs of the responsive font size, the line height, the
 * padding, the wrapping — spread onto both, rather than two class lists a
 * later edit can move one of.
 *
 * The scrollbar gutter is in here for the same reason and is not cosmetic.
 * The field scrolls once the message passes six lines; the layer behind it has
 * its overflow hidden and is scrolled programmatically. Without a reserved
 * gutter, a platform with classic scrollbars narrows the field's line box at
 * the line that overflows and leaves the layer's alone, so the two wrap
 * differently from that line down and never recover.
 */
// geometry: min-h-7 is the 28px composer box and a 20px line sits in its
// padding — the same pair the field has always carried, now written once.
export const COMPOSER_FIELD_METRICS =
  'max-h-30 min-h-7 px-2 py-2 text-lg leading-5 whitespace-pre-wrap wrap-break-word [scrollbar-gutter:stable] md:text-sm'

/**
 * The reader's prose, drawn behind the field, with every token that names a
 * skill coloured where they typed it.
 *
 * Colour is the whole signal. Nothing else on this surface says a skill is
 * attached, because nothing else records one — a coloured token will run, and
 * an uncoloured one is a word with a slash on it. The alternative shipped
 * first and was rejected: a badge row above the field, which took the token
 * out of the sentence and stood it at the front of the message.
 *
 * `--text-primary` is the ink: the role this app acts in — the same role the
 * send button wears — on a neutral ground, which is what "recognised, and
 * about to act" means in the token vocabulary. Not a hue and not a new
 * variable; the token model is the only style seam there is.
 *
 * Colour and nothing else, deliberately. A wash behind the token and a
 * heavier weight were both tried and dropped: the reader asked for the
 * treatment the tool this composer mirrors uses, which is coloured text with
 * no band and no box around it.
 *
 * What that costs in THIS palette is worth writing down. The template ships
 * `--primary-chroma: 0`, so this ink resolves to `oklch(0.3148 0 159)` against
 * a `oklch(0.1 0 34)` prose — no hue is reachable, and the only axis left is
 * lightness, which makes the token a shade LIGHTER than the words around it.
 * A deployment that authors an accent gets a genuinely coloured token from the
 * same line of code, which is the case this is tuned for.
 *
 * The trailing newline is not decoration. A block collapses the last newline
 * of its content and a textarea renders a line for it, so a message ending in
 * Enter leaves the two with different scroll heights and the sync below lands
 * a line off at the bottom of a long draft.
 */
export function ComposerSkillInk({
  draft,
  tokens,
  className,
  ...props
}: ComponentProps<'div'> & {
  draft: string
  tokens: readonly SkillTokenSpan[]
}) {
  const parts: ReactNode[] = []
  let at = 0
  for (const span of tokens) {
    if (span.start > at) parts.push(draft.slice(at, span.start))
    parts.push(
      <span key={span.start} className="text-text-primary">
        {draft.slice(span.start, span.end)}
      </span>,
    )
    at = span.end
  }
  parts.push(draft.slice(at))
  return (
    <div
      aria-hidden
      data-slot="composer-skill-ink"
      className={cn(
        COMPOSER_FIELD_METRICS,
        'pointer-events-none absolute inset-0 overflow-hidden select-none',
        className,
      )}
      {...props}
    >
      {parts}
      {'\n'}
    </div>
  )
}
