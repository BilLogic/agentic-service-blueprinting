import {
  ArrowDown,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUp,
  ExternalLink,
  Plus,
} from 'lucide-react'
import type { CellDependencyRow } from '@/lib/blueprintCellDependencies'
import type {
  FlowConnectionDirection,
  FlowInteractionDirection,
} from '@/lib/blueprintCellConnections'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { TechPillFace } from '@/components/blueprint/TechPillFace'
import { useBlueprintCellDetailOptional } from '@/contexts/BlueprintCellDetailContext'
import { cn } from '@/lib/utils'

function DirectionIcon({
  direction,
}: {
  direction?: FlowConnectionDirection | FlowInteractionDirection
}) {
  const solidClass = 'size-3 shrink-0 text-muted-foreground/70'
  const relatedClass = 'size-3 shrink-0 text-muted-foreground/70'

  if (direction === 'up') {
    return <ArrowUp className={solidClass} aria-hidden />
  }
  if (direction === 'down') {
    return <ArrowDown className={solidClass} aria-hidden />
  }
  if (direction === 'both') {
    return <ArrowLeftRight className={solidClass} aria-hidden />
  }
  if (direction === 'prev') {
    return <ArrowLeft className={solidClass} aria-hidden />
  }
  if (direction === 'next') {
    return <ArrowRight className={solidClass} aria-hidden />
  }

  // Same-step relationship without an explicit directional connection.
  return <Plus className={relatedClass} aria-hidden />
}

function ConnectionTarget({
  row,
  onCellSelect,
  onTechSelect,
}: {
  row: CellDependencyRow
  onCellSelect: (cellId: string) => void
  onTechSelect: (cellId: string, techItem: string) => void
}) {
  const detail = useBlueprintCellDetailOptional()
  const isInteractive = Boolean(row.cellId)
  const title = row.layerLabel ?? row.label

  const handlePreviewEnter = () => {
    if (!row.cellId || !detail) return
    detail.setPreviewHover({
      cellId: row.cellId,
      techItem: row.techItem ?? null,
    })
  }

  const handlePreviewLeave = () => {
    detail?.setPreviewHover(null)
  }

  const content = (
    <>
      <DirectionIcon direction={row.direction} />
      {row.techItem ? (
        <span className="flex min-w-0 flex-col items-start gap-0.5 text-left">
          <span className="min-w-0 truncate font-normal text-foreground/90">
            {title}
          </span>
          <span className="flex min-w-0 items-center gap-1.5">
            {row.stepLabel ? (
              <span className="truncate text-[10px] text-muted-foreground">
                {row.stepLabel}
              </span>
            ) : null}
            <TechPillFace
              item={row.techItem}
              compact
              asSpan
              className="!w-fit max-w-full !px-2 !py-0.5 !text-[9px] !font-normal leading-none text-foreground/75"
            />
          </span>
        </span>
      ) : (
        <span className="flex min-w-0 flex-col items-start gap-0.5 text-left">
          <span className="min-w-0 truncate font-normal text-foreground/90">
            {title}
          </span>
          {row.stepLabel ? (
            <span className="truncate text-[10px] text-muted-foreground">
              {row.stepLabel}
            </span>
          ) : row.detail && row.detail !== title ? (
            <span className="truncate text-[10px] text-muted-foreground">
              {row.detail}
            </span>
          ) : null}
        </span>
      )}
    </>
  )

  if (!isInteractive || !row.cellId) {
    return (
      <div className="flex w-full min-w-0 items-start justify-start gap-[7px] text-[11px] leading-snug">
        {content}
      </div>
    )
  }

  const handleClick = () => {
    detail?.setPreviewHover(null)
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
        'flex w-full min-w-0 items-start justify-start gap-[7px] text-left text-[11px] leading-snug',
        'text-foreground/85 transition-colors hover:text-foreground',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
      )}
      onMouseEnter={handlePreviewEnter}
      onMouseLeave={handlePreviewLeave}
      onFocus={handlePreviewEnter}
      onBlur={handlePreviewLeave}
      onClick={handleClick}
    >
      {content}
    </button>
  )
}

function LinkTarget({ row }: { row: CellDependencyRow }) {
  if (!row.href) return null

  return (
    <a
      href={row.href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'flex w-full min-w-0 items-center justify-start gap-[7px] text-[11px] leading-snug',
        'font-normal text-foreground/90 transition-colors hover:text-foreground',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
      )}
    >
      <ExternalLink className="size-3 shrink-0 text-muted-foreground/70" aria-hidden />
      <span className="min-w-0 truncate">{row.label}</span>
    </a>
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

  const connections = rows.filter((row) => row.kind !== 'link')
  const links = rows.filter((row) => row.kind === 'link' && row.href)
  const hasLinks = links.length > 0
  const defaultTab = connections.length > 0 ? 'dependencies' : 'relevant-links'

  return (
    <Tabs defaultValue={defaultTab} className="gap-2">
      <TabsList
        variant="line"
        className="h-auto w-full justify-start gap-5 rounded-none border-b border-border/60 p-0"
      >
        {connections.length > 0 ? (
          <TabsTrigger
            value="dependencies"
            className="h-auto flex-none rounded-none px-0 pb-2 pt-0 text-[10px] font-normal text-muted-foreground/50 hover:text-muted-foreground/80 data-active:text-foreground/90 after:bottom-[-1px] after:bg-foreground/70"
          >
            Dependencies
          </TabsTrigger>
        ) : null}
        {hasLinks ? (
          <TabsTrigger
            value="relevant-links"
            className="h-auto flex-none rounded-none px-0 pb-2 pt-0 text-[10px] font-normal text-muted-foreground/50 hover:text-muted-foreground/80 data-active:text-foreground/90 after:bottom-[-1px] after:bg-foreground/70"
          >
            Relevant Links
          </TabsTrigger>
        ) : null}
      </TabsList>

      {connections.length > 0 ? (
        <TabsContent value="dependencies">
          <div className="overflow-hidden rounded-lg">
            <table className="w-full border-collapse text-[11px]">
              <tbody>
                {connections.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border/35 transition-colors hover:bg-muted/50 focus-within:bg-muted/50 last:border-0"
                  >
                    <td className="px-2 py-1.5 align-middle">
                      <ConnectionTarget
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
        </TabsContent>
      ) : null}

      {hasLinks ? (
        <TabsContent value="relevant-links">
          <div className="overflow-hidden rounded-lg">
            <table className="w-full border-collapse text-[11px]">
              <tbody>
                {links.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border/35 transition-colors hover:bg-muted/50 focus-within:bg-muted/50 last:border-0"
                  >
                    <td className="px-2 py-1.5 align-middle">
                      <LinkTarget row={row} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      ) : null}
    </Tabs>
  )
}
