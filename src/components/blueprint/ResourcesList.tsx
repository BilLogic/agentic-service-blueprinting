import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Reorder, useDragControls } from 'framer-motion'
import {
  FileText,
  GripVertical,
  Link2,
  Loader2,
  MoreHorizontal,
  Pencil,
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
import { Skeleton } from '@/components/ui/skeleton'
import { IconTooltip } from '@/components/editor/IconTooltip'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { uploadAttachment } from '@/lib/attachmentUpload'
import { hostOf } from '@/lib/cellResources'
import { linkPresentation } from '@/lib/resourcePresentation'
import { validateResourceUrl } from '@/lib/resourceUrl'
import { ROW_REVEAL_CLASS } from '@/lib/rowReveal'
import { cn, errorMessage } from '@/lib/utils'
import type { CellResource } from '@/types/blueprint'

/**
 * A row of the list as the editor holds it.
 *
 * `id` is the row it came from, absent on a row pasted since the last save.
 * `kind` rides along because an attachment and a link sit in the same list
 * and the sync must not turn one into the other.
 */
export type ResourceListDraft = {
  id?: string | null
  kind: string
  name: string
  url: string
}

/** A draft row keyed for React: the row's id, or a key minted when it was pasted. */
type Row = ResourceListDraft & { key: string; featured: boolean }

/**
 * The one file the list is carrying, and which of its four states it is in.
 *
 * Idle is the absence of this. `failed` is the third state; the fourth —
 * landed — is this going back to null with an ordinary row in the list, which
 * is the point: a landed upload leaves nothing behind to look at.
 */
type PendingUpload = {
  file: File
  /** Which row it replaces; null means it joins the list. */
  replaceKey: string | null
  failed: boolean
}

function rowsFrom(resources: readonly CellResource[]): Row[] {
  return resources
    .filter((resource) => resource.url?.trim())
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
function sent(rows: readonly Row[]): ResourceListDraft[] {
  return rows.map(({ id, kind, name, url }) => ({ id: id ?? null, kind, name, url }))
}

/** What an upload will call the row, before the upload has answered. */
function nameOfFile(file: File): string {
  return file.name.replace(/\.[^.]+$/, '') || 'Attachment'
}

/**
 * One row of the list: what it is, and everything it offers.
 *
 * Its own component because the drag handle needs `useDragControls`, which is
 * a hook and so cannot live inside a `.map`, and because the rename lives here
 * — an inline edit is one row's business and no one else's.
 */
function ResourceListRow({
  row,
  first,
  last,
  busy,
  onMove,
  onRename,
  onRemove,
  onFeature,
}: {
  row: Row
  first: boolean
  last: boolean
  busy: boolean
  /** Move this row one place up (-1) or down (1). */
  onMove: (by: -1 | 1) => void
  onRename: (name: string) => void
  onRemove: () => void
  onFeature: (featured: boolean) => void
}) {
  const controls = useDragControls()
  /** The rename, while it is open: the text so far. Closed is null. */
  const [renaming, setRenaming] = useState<string | null>(null)

  const commit = () => {
    const typed = renaming?.trim()
    if (typed) onRename(typed)
    setRenaming(null)
  }

  return (
    <Reorder.Item
      value={row}
      dragListener={false}
      dragControls={controls}
      className={cn(
        'group flex min-w-0 items-center gap-1 rounded-md px-1 py-0.5 text-xs',
        row.featured && 'bg-muted/40',
      )}
      data-resource-row=""
    >
      <IconTooltip label="Drag to reorder, or press the up and down arrow keys">
        <button
          type="button"
          aria-label={`Reorder ${row.name}`}
          className={cn(
            ROW_REVEAL_CLASS,
            'flex shrink-0 cursor-grab touch-none items-center text-muted-foreground focus-visible:opacity-100 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none active:cursor-grabbing',
          )}
          onPointerDown={(event) => controls.start(event)}
          onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
            // `Reorder.Item` is pointer-only, so the order stays reachable
            // here: the arrows move the focused row, and focus rides with it
            // because the row keeps its React key across the move.
            if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
            event.preventDefault()
            if (event.key === 'ArrowUp' && first) return
            if (event.key === 'ArrowDown' && last) return
            onMove(event.key === 'ArrowUp' ? -1 : 1)
          }}
        >
          <GripVertical className="size-3" />
        </button>
      </IconTooltip>
      {row.kind === 'attachment' ? (
        <FileText className="size-3 shrink-0 text-muted-foreground" aria-hidden />
      ) : (
        <Link2 className="size-3 shrink-0 text-muted-foreground" aria-hidden />
      )}
      {renaming === null ? (
        // The name is text, not a second door into the rename. The menu item
        // is the only way in, on purpose: the row is already a drag target,
        // so a click on the name would be a second meaning for one gesture,
        // and it is the door that would have to change the moment an "open"
        // affordance lands on this row.
        //
        // The URL rides along twice, because `title` alone reaches only a
        // pointer: it is a hover tooltip for a mouse and a visually hidden
        // suffix for a screen reader, which reads "name, then where it goes".
        // When the name WAS a button the URL sat on something focusable; text
        // is the right element here, so the second copy is what keeps it from
        // becoming mouse-only.
        <span className="min-w-0 flex-1 truncate" title={row.url}>
          {row.name}
          <span className="sr-only">{`, ${row.url}`}</span>
        </span>
      ) : (
        <Input
          autoFocus
          value={renaming}
          aria-label={`Rename ${row.name}`}
          className="h-6 min-w-0 flex-1 text-xs"
          onChange={(event) => setRenaming(event.target.value)}
          // Two exits, and blur is not one of them. The menu that opened this
          // is the only way in, and it hands focus back to its own trigger as
          // it closes — so the blur that arrives first is the menu leaving and
          // not the reader finishing, and a rename that settled itself on
          // whatever took focus next would commit on the way in.
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commit()
            }
            if (event.key === 'Escape') {
              event.preventDefault()
              // Escape leaves the name it had — which, until somebody renames
              // it, is the default the row was minted with: the link's host or
              // the file's own name. Nobody is ever required to type one.
              setRenaming(null)
            }
          }}
        />
      )}
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
            <DropdownMenuItem disabled={busy} onClick={() => onFeature(true)}>
              <Star className="size-3.5" aria-hidden />
              {row.kind === 'attachment' ? 'Set as preview' : 'Set as button'}
            </DropdownMenuItem>
          ) : null}
          {row.id && row.featured ? (
            <DropdownMenuItem disabled={busy} onClick={() => onFeature(false)}>
              <StarOff className="size-3.5" aria-hidden />
              Unset
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onClick={() => setRenaming(row.name)}>
            <Pencil className="size-3.5" aria-hidden />
            Rename…
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onRemove}>
            <X className="size-3.5" aria-hidden />
            Remove from the list
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Reorder.Item>
  )
}

