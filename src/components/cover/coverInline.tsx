import { Fragment, type ReactNode } from 'react'

/**
 * Inline emphasis for content-module prose: `**term**` for a term on first
 * definition, `*word*` for the lighter stress the copy uses once or twice,
 * and `` `code` `` for an invocation or filename. Three markers, not a
 * markdown engine — the copy is authored, not user input, and anything
 * richer belongs in the section grammar rather than inside a string.
 */
export function renderInline(text: string): ReactNode {
  // `**` alternates first, so a bold run is never mistaken for two italics.
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={index} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={index}>{part.slice(1, -1)}</em>
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={index}
          className="rounded bg-muted/60 px-1 py-0.5 font-mono text-[0.85em]"
        >
          {part.slice(1, -1)}
        </code>
      )
    }
    return <Fragment key={index}>{part}</Fragment>
  })
}
