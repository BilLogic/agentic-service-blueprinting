import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ExternalLink } from 'lucide-react'
import {
  getCellDependencyKindLabel,
  type CellDependencyRow,
} from '@/lib/blueprintCellDependencies'
import type {
  FlowConnectionDirection,
  FlowInteractionDirection,
} from '@/lib/blueprintCellConnections'
import { cn } from '@/lib/utils'

function DirectionIcon({
  direction,
}: {
  direction?: FlowConnectionDirection | FlowInteractionDirection
}) {
  if (direction === 'up') {
    return <ArrowUp className="size-3 shrink-0 text-muted-foreground/70" aria-hidden />
  }
  if (direction === 'down') {
    return <ArrowDown className="size-3 shrink-0 text-muted-foreground/70" aria-hidden />
  }
  if (direction === 'prev' || direction === 'both') {
    return <ArrowLeft className="size-3 shrink-0 text-muted-foreground/70" aria-hidden />
  }
  if (direction === 'next') {
    return <ArrowRight className="size-3 shrink-0 text-muted-foreground/70" aria-hidden />
  }
  return null
}

function DependencyTarget({
  row,
  onCellSelect,
  onTechSelect,
}: {
  row: CellDependencyRow
  onCellSelect: (cellId: string) => void
  onTechSelect: (cellId: string, techItem: string) => void
}) {
  if (row.kind === 'link' && row.href) {
    return (
      <a
        href={row.href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'inline-flex max-w-full min-w-0 items-center gap-1 text-[11px] leading-snug',
          'font-medium text-foreground/85 transition-colors hover:text-foreground',
          'focus-visible:outline-none focus-visible:underline',
        )}
      >
        <span className="min-w-0 truncate">{row.label}</span>
        <ExternalLink className="size-3 shrink-0 opacity-70" aria-hidden />
      </a>
    )
  }

  const isInteractive = Boolean(row.cellId)
  const content = (
    <>
      <DirectionIcon direction={row.direction} />
      <span className="min-w-0 truncate font-medium text-foreground/90">{row.label}</span>
      {row.detail ? (
        <span className="min-w-0 truncate text-muted-foreground">· {row.detail}</span>
      ) : null}
    </>
  )

  if (!isInteractive || !row.cellId) {
    return (
      <div className="inline-flex max-w-full min-w-0 items-center gap-1 text-[11px] leading-snug">
        {content}
      </div>
    )
  }

  const handleClick = () => {
    if (row.techItem) {
      onTechSelect(row.cellId!, row.techItem)
      return
    }
    onCellSelect(row.cellId!)
  }

  return (
    <button
      type="button"
      className={cn(
        'inline-flex max-w-full min-w-0 items-center gap-1 text-left text-[11px] leading-snug',
        'text-foreground/85 transition-colors hover:text-foreground',
        'focus-visible:outline-none focus-visible:underline',
      )}
      onClick={handleClick}
    >
      {content}
    </button>
  )
}

export function CellDependencyTable({
  rows,
  onCellSelect,
  onTechSelect,
}: {
  rows: CellDependencyRow[]
  onCellSelect: (cellId: string) => void
  onTechSelect: (cellId: string, techItem: string) => void
}) {
  if (rows.length === 0) return null

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[10px] font-medium leading-none text-muted-foreground/65">
        Dependencies
      </p>
      <div className="overflow-hidden rounded-lg border border-border/60">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="border-b border-border/50 bg-muted/20">
              <th
                scope="col"
                className="w-[5.5rem] px-2 py-1.5 text-left font-semibold text-muted-foreground"
              >
                Type
              </th>
              <th
                scope="col"
                className="px-2 py-1.5 text-left font-semibold text-muted-foreground"
              >
                Target
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border/35 last:border-0">
                <td className="px-2 py-1.5 align-top text-muted-foreground">
                  {getCellDependencyKindLabel(row.kind)}
                </td>
                <td className="px-2 py-1.5 align-top">
                  <DependencyTarget
                    row={row}
                    onCellSelect={onCellSelect}
                    onTechSelect={onTechSelect}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