/**
 * One list for everything an owner points at — a placement, or the cell itself.
 *
 * The top of the list is what the owner LEADS with — its preview and its
 * buttons — each with an unset control; the list under it is every resource in
 * order, with a row menu that sets a preview (attachments) or a button (links)
 * or unsets one, renames the row, or drops it. Pasting a URL adds a link named
 * by its host and a file arrives under its own name; naming is a second,
 * optional act, which is why it is a rename and not a field on the way in.
 * The rename has one door, the menu item — which is also how a reader FINDS
 * that a row can be renamed at all. The name beside it stays text: the row is
 * already a drag target and carries its URL in a title, so a click there would
 * be a third meaning for one gesture. Enter commits; Escape leaves the name
 * that was standing.
 *
 * Reorder is a drag on the handle at the start of the row — `Reorder` from
 * `framer-motion`, which the app already depends on — with the arrow keys on
 * that same handle as its keyboard half, because a pointer gesture on its own
 * would put the order out of reach. The order is all it changes: `featured` is
 * not in either sync's UPDATE.
 *
 * Two writes, deliberately different in tempo. The list (add, remove, rename,
 * reorder) is a draft saved by its own button, one RPC, one transaction,
 * because a reorder is a whole-list fact. Featuring is immediate: it is one
 * row's flag, the function clears the previous preview in the same
 * transaction, and waiting for a Save would leave the top of the list showing
 * a state the database does not hold.
 *
 * A file is a third way in: it goes to the bucket at once — the object's URL is
 * what the row carries, so there is no row to draft until the upload has
 * answered — and then joins the list as an `attachment` row saved like any
 * other. It is visible the whole way: the row is on screen, dimmed, while the
 * bucket is being written, and stays as a `Retry` if the write is refused.
 * "Replace…" on the preview uploads the same way and swaps that row's URL; the
 * old object stays in the bucket, deliberately.
 *
 * Which owner this is shows in three places and nowhere else: the two writes it
 * is handed, and the sentence under the heading. Everything else — the rows,
 * the featured section, the menu, the handle, the paste field, the upload — is
 * the same list, which is why it is one component and not two.
 */
