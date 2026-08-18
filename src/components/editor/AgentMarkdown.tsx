import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

/**
 * Markdown for agent prose. The chat bubbles are text-sm and narrow, so
 * every block element is restyled compact — default browser margins would
 * read as a document, not a message.
 */
export function AgentMarkdown({
  text,
  className,
}: {
  text: string
  className?: string
}) {
  return (
    <div className={cn('space-y-1.5 text-sm leading-relaxed', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p>{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul className="list-disc space-y-0.5 pl-4">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal space-y-0.5 pl-4">{children}</ol>
          ),
          li: ({ children }) => <li>{children}</li>,
          h1: ({ children }) => (
            <p className="font-semibold">{children}</p>
          ),
          h2: ({ children }) => (
            <p className="font-semibold">{children}</p>
          ),
          h3: ({ children }) => (
            <p className="font-semibold">{children}</p>
          ),
          code: ({ children, className: codeClassName }) => {
            // Fenced blocks arrive wrapped in <pre>; inline code has no
            // language class and no pre parent — style both compactly.
            const isBlock = /language-/.test(codeClassName ?? '')
            return (
              <code
                className={cn(
                  'rounded bg-muted px-1 py-0.5 font-mono text-[0.8em]',
                  isBlock && 'block overflow-x-auto p-2',
                )}
              >
                {children}
              </code>
            )
          },
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-md bg-muted p-0 text-[0.85em]">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-border pl-2 text-muted-foreground">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-border px-1.5 py-1 text-left font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-border/50 px-1.5 py-1 align-top">
              {children}
            </td>
          ),
          hr: () => <hr className="border-border/60" />,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}
