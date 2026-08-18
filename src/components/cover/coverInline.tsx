import { Fragment, type ReactNode } from 'react'

/**
 * Inline emphasis for content-module prose: `**term**` for a term on first
 * definition, `` `code` `` for an invocation or filename. Two markers, not a
 * markdown engine — the copy is authored, not user input, and anything richer
 * belongs in the section grammar, not in a string.
 */
export function renderInline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      )
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
