import { useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  FileText,
  Link2,
  MoreHorizontal,
  Star,
  StarOff,
  Upload,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { IconTooltip } from '@/components/editor/IconTooltip'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { invalidateQueries } from '@/hooks/useSupabaseQuery'
import { uploadAttachment } from '@/lib/attachmentUpload'
import { hostOf } from '@/lib/cellResources'
import { PANEL_TEXT } from '@/lib/panelText'
import {
  setFeaturedResource,
  updatePlacementResources,
  type PlacementResourceDraft,
} from '@/lib/placementResourceMutations'
import { linkPresentation } from '@/lib/resourcePresentation'
import { validateResourceUrl } from '@/lib/resourceUrl'
import { cn } from '@/lib/utils'
import { errorMessage } from '@/lib/utils'
import type { CellResource } from '@/types/blueprint'

/** A draft row keyed for React: the row's id, or a key minted when it was pasted. */
type Row = PlacementResourceDraft & { key: string; featured: boolean }

function rowsFrom(resources: readonly CellResource[], placementId: string): Row[] {
  return resources
    .filter((resource) => resource.placementId === placementId && resource.url?.trim())
    .map((resource) => ({
      key: resource.id ?? resource.url!,
      id: resource.id,
      kind: resource.kind,
      name: resource.name,
      url: resource.url ?? '',
      featured: resource.featured,
    }))
}

/** What the sync compares: the list without its React keys or featured flags. */
function sent(rows: readonly Row[]): PlacementResourceDraft[] {
  return rows.map(({ id, kind, name, url }) => ({ id: id ?? null, kind, name, url }))
}

/**
 * One list for everything a placement points at.
 *
 * The top of the list is what the placement LEADS with — its preview and
 * its buttons — each with an unset control; the list under it is every
 * resource in order, with a row menu that sets a preview (attachments) or a
 * button (links) or unsets one. Pasting a URL adds a link named by its
 * host; nobody types a name. Reorder is two arrows: the list is short, a
 * drag needs a library, and the order is the only thing the arrows change —
 * `featured` is not in the sync's UPDATE.
 *
 * Two writes, deliberately different in tempo. The list (add, remove,
 * reorder) is a draft saved by its own button, one RPC, one transaction,
 * because a reorder is a whole-list fact. Featuring is immediate: it is one
 * row's flag, the function clears the previous preview in the same
 * transaction, and waiting for a Save would leave the top of the list
 * showing a state the database does not hold.
 *
 * A file is a third way in: it goes to the bucket at once — the object's URL
 * is what the row carries, so there is no row to draft until the upload has
 * answered — and then joins the list as an `attachment` row saved like any
 * other. "Replace…" on the preview uploads the same way and swaps that row's
 * URL; the old object stays in the bucket, deliberately.
 */
export function PlacementResourcesList({
  placement,
  resources,
  onWritten,
}: {
  placement: { id: string; cellId: string | null; name: string }
  /** The cell's resources — this list keeps the placement's. */
  resources: readonly CellResource[]
  /** After any write landed: the caller refetches what it shows. */
  onWritten?: () => void
}) {
  const { client } = useSupabase()
  const stored = rowsFrom(resources, placement.id)
  const [rows, setRows] = useState<Row[]>(stored)
  const [pasted, setPasted] = useState('')
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  /** Which row the next chosen file replaces; null means it joins the list. */
  const replacing = useRef<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const dirty = JSON.stringify(sent(rows)) !== JSON.stringify(sent(stored))
  const pasteProblem = pasted.trim() ? validateResourceUrl(pasted) : null

  const refetch = () => {
    invalidateQueries('service-phases')
    invalidateQueries('canvas-blueprints')
    if (placement.cellId) invalidateQueries(`cell-content:${placement.cellId}`)
    onWritten?.()
  }

  const add = () => {
    const checked = validateResourceUrl(pasted)
    if (!checked.ok) {
      setError(checked.problem)
      return
    }
    setError(null)
    setRows((current) => [
      ...current,
      {
        key: `new:${checked.url}:${current.length}`,
        id: null,
        kind: 'link',
        name: hostOf(checked.url),
        url: checked.url,
        featured: false,
      },
    ])
    setPasted('')
  }

  const chooseFile = (replaceKey: string | null) => {
    replacing.current = replaceKey
    fileInput.current?.click()
  }

  const upload = async (file: File) => {
    if (!client || !placement.cellId || uploading) return
    setUploading(true)
    setError(null)
    try {
      const uploaded = await uploadAttachment(client, { cellId: placement.cellId, file })
      const target = replacing.current
      replacing.current = null
      setRows((current) =>
        target !== null && current.some((row) => row.key === target)
          ? current.map((row) => (row.key === target ? { ...row, url: uploaded.url } : row))
          : [
              ...current,
              {
                key: `new:${uploaded.objectKey}`,
                id: null,
                kind: 'attachment',
                name: uploaded.name,
                url: uploaded.url,
                featured: false,
              },
            ],
      )
    } catch (uploadError) {
      setError(errorMessage(uploadError))
    } finally {
      setUploading(false)
    }
  }

  const move = (index: number, by: -1 | 1) => {
    setRows((current) => {
      const next = current.slice()
      const target = index + by
      if (target < 0 || target >= next.length) return current
      const [row] = next.splice(index, 1)
      next.splice(target, 0, row!)
      return next
    })
  }

  const save = async () => {
    if (!client || busy) return
    setBusy(true)
    setError(null)
    try {
      await updatePlacementResources(client, placement, resources, sent(rows))
      refetch()
    } catch (saveError) {
      setError(errorMessage(saveError))
    } finally {
      setBusy(false)
    }
  }

  const feature = async (row: Row, featured: boolean) => {
    if (!client || busy || !row.id) return
    setBusy(true)
    setError(null)
    try {
      await setFeaturedResource(
        client,
        { id: row.id, placementId: placement.id, cellId: placement.cellId },
        featured,
      )
      refetch()
    } catch (featureError) {
      setError(errorMessage(featureError))
    } finally {
      setBusy(false)
    }
  }

  const featuredRows = stored.filter((row) => row.featured)

  return (
    <div className="flex flex-col gap-2" data-placement-resources="">
      <div className="flex flex-col gap-0.5">
        <span className={PANEL_TEXT.sectionLabel}>Resources</span>
        <p className="text-3xs text-muted-foreground">
          What “{placement.name}” points at here. The preview and the buttons
          come from the featured ones.
        </p>
      </div>

      {featuredRows.length > 0 ? (
        <ul className="flex flex-col gap-1" aria-label="Featured">
          {featuredRows.map((row) => (
            <li
              key={row.key}
              className="flex min-w-0 items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs"
              data-featured-row=""
            >
              {row.kind === 'attachment' ? (
                <FileText className="size-3 shrink-0 text-muted-foreground" aria-hidden />
              ) : (
                <Link2 className="size-3 shrink-0 text-muted-foreground" aria-hidden />
              )}
              <span className="min-w-0 flex-1 truncate">
                {row.kind === 'attachment' ? 'Preview' : linkPresentation(row.url).label}
                <span className="text-muted-foreground"> · {row.name}</span>
              </span>
              {row.kind === 'attachment' && placement.cellId ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5 text-2xs"
                  disabled={busy || uploading}
                  onClick={() => chooseFile(row.key)}
                >
                  Replace…
                </Button>
              ) : null}
              <IconTooltip label="Unset — keep it in the list, stop leading with it">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Unset ${row.name}`}
                  disabled={busy}
                  onClick={() => void feature(row, false)}
                >
                  <StarOff className="size-3" />
                </Button>
              </IconTooltip>
            </li>
          ))}
        </ul>
      ) : null}

      <ul className="flex flex-col gap-1" aria-label="All resources">
        {rows.map((row, index) => (
          <li
            key={row.key}
            className={cn(
              'flex min-w-0 items-center gap-1 rounded-md px-1 py-0.5 text-xs',
              row.featured && 'bg-muted/40',
            )}
            data-resource-row=""
          >
            {row.kind === 'attachment' ? (
              <FileText className="size-3 shrink-0 text-muted-foreground" aria-hidden />
            ) : (
              <Link2 className="size-3 shrink-0 text-muted-foreground" aria-hidden />
            )}
            <span className="min-w-0 flex-1 truncate" title={row.url}>
              {row.name}
            </span>
            <IconTooltip label="Move up">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Move ${row.name} up`}
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                <ArrowUp className="size-3" />
              </Button>
            </IconTooltip>
            <IconTooltip label="Move down">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Move ${row.name} down`}
                disabled={index === rows.length - 1}
                onClick={() => move(index, 1)}
              >
                <ArrowDown className="size-3" />
              </Button>
            </IconTooltip>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`More for ${row.name}`}
                  >
                    <MoreHorizontal className="size-3" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                {row.id && !row.featured ? (
                  <DropdownMenuItem onClick={() => void feature(row, true)}>
                    <Star className="size-3.5" aria-hidden />
                    {row.kind === 'attachment' ? 'Set as preview' : 'Set as button'}
                  </DropdownMenuItem>
                ) : null}
                {row.id && row.featured ? (
                  <DropdownMenuItem onClick={() => void feature(row, false)}>
                    <StarOff className="size-3.5" aria-hidden />
                    Unset
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem
                  onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
                >
                  <X className="size-3.5" aria-hidden />
                  Remove from the list
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-1.5">
        <Input
          value={pasted}
          placeholder="Paste a link…"
          aria-label="Paste a link"
          className="h-7 flex-1 text-xs"
          aria-invalid={pasteProblem?.ok === false || undefined}
          onChange={(event) => setPasted(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              add()
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7"
          disabled={!pasted.trim()}
          onClick={add}
        >
          Add
        </Button>
      </div>
      {pasteProblem && !pasteProblem.ok ? (
        <p className="text-xs text-destructive">{pasteProblem.problem}</p>
      ) : null}
      {placement.cellId ? (
        <>
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
        </>
      ) : null}

      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          className="h-7"
          disabled={!dirty || busy || !client}
          onClick={() => void save()}
        >
          Save resources
        </Button>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    </div>
  )
}
