import { memo, useMemo, useState } from 'react'
import { Filter, Info, PanelRight } from 'lucide-react'
import { IconTooltip } from '@/components/editor/IconTooltip'
import { Button } from '@/components/ui/button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { buildBlueprintCellSelectionForId } from '@/lib/blueprintCellConnections'
import { focusCompareCells, jumpToCompareStep } from '@/lib/compareZoneNavigation'
import {
  compareSlotFocusCellIds,
  countActiveCompareFilters,
  countCompareDifferences,
  deriveCompareStepGroups,
  filterCompareSlots,
  getDetailOnlyCompareSlots,
  type CompareStepGroup,
} from '@/lib/compareLedger'
import {
  setCompareActiveStep,
  setCompareFilters,
  useCompareReviewState,
  type CompareReviewRegistration,
} from '@/lib/compareReviewStore'
import type { CompareSlot, CompareStatus } from '@/lib/compareSlots'
import {
  getBlueprintLayerStyle,
  getBlueprintLayerZone,
} from '@/lib/blueprintTheme'
import { getPathBadgeStyle, getPathColor } from '@/lib/pathColorTheme'
import { cn } from '@/lib/utils'
import type { BlueprintCellSelection } from '@/types/blueprintCellDetail'

const MONO_NUM_CLASS = 'font-mono tabular-nums'

type CompareDifferencesSurfaceProps = {
  registration: CompareReviewRegistration
  /** ⇱ hand-off: open this cell on the Details surface (selection built here). */
  onOpenCell: (selection: BlueprintCellSelection) => void
}

function VerdictChip({ verdict }: { verdict: CompareStatus }) {
  if (verdict === 'only') {
    return (
      <span
        className={cn(
          'inline-flex shrink-0 items-center rounded px-1 py-px text-3xs leading-none',
          MONO_NUM_CLASS,
          'bg-info/10 text-info',
        )}
        title="Present in only one path"
      >
        +
      </span>
    )
  }
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded px-1 py-px text-3xs leading-none',
        MONO_NUM_CLASS,
        'bg-warning/10 text-warning',
      )}
      title="Paths diverge here"
    >
      ≠
    </span>
  )
}

type CompareDiffRowProps = {
  slot: CompareSlot
  pathIds: readonly string[]
  laneSwatchColor: string | undefined
  onFocusSlot: (slot: CompareSlot) => void
  onOpenSlotCell: (slot: CompareSlot) => void
}

/** One difference row: lane cell, one quote cell per path, ghost ⇱. */
const CompareDiffRow = memo(function CompareDiffRow({
  slot,
  pathIds,
  laneSwatchColor,
  onFocusSlot,
  onOpenSlotCell,
}: CompareDiffRowProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      className="group/diffrow col-span-full grid grid-cols-subgrid items-start gap-x-2 rounded-md px-1 py-1.5 text-left hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      onClick={() => onFocusSlot(slot)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onFocusSlot(slot)
        }
      }}
      aria-label={`Show ${slot.laneLabel} at ${slot.columnLabel} on the board`}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-[3px]"
          style={{ backgroundColor: laneSwatchColor ?? 'var(--muted)' }}
        />
        <span
          className="min-w-0 truncate text-2xs text-muted-foreground"
          title={slot.laneLabel}
        >
          {slot.laneLabel}
        </span>
        <VerdictChip verdict={slot.verdict} />
      </div>
      {pathIds.map((pathId) => {
        const entry = slot.perPath[pathId]
        return (
          <div key={pathId} className="min-w-0 text-2xs leading-snug">
            {entry?.present ? (
              <span className="line-clamp-2 text-foreground/85">
                {entry.contents.join(' · ')}
              </span>
            ) : (
              <span aria-label="absent" className="text-muted-foreground/60">
                —
              </span>
            )}
          </div>
        )
      })}
      <div className="flex justify-end">
        <IconTooltip
          label={`Open ${slot.laneLabel} at ${slot.columnLabel} in Details`}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-5 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-(--motion-micro) group-hover/diffrow:opacity-100 group-focus-within/diffrow:opacity-100 focus-visible:opacity-100 hover:text-foreground"
            aria-label={`Open ${slot.laneLabel} at ${slot.columnLabel} in Details`}
            onClick={(event) => {
              event.stopPropagation()
              onOpenSlotCell(slot)
            }}
          >
            <PanelRight className="size-3" aria-hidden />
          </Button>
        </IconTooltip>
      </div>
    </div>
  )
})

