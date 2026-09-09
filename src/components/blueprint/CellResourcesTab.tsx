import type { SupabaseClient } from '@supabase/supabase-js'
import { ExternalLink, FileText } from 'lucide-react'
import {
  ResourcesList,
  type ResourceListDraft,
} from '@/components/blueprint/ResourcesList'
import { useCanvasModeValue } from '@/contexts/canvasModeContext'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { invalidateQueries } from '@/hooks/useSupabaseQuery'
import { updateCellResources } from '@/lib/cellContentMutations'
import { setFeaturedResource } from '@/lib/placementResourceMutations'
import { safeExternalHref } from '@/lib/sliceCells'
import type { Database } from '@/types/database'
import type { CellResource } from '@/types/blueprint'

type ResourceRow = {
  id: string
  name: string
  url: string
  kind: CellResource['kind']
}

type CellResourcesTabProps = {
  /** Canonical cell id; null for fallback-only cells (read-only then). */
  cellId: string | null
  resources: CellResource[]
}

/**
 * The rows the cell's list edits: its own, with a url. A placement's are read
 * here and edited from the touchpoint.
 */
function ownRows(resources: CellResource[]): CellResource[] {
  return resources.filter(
    (resource) => !resource.placementId && resource.url?.trim(),
  )
}

/** A placement's resources, as the editor lists them without controls. */
function placementRows(resources: CellResource[]): CellResource[] {
  return resources.filter(
    (resource) => resource.placementId !== null && resource.url?.trim(),
  )
}

/**
 * Resources tab: the cell's `resources` rows.
 *
 * In Edit mode the tab *is* the editor, and the editor is `ResourcesList` —
 * the same list a touchpoint's resources are edited in, handed this cell's
 * two writes instead of a placement's. A cell owns a preview and buttons the
 * way a placement does: the partial unique index already indexes a cell-owned
 * preview, `set_featured_resource` scopes its clear to the placement-less
 * owner, and `sync_cell_resources` never writes `featured` — so the two-tempo
 * write model arrives here with nothing added to the schema.
 *
 * A placement's rows arrive in the same list now that every resource knows its
 * own cell, a placement's included — the cell reads everything it points at,
 * through its touchpoints too — and are listed here without controls: the
 * touchpoint's own editor is where they change.
 *
 * A row nobody linked is a row nobody linked. The tab used to grow a synthetic
 * "Figma" entry for whatever url a vendor-name regex two files away had
 * elected as "the design", which put a link in this list that the cell's own
 * list did not hold and that Save could not have written.
 */
export function CellResourcesTab({
  cellId,
  resources,
}: CellResourcesTabProps) {
  const { client, canWrite } = useSupabase()
  const mode = useCanvasModeValue()

  if (mode === 'design' && canWrite && cellId !== null && client !== null) {
    return (
      <CellResourcesEditor
        key={cellId}
        cellId={cellId}
        client={client}
        resources={resources}
      />
    )
  }

  // No second answer to "what is this called when nobody said": the table
  // refuses a nameless row and the editor mints the host before it saves, so
  // a row that arrives here already has its name.
  const rows: ResourceRow[] = resources.flatMap((resource, index) => {
    const url = resource.url?.trim()
    if (!url) return []
    return [{ id: resource.id ?? `resource-${index}`, name: resource.name, url, kind: resource.kind }]
  })

  if (rows.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No resources linked to this cell.
      </p>
    )
  }

  return (
    <ul className="flex flex-col">
      {rows.filter((row) => safeExternalHref(row.url)).map((row) => (
        <li key={row.id} className="border-b border-muted last:border-0">
          <a
            href={safeExternalHref(row.url) ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full min-w-0 items-center gap-1.5 px-2 py-1.5 text-xs leading-snug font-normal text-foreground/90 transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
          >
            {row.kind === 'attachment' ? (
              <FileText
                className="size-3 shrink-0 text-muted-foreground/70"
                aria-hidden
              />
            ) : (
              <ExternalLink
                className="size-3 shrink-0 text-muted-foreground/70"
                aria-hidden
              />
            )}
            <span className="min-w-0 truncate">{row.name}</span>
          </a>
        </li>
      ))}
    </ul>
  )
}

/**
 * The cell's own list, and the two writes that make it the cell's.
 *
 * `sync_cell_resources` refuses a placement's ids, so the list is handed the
 * cell's own rows only; a placement's are listed beside them, unedited,
 * because the touchpoint's own editor is where they change.
 */
function CellResourcesEditor({
  cellId,
  client,
  resources: stored,
}: {
  cellId: string
  client: SupabaseClient<Database>
  resources: CellResource[]
}) {
  const fromPlacements = placementRows(stored)

  const save = async (rows: ResourceListDraft[]) => {
    await updateCellResources(
      client,
      cellId,
      stored,
      rows.map((row) => ({
        id: row.id ?? null,
        kind: row.kind === 'attachment' ? 'attachment' : 'link',
        name: row.name,
        url: row.url,
      })),
    )
  }

  const feature = async (resourceId: string, featured: boolean) => {
    await setFeaturedResource(client, { id: resourceId, placementId: null, cellId }, featured)
  }

  return (
    <ResourcesList
      cellId={cellId}
      resources={ownRows(stored)}
      empty={
        fromPlacements.length === 0 ? 'No resources linked to this cell yet.' : null
      }
      aside={
        fromPlacements.length > 0 ? (
          // Listed, not edited: these rows belong to a touchpoint placed here,
          // and the touchpoint's own editor is where they change.
          <ul className="flex flex-col" aria-label="From this cell's touchpoints">
            {fromPlacements.map((resource) => (
              <li
                key={resource.id ?? resource.url}
                className="flex min-w-0 items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground"
              >
                <ExternalLink className="size-3 shrink-0 opacity-70" aria-hidden />
                <span className="min-w-0 truncate">{resource.name}</span>
                <span className="shrink-0 text-2xs opacity-70">
                  from a touchpoint
                </span>
              </li>
            ))}
          </ul>
        ) : null
      }
      onSave={save}
      onFeature={feature}
      onWritten={() => {
        invalidateQueries('service-phases')
        invalidateQueries(`cell-content:${cellId}`)
      }}
    />
  )
}
