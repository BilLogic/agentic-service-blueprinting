import { cn } from '@/lib/utils'

/**
 * A small capitalised word over the thing it names — the EYEBROW register.
 *
 * WHY IT IS A COMPONENT. Twenty-odd places had written this by hand, and they
 * did not agree: fourteen spelled the letterspacing `tracking-wide` and eight
 * `tracking-wider`, on surfaces a reader meets in the same minute. Each string
 * was legal on its own, which is why nobody caught it in review — the drift is
 * only visible when you count. One spelling, in one file, is what stops the
 * next paste from inventing a twenty-first.
 *
 * WHAT AN EYEBROW IS, so a call site can tell whether it has one. It labels a
 * REGION of chrome — a group in a menu, the head of an annotation plate, a
 * column in a comparison — where the label is furniture and the content beside
 * it is the subject. It is not:
 *
 *   - a panel section label (`PanelSectionLabel`): inside a panel, a section
 *     name is sentence case. `Status`, `Paths`, `Position` read as words, and
 *     a panel is already a quiet surface — capitals there are a second voice
 *     in a room that has one.
 *   - a status or a category (`Badge`): those say what a thing IS. An eyebrow
 *     says where you are.
 *
 * THE ONE OPEN QUESTION, recorded here rather than argued at each call site.
 * The design system this tree's type register came from spends its eyebrows in
 * MONOSPACE — of its uppercase sites, most sit beside a mono face — and this
 * tree's own type record names "eyebrow and wordmark" as the third mono
 * register. Ours are sans. Both are defensible: mono makes the eyebrow a
 * different kind of text, sans keeps chrome in one voice. What is not
 * defensible is the tree answering it twenty times. Change the face here, in
 * one line, and every eyebrow moves together.
 */
export function Eyebrow({
  children,
  className,
  ...rest
}: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'text-xs font-medium tracking-wide text-muted-foreground uppercase',
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  )
}
