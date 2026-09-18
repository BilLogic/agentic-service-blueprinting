/**
 * EVERY metric the composer's field and the mirror behind it must agree on, in
 * one string both of them wear.
 *
 * Two copies of one string agree on where a line breaks only if they agree on
 * every property that decides it. A half-pixel disagreement is the failure the
 * mirror technique is known for: the coloured text sits a fraction off the
 * caret, and the field appears to shimmer as it is typed into. Hence one
 * string — both rungs of the responsive font size, the line height, the
 * padding, the wrapping — spread onto both, rather than two class lists a
 * later edit can move one of. `ComposerInkedField` beside this file does the
 * spreading and owns everything else about the pair; what crosses out is this
 * list of properties, because a test needs it to ask both rendered copies
 * whether they still wear all of it.
 *
 * The scrollbar gutter is in here for the same reason and is not cosmetic.
 * The field scrolls once the message passes six lines; the mirror behind it
 * has its overflow hidden and is scrolled programmatically. Without a reserved
 * gutter, a platform with classic scrollbars narrows the field's line box at
 * the line that overflows and leaves the mirror's alone, so the two wrap
 * differently from that line down and never recover.
 */
// geometry: min-h-7 is the 28px composer box and a 20px line sits in its
// padding — the same pair the field has always carried, now written once.
export const COMPOSER_FIELD_METRICS =
  'max-h-30 min-h-7 px-2 py-2 text-lg leading-5 whitespace-pre-wrap wrap-break-word [scrollbar-gutter:stable] md:text-sm'
