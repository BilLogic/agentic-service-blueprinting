import {
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEventHandler,
  type ReactNode,
  type Ref,
} from 'react'
import { InputGroup, InputGroupTextarea } from '@/components/ui/input-group'
import { composerInkedFieldClasses } from '@/components/editor/agent/composerFieldMetrics'
import type { SkillTokenSpan } from '@/lib/agent/skills'

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
 * In the DARK theme the relation inverts — the ink lands near a lightness of
 * 0.7676 against a 0.95 prose, so the token reads a shade DARKER than the
 * words around it. Worth knowing before anyone reaches for a step in
 * lightness in one direction and finds it is the wrong direction in the other
 * theme; the signal is the step itself, not which way it goes.
 *
 * The trailing newline is not decoration. A block collapses the last newline
 * of its content and a textarea renders a line for it, so a message ending in
 * Enter leaves the two with different scroll heights and the scroll sync below
 * lands a line off at the bottom of a long draft.
 */
function SkillInk({
  draft,
  tokens,
  className,
  ref,
}: {
  draft: string
  tokens: readonly SkillTokenSpan[]
  className: string
  ref: Ref<HTMLDivElement>
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
      className={className}
      ref={ref}
    >
      {parts}
      {'\n'}
    </div>
  )
}

/**
 * THE COMPOSER'S FIELD, with the ink that colours a skill token in it.
 *
 * One module, because the illusion is one fact split five ways and every one
 * of the five is a way for it to break. A textarea cannot colour a word
 * inside itself, so the colour comes from a mirrored copy of the same string
 * drawn behind a field whose own text has gone transparent — and that picture
 * holds only while the two copies agree on: the metrics that decide a line
 * break, the trailing newline a block would otherwise collapse, the ONE
 * positioned box they both size against, the scroll offset, and standing down
 * while an IME composes. Four of those used to be the caller's to get right,
 * spelled in its render body next to everything else a chat panel does, with
 * a comment asking the next reader not to break them.
 *
 * What the narrow interface buys is that the comment is no longer the
 * mechanism. Callers hand in the draft, the tokens read out of it and the
 * handlers; they cannot reach the box the two copies measure, and they cannot
 * put an add-on into the input group, because the group is in here and takes
 * no children from outside. That was the live hazard: an add-on in the group
 * narrows the FIELD through the group's own `has-[>[data-align=...]]` rules
 * and leaves the mirror full width, so every line from the first wrap down
 * breaks somewhere else and the colour drifts off the caret — a failure no
 * shared metrics string can see or undo. Inside this module the add-on would
 * land beside the box that sizes both copies, which narrows both or neither.
 *
 * `h-auto` on the group is the other half of that box's cost, and it is load
 * bearing: the group grows for a DIRECT-child textarea
 * (`has-[>textarea]:h-auto`), and the field is a grandchild of it here, so
 * the height that lets the composer pass one line is spelled rather than
 * inferred. Drop it and a draft that wraps is typed into a 28px slot with its
 * first line scrolled out of sight.
 *
 * `field-sizing-content` on the DS textarea is what actually grows it, so
 * there is no imperative height write anywhere in here; the metrics string's
 * `max-h-30` caps the growth at roughly six lines and the field scrolls from
 * there, which is what the scroll sync exists for.
 *
 * The metrics and the two class lists they spread onto live in
 * `composerFieldMetrics.ts` beside this file — the pure half of the same
 * module, so the agreement can be pinned without a tree.
 */
export function ComposerInkedField({
  draft,
  tokens,
  onDraftChange,
  onKeyDown,
  placeholder,
  disabled,
}: {
  draft: string
  tokens: readonly SkillTokenSpan[]
  onDraftChange: (text: string) => void
  onKeyDown?: KeyboardEventHandler<HTMLTextAreaElement>
  placeholder: string
  disabled?: boolean
}) {
  const fieldRef = useRef<HTMLTextAreaElement>(null)
  const inkRef = useRef<HTMLDivElement>(null)
  // The mirror's overflow is hidden, so it is scrolled from here rather than
  // by the reader: a message past six lines scrolls the field, and a mirror
  // left at the top would show the first line's colour against the sixth
  // line's text.
  const syncInkScroll = () => {
    const field = fieldRef.current
    const ink = inkRef.current
    if (!field || !ink) return
    ink.scrollTop = field.scrollTop
    ink.scrollLeft = field.scrollLeft
  }
  // A keystroke at the bottom of a scrolled field moves its scrollTop without
  // ever firing a scroll event in time to matter, so the sync also runs after
  // the write that caused it — before paint, or the colour lags a frame behind
  // the caret on every character typed.
  useLayoutEffect(syncInkScroll, [draft])
  // Composition text lives in the field, and the field's own text is
  // transparent while the mirror behind it is doing the drawing — so an IME
  // preedit string would be invisible for as long as it is being composed.
  // While composing, the field shows its own text and the mirror stands down.
  const [composing, setComposing] = useState(false)
  const inking = tokens.length > 0 && !composing
  const classes = composerInkedFieldClasses(inking)
  return (
    <InputGroup className="h-auto min-h-8 flex-1">
      {/* The mirror and the field share ONE positioned box, and the box is
          sized by the field: that is what keeps the two copies of the draft
          wrapping alike. The mirror is `absolute inset-0`, so it measures its
          nearest positioned ancestor, and only a box the field sizes wraps
          the way the field wraps. Against the input group itself the two
          coincided by accident — the field was its sole child, in the slot a
          badge add-on had just left — and the group is one add-on away from
          narrowing the field alone. */}
      <div className="relative min-w-0 flex-1">
        {inking ? (
          <SkillInk
            ref={inkRef}
            draft={draft}
            tokens={tokens}
            className={classes.mirror}
          />
        ) : null}
        <InputGroupTextarea
          ref={fieldRef}
          // The seam `focusAgentComposer` finds this by. The phone's shell
          // gives the caret back here after an agent-driven camera move, so
          // the reader keeps typing without hunting for the box.
          data-agent-composer=""
          rows={1}
          className={classes.field}
          value={draft}
          onScroll={syncInkScroll}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={() => setComposing(false)}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label="Message the agent"
          disabled={disabled}
        />
      </div>
    </InputGroup>
  )
}
