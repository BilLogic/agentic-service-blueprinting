import type { ReactNode } from 'react'
import {
  ArrowDown,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUp,
  Plus,
} from 'lucide-react'
import { TechPillFace } from '@/components/blueprint/TechPillFace'
import { useBlueprintCellDetailOptional } from '@/contexts/BlueprintCellDetailContext'
import type {
  BlueprintCellConnection,
  BlueprintCellConnections,
} from '@/lib/blueprintCellConnections'
import { cn } from '@/lib/utils'

export type CellDependencyTechEntry = {
  id: string
  cellId: string
  item: string
  layerName?: string
  stepIndex?: number
}

type SelectHandlers = {
  onCellSelect: (cellId: string) => void
  onTechSelect: (cellId: string, techItem: string) => void
}

type RowDirection = 'prev' | 'next' | 'both' | 'up' | 'down' | 'related'

/** Indents wrapped detail lines under the label: DirectionIcon width (size-3, 12px) + the row's 7px gap. */
const detailIndentClass = 'pl-[19px]'

/** Which list(s) a connection came from — drives the direction glyph. */
type RowFlow = 'in' | 'out' | 'both'

function resolveRowDirection(
  connection: BlueprintCellConnection,
  flow: RowFlow,
  selectedLayerRowPosition: number,
): RowDirection {
  if (connection.kind === 'interaction') {
    // Same step, different lane — vertical relationship.
    if (selectedLayerRowPosition < 0) return 'related'
    return connection.layerRowPosition < selectedLayerRowPosition
      ? 'up'
      : 'down'
  }
  if (flow === 'both') return 'both'
  return flow === 'in' ? 'prev' : 'next'
}

function DirectionIcon({ direction }: { direction: RowDirection }) {
  const iconClass = 'size-3 shrink-0 text-muted-foreground/70'

  switch (direction) {
    case 'up':
      return <ArrowUp className={iconClass} aria-hidden />
    case 'down':
      return <ArrowDown className={iconClass} aria-hidden />
    case 'both':
      return <ArrowLeftRight className={iconClass} aria-hidden />
    case 'prev':
      return <ArrowLeft className={iconClass} aria-hidden />
    case 'next':
      return <ArrowRight className={iconClass} aria-hidden />
    default:
      // Same-step relationship without an explicit directional connection.
      return <Plus className={iconClass} aria-hidden />
  }
}

function DependencyRow({
  connection,
  direction,
  onCellSelect,
  onTechSelect,
}: {
  connection: BlueprintCellConnection
  direction: RowDirection
} & SelectHandlers) {
  const detail = useBlueprintCellDetailOptional()

  const preview = (techItem: string | null) => {
    detail?.setPreviewHover({ cellId: connection.cellId, techItem })
  }
  const clearPreview = () => detail?.setPreviewHover(null)

  return (
    <li className="group border-b border-muted last:border-0">
      <div className="flex flex-col gap-0.5 px-2 py-1.5 text-xs leading-snug transition-colors group-hover:bg-accent group-focus-within:bg-accent">
        <button
          type="button"
          className="flex min-w-0 flex-col items-stretch gap-0.5 text-left text-foreground/85 transition-colors hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
          onMouseEnter={() => preview(null)}
          onMouseLeave={clearPreview}
          onFocus={() => preview(null)}
          onBlur={clearPreview}
          onClick={() => {
            clearPreview()
            onCellSelect(connection.cellId)
          }}
        >
          <span className="flex min-w-0 items-center gap-[7px]">
            <DirectionIcon direction={direction} />
            <span className="min-w-0 truncate font-normal text-foreground/90">
              {connection.layerName}
              <span className="text-muted-foreground">
                {' '}
                · Step {connection.stepIndex + 1}
              </span>
            </span>
            {connection.linkLabel ? (
              <span className="shrink-0 rounded-full border border-border bg-muted px-1.5 py-px text-3xs leading-tight text-muted-foreground">
                {connection.linkLabel}
              </span>
            ) : null}
          </span>
          {connection.contentPreview && !connection.isTech ? (
            <span className={cn('truncate text-2xs text-muted-foreground', detailIndentClass)}>
              {connection.contentPreview}
            </span>
          ) : null}
          {connection.linkNote ? (
            <span className={cn('text-2xs leading-snug text-muted-foreground italic', detailIndentClass)}>
              {connection.linkNote}
            </span>
          ) : null}
        </button>
        {connection.isTech && connection.techItems.length > 0 ? (
          <span className={cn('flex flex-wrap gap-1 pt-0.5', detailIndentClass)}>
            {connection.techItems.map((item) => (
              <button
                key={item}
                type="button"
                className="focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                onMouseEnter={() => preview(item)}
                onMouseLeave={clearPreview}
                onFocus={() => preview(item)}
                onBlur={clearPreview}
                onClick={() => {
                  clearPreview()
                  onTechSelect(connection.cellId, item)
                }}
              >
                <TechPillFace
                  item={item}
                  compact
                  asSpan
                  inline
                  className="!w-fit max-w-full !px-2 !py-0.5 !text-3xs !font-normal leading-none text-foreground/75"
                />
              </button>
            ))}
          </span>
        ) : null}
      </div>
    </li>
  )
}

