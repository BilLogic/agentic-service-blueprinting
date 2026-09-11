import type { ReactNode } from 'react'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Plus,
} from 'lucide-react'
import { TouchpointCellFace } from '@/components/blueprint/TouchpointCellFace'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
  laneName?: string
  stepIndex?: number
}

type SelectHandlers = {
  onCellSelect: (cellId: string) => void
  onTechSelect: (cellId: string, techItem: string) => void
}

type RowDirection = 'prev' | 'next' | 'up' | 'down' | 'related'

/** Indents wrapped detail lines under the label: DirectionIcon width (size-3, 12px) + the row's 7px gap. */
const detailIndentClass = 'pl-[19px]'

/** Which list(s) a connection came from — drives the direction glyph. */
type RowFlow = 'in' | 'out'

function resolveRowDirection(
  connection: BlueprintCellConnection,
  flow: RowFlow,
  selectedLaneRowPosition: number,
): RowDirection {
  if (connection.kind === 'interaction') {
    // Same step, different lane — vertical relationship.
    if (selectedLaneRowPosition < 0) return 'related'
    return connection.laneRowPosition < selectedLaneRowPosition
      ? 'up'
      : 'down'
  }
  return flow === 'in' ? 'prev' : 'next'
}

function DirectionIcon({ direction }: { direction: RowDirection }) {
  const iconClass = 'size-3 shrink-0 text-muted-foreground/70'

  switch (direction) {
    case 'up':
      return <ArrowUp className={iconClass} aria-hidden />
    case 'down':
      return <ArrowDown className={iconClass} aria-hidden />
    case 'prev':
      return <ArrowLeft className={iconClass} aria-hidden />
    case 'next':
      return <ArrowRight className={iconClass} aria-hidden />
    default:
      // Same-step relationship without an explicit directional connection.
      return <Plus className={iconClass} aria-hidden />
  }
}

/**
 * The why-line waits for a reader, and asks one row's space to do it in.
 *
 * A dependency row already says WHAT it points at — the lane and the step. The
 * note says WHY the edge exists, which is worth reading one row at a time and
 * not worth reading down a list of eight. Revealed by opacity it still held
 * its line, so a list of eight rows drew sixteen and the list's shape depended
 * on how talkative its author had been. Read from a tooltip, eight rows draw
 * eight.
 *
 * A tooltip is not an accessible name — `IconTooltip` states that rule, and
 * this Base UI version is the proof of it: the popup carries neither
 * `role="tooltip"` nor an `aria-describedby` back to the trigger, and the
 * trigger's hover interaction is `mouseOnly`, so a touch never opens it at
 * all. The sentence therefore stays in the DOM, inside the row's own button,
 * and only a FINE pointer trades the printed line for the popup: a screen
 * reader reads the note as part of the row's name, a touch reader sees it
 * printed where it has always been, and a keyboard reader gets the popup
 * because the same trigger opens on focus as well as on hover.
 *
 * Conditioned on the pointer being fine rather than on its not being coarse,
 * so a device reporting no pointer at all — where nothing hovers and nothing
 * taps — keeps the printed line rather than losing it to a rule about mice.
 */
const WHY_LINE_QUIET_CLASS = '[@media(pointer:fine)]:sr-only'

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

  const row = (
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
          {connection.laneName}
          <span className="text-muted-foreground">
            {' '}
            · Step {connection.stepIndex + 1}
          </span>
        </span>
      </span>
      {connection.contentPreview && !connection.isTech ? (
        <span className={cn('truncate text-xs text-muted-foreground', detailIndentClass)}>
          {connection.contentPreview}
        </span>
      ) : null}
      {connection.linkNote ? (
        <span className={cn(WHY_LINE_QUIET_CLASS, 'text-xs text-muted-foreground italic', detailIndentClass)}>
          {connection.linkNote}
        </span>
      ) : null}
    </button>
  )

  return (
    <li className="group border-b border-muted last:border-0">
      <div className="flex flex-col gap-0.5 px-2 py-1.5 text-xs transition-colors group-hover:bg-accent group-focus-within:bg-accent">
        {connection.linkNote ? (
          <Tooltip>
            <TooltipTrigger render={row} />
            <TooltipContent>{connection.linkNote}</TooltipContent>
          </Tooltip>
        ) : (
          row
        )}
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
                <TouchpointCellFace
                  item={item}
                  compact
                  asSpan
                  inline
                  // geometry: packs the name into the compact inline face, not a canvas cell.
                  className="!w-fit max-w-full !px-2 !py-0.5 !text-xs !font-normal leading-none text-foreground/75"
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
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {title}
      </p>
      <ul className="flex flex-col">{children}</ul>
    </div>
  )
}

