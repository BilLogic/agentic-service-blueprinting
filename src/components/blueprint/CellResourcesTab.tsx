import { useRef, useState } from 'react'
import { ExternalLink, FileText, Plus, Upload, X } from 'lucide-react'
import { IconTooltip } from '@/components/editor/IconTooltip'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCanvasModeValue } from '@/contexts/canvasModeContext'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { invalidateQueries } from '@/hooks/useSupabaseQuery'
import { uploadAttachment } from '@/lib/attachmentUpload'
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
  kind: CellResource['kind']
}

type CellResourcesTabProps = {
  /** Canonical cell id; null for fallback-only cells (read-only then). */
  cellId: string | null
  resources: CellResource[]
  /** Figma link resolved by the panel (added when not already listed). */
  figmaUrl: string | null
}

/**
 * The rows the cell's list edits: its own, with a url. A placement's are
 * read here and edited from the touchpoint (#110). Each keeps its id so a
 * reorder is a reorder, not a delete and a re-insert.
 */
function resourceDrafts(resources: CellResource[]): ResourceDraft[] {
  return resources
    .filter((resource) => !resource.placementId && resource.url?.trim())
    .map((resource) => ({
      id: resource.id,
      kind: resource.kind,
      name: resource.name,
      url: resource.url ?? '',
    }))
}

/** A placement's resources, as the editor lists them without inputs. */
function placementRows(resources: CellResource[]): CellResource[] {
  return resources.filter(
    (resource) => resource.placementId !== null && resource.url?.trim(),
  )
}

/**
 * Resources tab: the cell's `resources` rows.
 *
 * In Edit mode the tab *is* the editor — the rows render as inputs and new
 * resources are added right here. This is where resources live, so this is
 * where they are edited; the text editor above no longer carries them.
 *
 * A placement's rows arrive in the same list since #110 — the cell reads
 * everything it points at, through its touchpoints too — and are listed
 * here without inputs: the touchpoint's own editor is where they change.
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
    return [{ id: resource.id ?? `resource-${index}`, name: resource.name, url, kind: resource.kind }]
  })

  if (figmaUrl && !rows.some((row) => row.url === figmaUrl)) {
    rows.push({ id: 'resource-figma', name: 'Figma', url: figmaUrl, kind: 'link' })
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
  const [uploading, setUploading] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  /** Which row the next chosen file replaces; null means it joins the list. */
  const replacing = useRef<number | null>(null)

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

  const chooseFile = (replaceIndex: number | null) => {
    replacing.current = replaceIndex
    fileInput.current?.click()
  }

  /**
   * The file goes to the bucket now; the row is written when the list is
   * saved, the same two steps as a pasted link (#113). Replacing swaps the
   * url on the row the file was chosen for and keeps its name and id.
   */
  const upload = async (file: File) => {
    if (!client || uploading) return
    setUploading(true)
    setError(null)
    try {
      const uploaded = await uploadAttachment(client, { cellId, file })
      const target = replacing.current
      replacing.current = null
      setSaved(false)
      setResources((current) =>
        target !== null && target < current.length
          ? current.map((entry, i) =>
              i === target ? { ...entry, kind: 'attachment', url: uploaded.url } : entry,
            )
          : [...current, { id: null, kind: 'attachment', name: uploaded.name, url: uploaded.url }],
      )
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : String(uploadError))
    } finally {
      setUploading(false)
    }
  }

  const fromPlacements = placementRows(stored)

  return (
    <div className="flex flex-col gap-1.5">
      {resources.length === 0 && fromPlacements.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No resources linked to this cell yet.
        </p>
      ) : null}
      {fromPlacements.length > 0 ? (
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
      ) : null}
      {resources.map((resource, index) => (
        <div key={resource.id ?? `new-${index}`} className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <Input
              value={resource.name}
              placeholder="Name"
              className="h-7 w-28 text-xs"
              onChange={(event) =>
                setResource(index, { name: event.target.value })
              }
            />
            {resource.kind === 'attachment' ? (
              // A file's URL is the object's: shown, never retyped. Replace
              // puts a new file under the same row.
              <span
                className="flex h-7 min-w-0 flex-1 items-center gap-1 truncate text-xs text-muted-foreground"
                title={resource.url}
              >
                <FileText className="size-3 shrink-0" aria-hidden />
                <span className="min-w-0 truncate">{resource.url.split('/').pop()}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 shrink-0 px-1.5 text-2xs"
                  disabled={uploading || !client}
                  aria-label={`Replace the file of resource ${index + 1}`}
                  onClick={() => chooseFile(index)}
                >
                  Replace
                </Button>
              </span>
            ) : (
              <Input
                value={resource.url}
                placeholder="https://…"
                className="h-7 flex-1 text-xs"
                aria-invalid={urlProblems[index] || undefined}
                onChange={(event) =>
                  setResource(index, { url: event.target.value })
                }
              />
            )}
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
          setResources((current) => [
            ...current,
            { id: null, kind: 'link', name: '', url: '' },
          ])
        }}
      >
        <Plus className="size-3" />
        Add resource
      </Button>
      <input
        ref={fileInput}
        type="file"
        className="sr-only"
        aria-label="Upload a file"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) void upload(file)
        }}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 self-start px-2 text-xs text-muted-foreground hover:text-foreground"
        disabled={uploading || !client}
        onClick={() => chooseFile(null)}
      >
        <Upload className="size-3" />
        {uploading ? 'Uploading…' : 'Upload a file'}
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