function DependencyGroup({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-3xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </p>
      <ul className="flex flex-col">{children}</ul>
    </div>
  )
}

type CellDependencySectionsProps = {
  connections: BlueprintCellConnections
  /** Same-step tech without an explicit trigger (kept from panel v1). */
  otherTech: CellDependencyTechEntry[]
  /** Lane row position of the selected cell — orients up/down glyphs. */
  selectedLayerRowPosition?: number
  className?: string
} & SelectHandlers

/**
 * Dependencies tab: grouped SET OFF BY (incoming triggers) / SETS OFF
 * (outgoing triggers) / NEEDS (functional links, both directions). Rows keep
 * the hover-preview and click-to-navigate behavior, with the direction
 * glyphs and indented detail lines from the previous dependency table.
 * Read-only — link editing is an agent path.
 */
export function CellDependencySections({
  connections,
  otherTech,
  selectedLayerRowPosition = -1,
  onCellSelect,
  onTechSelect,
  className,
}: CellDependencySectionsProps) {
  const setOffBy = connections.incoming.filter(
    (connection) => connection.linkKind === 'trigger',
  )
  const setsOff = connections.outgoing.filter(
    (connection) => connection.linkKind === 'trigger',
  )

  const needsById = new Map<
    string,
    { connection: BlueprintCellConnection; flow: RowFlow }
  >()
  for (const connection of connections.incoming) {
    if (connection.linkKind !== 'needs') continue
    if (!needsById.has(connection.triggerId)) {
      needsById.set(connection.triggerId, { connection, flow: 'in' })
    }
  }
  for (const connection of connections.outgoing) {
    if (connection.linkKind !== 'needs') continue
    const existing = needsById.get(connection.triggerId)
    if (existing) {
      existing.flow = 'both'
    } else {
      needsById.set(connection.triggerId, { connection, flow: 'out' })
    }
  }
  const needs = [...needsById.values()]

  const linkedTechIds = new Set(
    [...connections.incoming, ...connections.outgoing].flatMap((connection) =>
      connection.techItems.map((item) => `${connection.cellId}:${item}`),
    ),
  )
  const remainingTech = otherTech.filter(
    (entry) => !linkedTechIds.has(entry.id),
  )

  if (
    setOffBy.length === 0 &&
    setsOff.length === 0 &&
    needs.length === 0 &&
    remainingTech.length === 0
  ) {
    return (
      <p className={cn('text-xs text-muted-foreground', className)}>
        No dependencies recorded for this cell.
      </p>
    )
  }

  const handlers = { onCellSelect, onTechSelect }
  const direction = (connection: BlueprintCellConnection, flow: RowFlow) =>
    resolveRowDirection(connection, flow, selectedLayerRowPosition)

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {setOffBy.length > 0 ? (
        <DependencyGroup title="Set off by">
          {setOffBy.map((connection) => (
            <DependencyRow
              key={`in:${connection.triggerId}`}
              connection={connection}
              direction={direction(connection, 'in')}
              {...handlers}
            />
          ))}
        </DependencyGroup>
      ) : null}
      {setsOff.length > 0 ? (
        <DependencyGroup title="Sets off">
          {setsOff.map((connection) => (
            <DependencyRow
              key={`out:${connection.triggerId}`}
              connection={connection}
              direction={direction(connection, 'out')}
              {...handlers}
            />
          ))}
        </DependencyGroup>
      ) : null}
      {needs.length > 0 ? (
        <DependencyGroup title="Needs">
          {needs.map(({ connection, flow }) => (
            <DependencyRow
              key={`needs:${connection.triggerId}`}
              connection={connection}
              direction={direction(connection, flow)}
              {...handlers}
            />
          ))}
        </DependencyGroup>
      ) : null}
      {remainingTech.length > 0 ? (
        <DependencyGroup title="Tech in this step">
          <li className="px-2 py-1.5">
            <span className="flex flex-wrap gap-1">
              {remainingTech.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className="focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                  onClick={() => onTechSelect(entry.cellId, entry.item)}
                >
                  <TechPillFace
                    item={entry.item}
                    compact
                    asSpan
                    inline
                    className="!w-fit max-w-full !px-2 !py-0.5 !text-3xs !font-normal leading-none text-foreground/75"
                  />
                </button>
              ))}
            </span>
          </li>
        </DependencyGroup>
      ) : null}
    </div>
  )
}