type CellDependencySectionsProps = {
  connections: BlueprintCellConnections
  /** Same-step tech without an explicit dependency (kept from panel v1). */
  otherTech: CellDependencyTechEntry[]
  /** Lane row position of the selected cell — orients up/down glyphs. */
  selectedLaneRowPosition?: number
  className?: string
} & SelectHandlers

/**
 * Dependencies tab: grouped SET OFF BY (incoming dependencies) / SETS OFF
 * (outgoing dependencies) / NEEDS (functional links, both directions). Rows keep
 * the hover-preview and click-to-navigate behavior, with the direction
 * glyphs and indented detail lines from the previous dependency table.
 * Read-only — link editing is an agent path.
 */
export function CellDependencySections({
  connections,
  otherTech,
  selectedLaneRowPosition = -1,
  onCellSelect,
  onTechSelect,
  className,
}: CellDependencySectionsProps) {
  const follows = connections.incoming.filter(
    (connection) => connection.linkKind === 'leads_to',
  )
  const leadsTo = connections.outgoing.filter(
    (connection) => connection.linkKind === 'leads_to',
  )

  // The recorded kind, split by end the way the drawn kind is. One group for
  // both ends read "Enables › A" at the target, i.e. as this cell enabling A —
  // the inversion the rename existed to end. Each end gets its own word.
  const enabledBy = connections.incoming.filter(
    (connection) => connection.linkKind === 'enables',
  )
  const enables = connections.outgoing.filter(
    (connection) => connection.linkKind === 'enables',
  )

  const linkedTechIds = new Set(
    [...connections.incoming, ...connections.outgoing].flatMap((connection) =>
      connection.techItems.map((item) => `${connection.cellId}:${item}`),
    ),
  )
  const remainingTech = otherTech.filter(
    (entry) => !linkedTechIds.has(entry.id),
  )

  if (
    follows.length === 0 &&
    leadsTo.length === 0 &&
    enabledBy.length === 0 &&
    enables.length === 0 &&
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
    resolveRowDirection(connection, flow, selectedLaneRowPosition)

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {follows.length > 0 ? (
        <DependencyGroup title="Follows">
          {follows.map((connection) => (
            <DependencyRow
              key={`in:${connection.dependencyId}`}
              connection={connection}
              direction={direction(connection, 'in')}
              {...handlers}
            />
          ))}
        </DependencyGroup>
      ) : null}
      {leadsTo.length > 0 ? (
        <DependencyGroup title="Leads to">
          {leadsTo.map((connection) => (
            <DependencyRow
              key={`out:${connection.dependencyId}`}
              connection={connection}
              direction={direction(connection, 'out')}
              {...handlers}
            />
          ))}
        </DependencyGroup>
      ) : null}
      {enabledBy.length > 0 ? (
        <DependencyGroup title="Enabled by">
          {enabledBy.map((connection) => (
            <DependencyRow
              key={`enabled-by:${connection.dependencyId}`}
              connection={connection}
              direction={direction(connection, 'in')}
              {...handlers}
            />
          ))}
        </DependencyGroup>
      ) : null}
      {enables.length > 0 ? (
        <DependencyGroup title="Enables">
          {enables.map((connection) => (
            <DependencyRow
              key={`enables:${connection.dependencyId}`}
              connection={connection}
              direction={direction(connection, 'out')}
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
                  <TouchpointCellFace
                    item={entry.item}
                    compact
                    asSpan
                    inline
                    // geometry: packs the name into the compact inline face, not a canvas cell.
                  className="!w-fit max-w-full !px-2 !py-0.5 !text-xs !font-normal leading-none text-foreground/75"
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
