import { useState } from 'react'
import { ExternalLink, Plus, X } from 'lucide-react'
import { IconTooltip } from '@/components/editor/IconTooltip'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCanvasModeValue } from '@/contexts/canvasModeContext'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { invalidateQueries } from '@/hooks/useSupabaseQuery'
import {
  updateCellResources,
  type ResourceDraft,
} from '@/lib/cellContentMutations'
import { validateResourceUrl } from '@/lib/resourceUrl'
import { safeExternalHref } from '@/lib/sliceCells'
import type { CellResource } from '@/types/blueprint'

type ResourceRow = {
  id: string
  name: string
  url: string
}

type CellResourcesTabProps = {
  /** Canonical cell id; null for fallback-only cells (read-only then). */
  cellId: string | null
  resources: CellResource[]
  /** Figma link resolved by the panel (added when not already listed). */
  figmaUrl: string | null
}

function resourceDrafts(resources: CellResource[]): ResourceDraft[] {
  return resources
    .filter((resource) => resource.url?.trim())
    .map((resource) => ({ name: resource.name, url: resource.url ?? '' }))
}

/**
 * Resources tab: the cell's `resources` rows.
 *
 * In Edit mode the tab *is* the editor — the rows render as inputs and new
 * resources are added right here. This is where resources live, so this is
 * where they are edited; the text editor above no longer carries them.
 */
export function CellResourcesTab({
  cellId,
  resources,
  figmaUrl,
}: CellResourcesTabProps) {
  const { client, canWrite } = useSupabase()
  const mode = useCanvasModeValue()
  const canEdit = mode === 'design' && canWrite && cellId !== null && client !== null

  if (canEdit) {
    return (
      <CellResourcesEditor
        key={cellId}
        cellId={cellId!}
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
    return [{ id: `resource-${index}`, name: resource.name, url }]
  })

  if (figmaUrl && !rows.some((row) => row.url === figmaUrl)) {
    rows.push({ id: 'resource-figma', name: 'Figma', url: figmaUrl })
  }

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
            <ExternalLink
              className="size-3 shrink-0 text-muted-foreground/70"
              aria-hidden
            />
            <span className="min-w-0 truncate">{row.name}</span>
          </a>
        </li>
      ))}
    </ul>
  )
}

function CellResourcesEditor({
  cellId,
  resources: stored,
}: {
  cellId: string
  resources: CellResource[]
}) {
  const { client } = useSupabase()
  const [resources, setResources] = useState<ResourceDraft[]>(() =>
    resourceDrafts(stored),
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Checked as they type rather than on save: a bad link is worth knowing
  // about while the cursor is still in the field that caused it.
  const urlProblems = resources.map((resource) =>
    resource.url.trim() ? validateResourceUrl(resource.url).ok === false : false,
  )
  const blocked = urlProblems.some(Boolean)
  const dirty =
    JSON.stringify(resources.filter((resource) => resource.url.trim())) !==
    JSON.stringify(resourceDrafts(stored))

  const setResource = (index: number, patch: Partial<ResourceDraft>) => {
    setSaved(false)
    setResources((current) =>
      current.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)),
    )
  }

  const handleSave = async () => {
    if (!client || busy || blocked) return
    setBusy(true)
    setError(null)
    try {
      await updateCellResources(
        client,
        cellId,
        stored,
        resources.filter((resource) => resource.url.trim()),
      )
      invalidateQueries('service-phases')
      invalidateQueries(`cell-content:${cellId}`)
      setSaved(true)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      {resources.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No resources linked to this cell yet.
        </p>
      ) : null}
      {resources.map((resource, index) => (
        <div key={index} className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <Input
              value={resource.name}
              placeholder="Name"
              className="h-7 w-28 text-xs"
              onChange={(event) =>
                setResource(index, { name: event.target.value })
              }
            />
            <Input
              value={resource.url}
              placeholder="https://…"
              className="h-7 flex-1 text-xs"
              aria-invalid={urlProblems[index] || undefined}
              onChange={(event) =>
                setResource(index, { url: event.target.value })
              }
            />
            <IconTooltip label="Remove this resource">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove resource ${index + 1}`}
                onClick={() => {
                  setSaved(false)
                  setResources((current) =>
                    current.filter((_, i) => i !== index),
                  )
                }}
              >
                <X className="size-3" />
              </Button>
            </IconTooltip>
          </div>
          {urlProblems[index] ? (
            <p className="pl-1 text-xs text-destructive">
              {validateResourceUrl(resource.url).ok
                ? null
                : (validateResourceUrl(resource.url) as { problem: string })
                    .problem}
            </p>
          ) : null}
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 self-start px-2 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => {
          setSaved(false)
          setResources((current) => [...current, { name: '', url: '' }])
        }}
      >
        <Plus className="size-3" />
        Add resource
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {dirty || busy ? (
        <Button
          type="button"
          size="sm"
          className="self-start"
          disabled={busy || blocked}
          onClick={handleSave}
        >
          {busy ? 'Saving…' : 'Save resources'}
        </Button>
      ) : saved ? (
        <p className="text-xs text-muted-foreground">Saved.</p>
      ) : null}
    </div>
  )
}
