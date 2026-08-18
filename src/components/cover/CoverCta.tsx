import { ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type {
  CoverActions,
  CoverCtaItem,
} from '@/components/cover/coverModel'
import { cn } from '@/lib/utils'

/**
 * The CTA row.
 *
 * Four states, one table (plan §3.7). The slice actions are the only ones
 * that depend on data, and they never disappear on the way in: while the
 * slice list is loading the buttons render at final size, disabled and
 * `aria-busy`, so the row does not resize under the reader's cursor. When the
 * list settles empty, the buttons are replaced by one sentence — a workspace
 * with no slices has nothing to open, and a disabled button that never
 * enables reads as a bug.
 */
export function CoverCta({
  items,
  actions,
  repoUrl,
  emptyNote,
}: {
  items: CoverCtaItem[]
  actions: CoverActions
  repoUrl?: string
  emptyNote: string
}) {
  const wantsSlice = items.some(
    (item) => item.kind === 'openSlice' || item.kind === 'presentSlice',
  )
  const sliceEmpty = wantsSlice && actions.slice.status === 'empty'
  const sliceLoading = actions.slice.status === 'loading'
  const sliceId =
    actions.slice.status === 'ready' ? actions.slice.sliceId : null

  const rendered = items.filter((item) => {
    if (item.kind === 'link') return Boolean(repoUrl)
    if (item.kind === 'openSlice' || item.kind === 'presentSlice') {
      return !sliceEmpty
    }
    return true
  })

  if (rendered.length === 0 && !sliceEmpty) return null

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3 pt-2">
      {rendered.map((item) => {
        switch (item.kind) {
          case 'openCanvas':
            return (
              <Button
                key={item.label}
                type="button"
                onClick={actions.openCanvas}
                className="h-9 px-3.5"
              >
                {item.label}
              </Button>
            )
          case 'openSlice':
          case 'presentSlice':
            return (
              <Button
                key={item.label}
                type="button"
                variant="outline"
                disabled={sliceLoading || sliceId === null}
                aria-busy={sliceLoading || undefined}
                onClick={() => {
                  if (sliceId === null) return
                  if (item.kind === 'openSlice') actions.openSlice(sliceId)
                  else actions.presentSlice(sliceId)
                }}
                className="h-9 px-3.5"
              >
                {item.label}
              </Button>
            )
          case 'link':
            return (
              <a
                key={item.label}
                href={`${repoUrl}${item.docPath}`}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  'inline-flex items-center gap-1 text-sm font-medium text-muted-foreground',
                  'transition-colors duration-(--motion-structural) ease-structural hover:text-foreground',
                )}
              >
                {item.label}
                <ArrowUpRight aria-hidden className="size-3.5" />
              </a>
            )
        }
      })}
      {sliceEmpty ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {emptyNote}
        </p>
      ) : null}
    </div>
  )
}