export function ResourcesList({
  cellId,
  resources,
  hint,
  empty,
  aside,
  onSave,
  onFeature,
  onWritten,
}: {
  /** The cell a chosen file is filed under; null means no file can join. */
  cellId: string | null
  /** This owner's rows, already filtered — a placement's, or the cell's own. */
  resources: readonly CellResource[]
  /** The sentence under the heading. Without one, neither is drawn. */
  hint?: ReactNode
  /** Drawn instead of an empty list when this owner points at nothing. */
  empty?: ReactNode
  /** Rows this list shows but does not edit, above the featured section. */
  aside?: ReactNode
  /** The list write: add, remove, rename and reorder, in one transaction. */
  onSave: (rows: ResourceListDraft[]) => Promise<void>
  /** The one-row write: lead with this resource, or stop leading with it. */
  onFeature: (resourceId: string, featured: boolean) => Promise<void>
  /** After any write landed: the caller refetches what it shows. */
  onWritten: () => void
}) {
  const { client } = useSupabase()
  const stored = rowsFrom(resources)
  const [rows, setRows] = useState<Row[]>(stored)
  const [pasted, setPasted] = useState('')
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<PendingUpload | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  /** Which row the next chosen file replaces; null means it joins the list. */
  const replacing = useRef<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const uploading = pending !== null && !pending.failed
  const dirty = JSON.stringify(sent(rows)) !== JSON.stringify(sent(stored))
  const pasteProblem = pasted.trim() ? validateResourceUrl(pasted) : null

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

  const upload = async (file: File, replaceKey: string | null) => {
    if (!client || !cellId || uploading) return
    setPending({ file, replaceKey, failed: false })
    setError(null)
    try {
      const uploaded = await uploadAttachment(client, { cellId, file })
      setRows((current) =>
        replaceKey !== null && current.some((row) => row.key === replaceKey)
          ? current.map((row) => (row.key === replaceKey ? { ...row, url: uploaded.url } : row))
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
      setPending(null)
    } catch (uploadError) {
      setError(errorMessage(uploadError))
      setPending({ file, replaceKey, failed: true })
    }
  }

  const move = (key: string, by: -1 | 1) => {
    setRows((current) => {
      const index = current.findIndex((row) => row.key === key)
      const target = index + by
      if (index < 0 || target < 0 || target >= current.length) return current
      const next = current.slice()
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
      await onSave(sent(rows))
      onWritten()
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
      await onFeature(row.id, featured)
      onWritten()
    } catch (featureError) {
      setError(errorMessage(featureError))
    } finally {
      setBusy(false)
    }
  }

  const featuredRows = stored.filter((row) => row.featured)

  return (
    <div className="flex flex-col gap-2" data-resources-list="">
      {hint ? (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-muted-foreground">Resources</span>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      ) : null}

      {rows.length === 0 && empty ? (
        <p className="text-xs text-muted-foreground">{empty}</p>
      ) : null}

      {aside}

      {featuredRows.length > 0 ? (
        // No drag handle here, deliberately. There is at most one preview, and
        // the buttons follow the main list's order, so this block has no order
        // of its own to change — a handle would offer a move that does nothing.
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
              {row.kind === 'attachment' && cellId ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5 text-xs"
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

      <Reorder.Group
        as="ul"
        axis="y"
        values={rows}
        onReorder={setRows}
        className="flex flex-col gap-1"
        aria-label="All resources"
      >
        {rows.map((row, index) => (
          <ResourceListRow
            key={row.key}
            row={row}
            first={index === 0}
            last={index === rows.length - 1}
            busy={busy}
            onMove={(by) => move(row.key, by)}
            onRename={(name) =>
              setRows((current) =>
                current.map((entry) => (entry.key === row.key ? { ...entry, name } : entry)),
              )
            }
            onRemove={() =>
              setRows((current) => current.filter((entry) => entry.key !== row.key))
            }
            onFeature={(featured) => void feature(row, featured)}
          />
        ))}
      </Reorder.Group>

      {pending ? (
        <div
          className={cn(
            'flex flex-col gap-1 rounded-md px-1 py-0.5 text-xs',
            !pending.failed && 'opacity-60',
          )}
          data-upload-row=""
        >
          <div className="flex min-w-0 items-center gap-1.5">
            <FileText className="size-3 shrink-0 text-muted-foreground" aria-hidden />
            <span className="min-w-0 flex-1 truncate">{nameOfFile(pending.file)}</span>
            {pending.failed ? (
              <>
                <span className="shrink-0 text-xs text-destructive">
                  The file did not upload.
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 px-1.5 text-xs"
                  onClick={() => void upload(pending.file, pending.replaceKey)}
                >
                  Retry
                </Button>
              </>
            ) : (
              <Loader2 className="size-3 shrink-0 animate-spin text-muted-foreground" aria-hidden />
            )}
          </div>
          {pending.failed ? null : (
            // Indeterminate on purpose: the bucket reports no progress, so a
            // filling bar would be a number the upload does not have.
            <Skeleton
              role="progressbar"
              aria-label={`Uploading ${nameOfFile(pending.file)}`}
              className="h-0.5 w-full rounded-full"
            />
          )}
        </div>
      ) : null}

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
          disabled={!pasted.trim()}
          onClick={add}
        >
          Add
        </Button>
      </div>
      {pasteProblem && !pasteProblem.ok ? (
        <p className="text-xs text-destructive">{pasteProblem.problem}</p>
      ) : null}
      {cellId ? (
        <>
          <input
            ref={fileInput}
            type="file"
            className="sr-only"
            aria-label="Upload a file"
            tabIndex={-1}
            onChange={(event) => {
              const file = event.target.files?.[0]
              const replaceKey = replacing.current
              replacing.current = null
              event.target.value = ''
              if (file) void upload(file, replaceKey)
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="self-start px-2 text-muted-foreground hover:text-foreground"
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
