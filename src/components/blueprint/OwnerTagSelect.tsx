import { useState } from 'react'
import { Check, ChevronDown, Pencil, X } from 'lucide-react'
import { IconTooltip } from '@/components/editor/IconTooltip'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { useOwnerTags } from '@/hooks/useOwnerTags'
import { invalidateQueries } from '@/hooks/useSupabaseQuery'
import { recordChange } from '@/lib/authoringSession'
import { cn } from '@/lib/utils'

/**
 * Owner as a tag, not free text.
 *
 * Free text is how a blueprint ends up with `Field Ops`, `FieldOps` and
 * `field ops` as three different teams. The dropdown offers the existing
 * vocabulary first; typing something new creates it explicitly (one visible
 * "Create" row, not a silent save); the pencil renames a tag *everywhere it
 * is used* — owner and perceived owner both — because a tag is one fact
 * about the organization, not a per-cell string.
 */
export function OwnerTagSelect({
  value,
  onChange,
  placeholder = 'None',
  ariaLabel,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  ariaLabel: string
}) {
  const { client } = useSupabase()
  const tagsResult = useOwnerTags()
  const tags = tagsResult.status === 'ready' ? tagsResult.data : []
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameText, setRenameText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trimmedFilter = filter.trim()
  const visible = tags.filter((tag) =>
    tag.toLowerCase().includes(trimmedFilter.toLowerCase()),
  )
  const exactExists = tags.some(
    (tag) => tag.toLowerCase() === trimmedFilter.toLowerCase(),
  )

  const pick = (tag: string) => {
    onChange(tag)
    setOpen(false)
    setFilter('')
  }

  /** Rename the tag on every cell that carries it, in either column. */
  const renameEverywhere = async (from: string, to: string) => {
    if (!client || busy) return
    const next = to.trim()
    if (!next || next === from) {
      setRenaming(null)
      return
    }
    // Renaming onto an existing tag would silently merge two vocabularies —
    // and the recorded revert would then rename *every* cell of the target
    // tag back, corrupting cells that were never touched. Refuse; merging
    // is a decision, not a typo.
    if (tags.some((tag) => tag !== from && tag === next)) {
      setError(`“${next}” already exists — pick it instead of renaming onto it.`)
      return
    }
    setBusy(true)
    setError(null)
    try {
      // One RPC, one transaction — the two-UPDATE version could fail
      // between columns and split the vocabulary in half. It returns the
      // touched cell ids, so the revert is scoped to exactly those cells
      // rather than every cell that happens to carry the new name later.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC postdates generated types, same seam as authoringRpc
      const { data, error: rpcError } = await (client.rpc as any)(
        'rename_owner_tag',
        { from_name: from, to_name: next },
      )
      if (rpcError) throw new Error(rpcError.message)
      const affectedIds = (data ?? []) as string[]

      recordChange(
        'rename_owner_tag',
        { from, to: next },
        {
          fn: 'rename_owner_tag_scoped',
          args: { cell_ids: affectedIds, from: next, to: from },
        },
      )
      invalidateQueries('owner-tags')
      invalidateQueries('lifecycle-phases')
      if (value === from) onChange(next)
      setRenaming(null)
    } catch (renameError) {
      setError(
        renameError instanceof Error ? renameError.message : String(renameError),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={ariaLabel}
            className={cn(
              'flex h-8 w-full items-center justify-between gap-1 rounded-md border border-input bg-transparent px-2 text-left text-sm',
              'outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
              !value && 'text-muted-foreground',
            )}
          >
            <span className="min-w-0 truncate">{value || placeholder}</span>
            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          </button>
        }
      />
      <PopoverContent align="start" className="w-56 p-1.5">
        <Input
          value={filter}
          placeholder="Find or create…"
          className="mb-1 h-7 text-xs"
          autoFocus
          onChange={(event) => setFilter(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' || !trimmedFilter) return
            // Enter picks the existing tag when one matches exactly —
            // otherwise it creates. Never a silent no-op.
            const existing = tags.find(
              (tag) => tag.toLowerCase() === trimmedFilter.toLowerCase(),
            )
            pick(existing ?? trimmedFilter)
          }}
        />
        <div className="flex max-h-48 flex-col overflow-y-auto">
          {value ? (
            <button
              type="button"
              className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted"
              onClick={() => pick('')}
            >
              <X className="size-3" aria-hidden />
              Clear
            </button>
          ) : null}
          {visible.map((tag) =>
            renaming === tag ? (
              <div key={tag} className="flex items-center gap-1 px-1 py-0.5">
                <Input
                  value={renameText}
                  autoFocus
                  className="h-6 flex-1 text-xs"
                  onChange={(event) => setRenameText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void renameEverywhere(tag, renameText)
                    if (event.key === 'Escape') setRenaming(null)
                  }}
                />
                <IconTooltip label={`Rename ${tag} everywhere`}>
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    aria-label={`Rename ${tag} everywhere`}
                    disabled={busy}
                    onClick={() => void renameEverywhere(tag, renameText)}
                  >
                    <Check className="size-3" />
                  </Button>
                </IconTooltip>
              </div>
            ) : (
              <div
                key={tag}
                className="group/tag flex items-center gap-1 rounded-sm hover:bg-muted"
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left text-xs"
                  onClick={() => pick(tag)}
                >
                  <span className="min-w-0 flex-1 truncate">{tag}</span>
                  {value === tag ? (
                    <Check className="size-3 shrink-0 text-primary" aria-hidden />
                  ) : null}
                </button>
                <IconTooltip label="Rename everywhere">
                  <button
                    type="button"
                    aria-label={`Rename ${tag}`}
                    className="mr-1 shrink-0 rounded-sm p-0.5 text-muted-foreground opacity-0 transition-opacity group-hover/tag:opacity-100 focus-visible:opacity-100 hover:text-foreground"
                    onClick={() => {
                      setRenaming(tag)
                      setRenameText(tag)
                    }}
                  >
                    <Pencil className="size-3" aria-hidden />
                  </button>
                </IconTooltip>
              </div>
            ),
          )}
          {trimmedFilter && !exactExists ? (
            <button
              type="button"
              className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs text-primary hover:bg-muted"
              onClick={() => pick(trimmedFilter)}
            >
              Create “{trimmedFilter}”
            </button>
          ) : null}
          {visible.length === 0 && !trimmedFilter ? (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">
              No tags yet — type to create one.
            </p>
          ) : null}
        </div>
        {error ? <p className="px-2 pt-1 text-xs text-destructive">{error}</p> : null}
      </PopoverContent>
    </Popover>
  )
}
