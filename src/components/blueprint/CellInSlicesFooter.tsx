import { ChevronRight } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { useViewState } from '@/contexts/viewStateStore'
import { useSlices, type SliceListEntry } from '@/hooks/useSlices'
import { resolveBlueprintCellId } from '@/lib/resolveBlueprintCellId'

function slicesContainingCell(
  slices: readonly SliceListEntry[],
  cellId: string,
): SliceListEntry[] {
  const resolved = resolveBlueprintCellId(cellId)
  return slices.filter((slice) =>
    slice.slice_items.some((item) =>
      item.cell_ids.some(
        (id) =>
          id === cellId ||
          id === resolved ||
          resolveBlueprintCellId(id) === resolved,
      ),
    ),
  )
}

type CellInSlicesFooterProps = {
  /** Raw selected cell id (integrated overlay ids resolve internally). */
  cellId: string | null
}

/**
 * Collapsible "In slices" footer — derived client-side from the shared
 * useSlices cache (no per-open membership query). On error it falls back to
 * the stale/fallback list, matching TabStrip and SlicesSidebarSection. Rows
 * open the slice tab.
 */
export function CellInSlicesFooter({ cellId }: CellInSlicesFooterProps) {
  const slices = useSlices()
  const { openTab } = useViewState()

  if (!cellId) return null

  const rows: SliceListEntry[] =
    slices.status === 'ready'
      ? slices.data
      : slices.status === 'error'
        ? (slices.fallback ?? [])
        : []

  const matches = slicesContainingCell(rows, cellId)
  if (matches.length === 0) return null

  return (
    <Collapsible className="shrink-0 border-t border-border px-4 py-2">
      <CollapsibleTrigger className="group/in-slices flex w-full items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ChevronRight
          className="size-3 transition-transform group-aria-expanded/in-slices:rotate-90"
          aria-hidden
        />
        In slices ({matches.length})
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="flex flex-col gap-0.5 pt-1.5 pb-1">
          {matches.map((slice) => (
            <li key={slice.id}>
              <button
                type="button"
                className="flex w-full min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-xs text-foreground/85 transition-colors hover:bg-accent hover:text-foreground"
                onClick={() => openTab({ kind: 'slice', sliceId: slice.id })}
              >
                <span aria-hidden>◇</span>
                <span className="min-w-0 flex-1 truncate">{slice.title}</span>
                <span className="shrink-0 rounded-full border border-border bg-muted px-1.5 py-px font-mono text-3xs leading-tight text-muted-foreground">
                  {slice.slice_type}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  )
}
