import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useSupabase } from '@/contexts/SupabaseProvider'
import {
  useNameOnlyPlacements,
  useRegistryTouchpoints,
} from '@/hooks/useRegistryTouchpoints'
import { invalidateQueries } from '@/hooks/useSupabaseQuery'
import { removePlacement, setPlacementTouchpoint } from '@/lib/placementLinkMutations'

/**
 * The cell's name-only placements — touchpoints the registry lacks (#112) —
 * each with the two things an author can do about it: link it to an entry
 * the registry does hold, or take it off the cell. Nothing is matched by
 * rule; the choice is the author's.
 *
 * Shown only when the cell has one. A cell whose every placement is linked
 * has nothing to decide, and the block stays out of the way.
 */
export function RegistryLinks({ cellId }: { cellId: string }) {
  const { client } = useSupabase()
  const placements = useNameOnlyPlacements(cellId)
  const registry = useRegistryTouchpoints(cellId)
  const [choice, setChoice] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const rows = placements.status === 'ready' ? placements.data : []
  const entries = registry.status === 'ready' ? registry.data : []
  if (!client || rows.length === 0) return null

  const refresh = () => {
    invalidateQueries(`name-only-placements:${cellId}`)
    invalidateQueries(`registry-touchpoints:${cellId}`)
    invalidateQueries(`cell-content:${cellId}`)
    invalidateQueries('service-phases')
    // An existing cell's panel does not know its path; every board query
    // refetches, the way the editor's own save does.
    invalidateQueries('canvas-blueprints')
  }

  const run = async (placementId: string, action: () => Promise<unknown>) => {
    setBusy(placementId)
    setError(null)
    try {
      await action()
      refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col gap-1" data-registry-links="">
      <span className="w-fit text-2xs font-medium text-muted-foreground">
        Not in the registry
      </span>
      <ul className="flex flex-col gap-1.5">
        {rows.map((row) => {
          const picked = choice[row.id] ?? ''
          return (
            <li
              key={row.id}
              className="flex flex-wrap items-center gap-1.5 text-xs"
              data-name-only-placement={row.name}
            >
              <span className="rounded-full border border-dashed px-2 py-0.5">
                {row.name}
              </span>
              <select
                aria-label={`Registry entry for ${row.name}`}
                className="h-7 rounded-md border bg-background px-1 text-xs"
                value={picked}
                disabled={busy === row.id}
                onChange={(event) =>
                  setChoice((prev) => ({ ...prev, [row.id]: event.target.value }))
                }
              >
                <option value="">Link to…</option>
                {entries.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!picked || busy === row.id}
                onClick={() => {
                  const entry = entries.find((candidate) => candidate.id === picked)
                  if (!entry) return
                  void run(row.id, () =>
                    setPlacementTouchpoint(
                      client,
                      { id: row.id, cellId, name: row.name },
                      { touchpointId: entry.id, touchpointName: entry.name },
                    ),
                  )
                }}
              >
                Link
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy === row.id}
                onClick={() =>
                  void run(row.id, () =>
                    removePlacement(client, { id: row.id, cellId, name: row.name }),
                  )
                }
              >
                Remove
              </Button>
            </li>
          )
        })}
      </ul>
      {error ? <p className="text-2xs text-destructive">{error}</p> : null}
    </div>
  )
}