function DiffTable({
  slots,
  registration,
  onFocusSlot,
  onOpenSlotCell,
  laneSwatchByKey,
}: {
  slots: readonly CompareSlot[]
  registration: CompareReviewRegistration
  onFocusSlot: (slot: CompareSlot) => void
  onOpenSlotCell: (slot: CompareSlot) => void
  laneSwatchByKey: ReadonlyMap<string, string>
}) {
  const pathIds = registration.blueprints.map((blueprint) => blueprint.path.id)
  if (slots.length === 0) {
    return (
      <p className="px-1 py-2 text-2xs text-muted-foreground">
        No differences match the current filter.
      </p>
    )
  }
  return (
    <div
      className="grid gap-y-px"
      style={{
        gridTemplateColumns: `minmax(5.25rem, 0.9fr) repeat(${pathIds.length}, minmax(0, 1.3fr)) 1.5rem`,
      }}
    >
      {/* Path column headers: short name over a 3px rail in the path color. */}
      <div aria-hidden />
      {registration.blueprints.map((blueprint) => (
        <div
          key={blueprint.path.id}
          className="min-w-0 border-t-[3px] pt-1 pb-0.5 pr-2"
          style={{ borderTopColor: getPathColor(blueprint.path) }}
        >
          <span
            className="block truncate text-3xs font-medium text-muted-foreground"
            title={blueprint.path.name}
          >
            {blueprint.path.name}
          </span>
        </div>
      ))}
      <div aria-hidden />
      {slots.map((slot) => (
        <CompareDiffRow
          key={slot.slotKey}
          slot={slot}
          pathIds={pathIds}
          laneSwatchColor={laneSwatchByKey.get(slot.laneKey)}
          onFocusSlot={onFocusSlot}
          onOpenSlotCell={onOpenSlotCell}
        />
      ))}
    </div>
  )
}

function FilterChip({
  label,
  pressed,
  onToggle,
}: {
  label: string
  pressed: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      className={cn(
        'rounded-full border px-2 py-0.5 text-2xs leading-tight transition-colors duration-(--motion-micro)',
        pressed
          ? 'border-foreground/50 bg-foreground/10 text-foreground'
          : 'border-border text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
    </button>
  )
}

/**
 * The Differences surface — Compare v3's ledger, the authoritative
 * enumeration of every difference between the compared paths.
 *
 * One accordion group PER STEP (canonical column) that has a canvas
 * difference, in canonical order, one open at a time; detail-only
 * (description/links) diffs in a trailing unnumbered group. A single step
 * group with nothing after it renders flat — accordion chrome around one
 * group is furniture. Opening a group flies the camera to that step's cells:
 * accordion + fly is ONE gesture, through the shared active-step cursor the
 * divergence strip reads too.
 *
 * Counts: exactly one per group, at the END of its header row, post-filter.
 * There is no total anywhere on this surface — the menubar Diff pill owns
 * that number.
 */
export function CompareDifferencesSurface({
  registration,
  onOpenCell,
}: CompareDifferencesSurfaceProps) {
  const { activeStepKey, filters } = useCompareReviewState()
  const [detailOpen, setDetailOpen] = useState(false)

  const model = registration.model
  const stepGroups = useMemo(() => deriveCompareStepGroups(model), [model])
  const detailOnlySlots = useMemo(() => getDetailOnlyCompareSlots(model), [model])
  const totalCount = useMemo(() => countCompareDifferences(model), [model])

  // Lane facets (order of first appearance) + swatch colors resolved the
  // way the cell panel resolves its lane chip: layer_role first, name second.
  const { laneFacets, laneSwatchByKey } = useMemo(() => {
    const facets: Array<{ key: string; label: string }> = []
    const seen = new Set<string>()
    const swatches = new Map<string, string>()
    for (const slot of model.slots) {
      if (seen.has(slot.laneKey)) continue
      seen.add(slot.laneKey)
      facets.push({ key: slot.laneKey, label: slot.laneLabel })
    }
    for (const blueprint of registration.blueprints) {
      for (const layer of blueprint.layers) {
        const key = facets.find((facet) => facet.label === layer.name)?.key
        if (!key || swatches.has(key)) continue
        const zone = getBlueprintLayerZone(layer, blueprint.layers)
        swatches.set(key, getBlueprintLayerStyle(layer.name, zone, layer.role).lane)
      }
    }
    return { laneFacets: facets, laneSwatchByKey: swatches }
  }, [model, registration.blueprints])

  const flyTo = (cellIds: string[]) => {
    if (cellIds.length === 0) return
    // The shared compare gesture (one owner for step activation + camera).
    void focusCompareCells(cellIds, registration.slideId)
  }

  const openStepGroup = (group: CompareStepGroup | null) => {
    setDetailOpen(false)
    if (!group) {
      setCompareActiveStep(null)
      return
    }
    // The one step-activation gesture — same path the strip and
    // `jump_divergence` take, so the cursor never forks.
    void jumpToCompareStep(group, registration.slideId)
  }

  const handleFocusSlot = (slot: CompareSlot) => {
    flyTo(compareSlotFocusCellIds(slot))
  }

  const handleOpenSlotCell = (slot: CompareSlot) => {
    for (const blueprint of registration.blueprints) {
      const entry = slot.perPath[blueprint.path.id]
      if (!entry?.present) continue
      const selection = buildBlueprintCellSelectionForId(
        blueprint,
        entry.cellIds[0],
        registration.scenarioName,
        registration.phaseName,
      )
      if (selection) {
        flyTo(compareSlotFocusCellIds(slot))
        onOpenCell(selection)
        return
      }
    }
  }

  const activeFilterCount = countActiveCompareFilters(filters)
  const filteredStepSlots = (group: CompareStepGroup) =>
    filterCompareSlots(group.slots, filters)
  const filteredDetailSlots = filterCompareSlots(detailOnlySlots, filters)

  const toggleLane = (laneKey: string) => {
    setCompareFilters({
      ...filters,
      lanes: filters.lanes.includes(laneKey)
        ? filters.lanes.filter((key) => key !== laneKey)
        : [...filters.lanes, laneKey],
    })
  }
  const toggleVerdict = (verdict: CompareStatus) => {
    setCompareFilters({
      ...filters,
      verdicts: filters.verdicts.includes(verdict)
        ? filters.verdicts.filter((entry) => entry !== verdict)
        : [...filters.verdicts, verdict],
    })
  }
  const toggleStep = (columnKey: string) => {
    setCompareFilters({
      ...filters,
      steps: filters.steps.includes(columnKey)
        ? filters.steps.filter((key) => key !== columnKey)
        : [...filters.steps, columnKey],
    })
  }

  /*
    Group header row: label first, the group's single post-filter count last
    and right-aligned. No zone chip — the header already says "Step N", and a
    second number beside it was the repetition the user called out. The strip
    keeps its chips: there, ①②③ is the run topology, not a step.
  */
  const groupHeader = (label: string, count: number, title?: string) => (
    <span className="flex min-w-0 flex-1 items-center gap-1.5">
      <span
        className="min-w-0 truncate text-2xs font-medium text-foreground"
        title={title}
      >
        {label}
      </span>
      <span
        className={cn(
          'ml-auto shrink-0 pl-2 text-2xs text-muted-foreground',
          MONO_NUM_CLASS,
        )}
      >
        {count}
      </span>
    </span>
  )

  // Controlled accordion: the store owns the active step (shared with the
  // strip and jump_divergence); `detailOpen` is surface-local. One at a time.
  const accordionValue: string[] =
    activeStepKey !== null && stepGroups.some((g) => g.columnKey === activeStepKey)
      ? [`step-${activeStepKey}`]
      : detailOpen
        ? ['detail']
        : []

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4 blueprint-scroll">
      {/* Header: who is being compared, the filter, the comparison's limits.
          Deliberately countless — see the surface docblock. */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            {registration.blueprints.map((blueprint, index) => (
              <span
                key={blueprint.path.id}
                className="flex min-w-0 items-center gap-1.5"
              >
                {index > 0 ? (
                  <span className="text-2xs text-muted-foreground">vs</span>
                ) : null}
                <span
                  className="max-w-32 truncate rounded-full px-2 py-0.5 text-3xs font-medium leading-tight"
                  data-blueprint-fill
                  style={getPathBadgeStyle(blueprint.path)}
                  title={blueprint.path.name}
                >
                  {blueprint.path.name}
                </span>
              </span>
            ))}
          </div>
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 shrink-0 gap-1 px-2 text-2xs text-muted-foreground hover:text-foreground"
                />
              }
            >
              <Filter className="size-3" aria-hidden />
              Filter
              {activeFilterCount > 0 ? (
                <span className={cn('text-3xs', MONO_NUM_CLASS)}>
                  {activeFilterCount}
                </span>
              ) : null}
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 gap-2 p-3">
              <p className="text-3xs font-medium uppercase tracking-wide text-muted-foreground">
                Lanes
              </p>
              <div className="flex flex-wrap gap-1">
                {laneFacets.map((facet) => (
                  <FilterChip
                    key={facet.key}
                    label={facet.label}
                    pressed={filters.lanes.includes(facet.key)}
                    onToggle={() => toggleLane(facet.key)}
                  />
                ))}
              </div>
              <p className="pt-1 text-3xs font-medium uppercase tracking-wide text-muted-foreground">
                Verdict
              </p>
              <div className="flex flex-wrap gap-1">
                <FilterChip
                  label="≠ divergent"
                  pressed={filters.verdicts.includes('divergent')}
                  onToggle={() => toggleVerdict('divergent')}
                />
                <FilterChip
                  label="+ only in one path"
                  pressed={filters.verdicts.includes('only')}
                  onToggle={() => toggleVerdict('only')}
                />
              </div>
              {/* Steps facet: divergent steps only, in canonical order — a
                  filter for a step with no differences filters to nothing. */}
              {stepGroups.length > 0 ? (
                <>
                  <p className="pt-1 text-3xs font-medium uppercase tracking-wide text-muted-foreground">
                    Steps
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {stepGroups.map((group) => (
                      <FilterChip
                        key={group.columnKey}
                        label={`${group.step} · ${group.label}`}
                        pressed={filters.steps.includes(group.columnKey)}
                        onToggle={() => toggleStep(group.columnKey)}
                      />
                    ))}
                  </div>
                </>
              ) : null}
              <p className="pt-1 text-3xs text-muted-foreground">
                Nothing selected = everything shown.
              </p>
            </PopoverContent>
          </Popover>
        </div>
        <p className="flex items-center gap-1 text-3xs text-muted-foreground/80">
          <Info className="size-3 shrink-0" aria-hidden />
          triggers/needs are not compared
        </p>
      </div>

      {totalCount === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">
          Paths identical across{' '}
          <span className={MONO_NUM_CLASS}>{model.columns.length}</span> steps.
        </p>
      ) : stepGroups.length === 1 && detailOnlySlots.length === 0 ? (
        /* Exactly one step, nothing else: flat table, no accordion chrome. */
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 border-b border-muted pb-1.5">
            {groupHeader(
              stepGroups[0].headerLabel,
              filteredStepSlots(stepGroups[0]).length,
              stepGroups[0].label,
            )}
          </div>
          <DiffTable
            slots={filteredStepSlots(stepGroups[0])}
            registration={registration}
            onFocusSlot={handleFocusSlot}
            onOpenSlotCell={handleOpenSlotCell}
            laneSwatchByKey={laneSwatchByKey}
          />
        </div>
      ) : (
        <Accordion
          value={accordionValue}
          onValueChange={(value) => {
            const next = (value[0] as string | undefined) ?? null
            if (next === 'detail') {
              setDetailOpen(true)
              setCompareActiveStep(null)
              return
            }
            if (next === null) {
              openStepGroup(null)
              return
            }
            const columnKey = next.slice('step-'.length)
            openStepGroup(
              stepGroups.find((group) => group.columnKey === columnKey) ?? null,
            )
          }}
        >
          {stepGroups.map((group) => (
            <AccordionItem key={group.columnKey} value={`step-${group.columnKey}`}>
              <AccordionTrigger className="w-full min-w-0 gap-1.5 py-2 hover:no-underline">
                {groupHeader(
                  group.headerLabel,
                  filteredStepSlots(group).length,
                  group.label,
                )}
              </AccordionTrigger>
              <AccordionContent>
                <DiffTable
                  slots={filteredStepSlots(group)}
                  registration={registration}
                  onFocusSlot={handleFocusSlot}
                  onOpenSlotCell={handleOpenSlotCell}
                  laneSwatchByKey={laneSwatchByKey}
                />
              </AccordionContent>
            </AccordionItem>
          ))}
          {detailOnlySlots.length > 0 ? (
            <AccordionItem value="detail">
              <AccordionTrigger className="w-full min-w-0 gap-1.5 py-2 hover:no-underline">
                {groupHeader(
                  'Detail-only differences',
                  filteredDetailSlots.length,
                )}
              </AccordionTrigger>
              <AccordionContent>
                <DiffTable
                  slots={filteredDetailSlots}
                  registration={registration}
                  onFocusSlot={handleFocusSlot}
                  onOpenSlotCell={handleOpenSlotCell}
                  laneSwatchByKey={laneSwatchByKey}
                />
              </AccordionContent>
            </AccordionItem>
          ) : null}
        </Accordion>
      )}
    </div>
  )
}
