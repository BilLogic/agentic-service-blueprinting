import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/blueprint/panelShell'
import { OptionSelect } from '@/components/blueprint/OptionSelect'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { useRegistryTouchpoints } from '@/hooks/useRegistryTouchpoints'
import { removePlacement, setPlacementTouchpoint } from '@/lib/placementLinkMutations'
import { errorMessage } from '@/lib/utils'

/**
 * A placement whose touchpoint the registry lacks (#112): the author's name,
 * kept, with two ways out. Link it to the registry entry it was about — a
 * choice made here, never a match on the name — or take it off the cell.
 * Both are immediate and both go in the ledger with their inverse; neither
 * waits for the form's Save, because neither is a field of the placement.
 *
 * One card per placement, rather than one block listing all of them. A
 * placement is the thing being decided about, so the sentence can name it and
 * the select can be filtered for it — which is what `shown` is for: offering
 * a name the cell already displays would produce a link the database refuses
 * ("that cell already shows that touchpoint"), so those entries are left out
 * of the list instead of failing on the click.
 */
export function RegistryLink({
  placement,
  cellId,
  shown,
  onWritten,
}: {
  placement: { id: string; name: string }
  cellId: string
  /** The names the cell's text already shows — already placed, so not offered. */
  shown: readonly string[]
  onWritten: (gone: boolean) => void
}) {
  const { client } = useSupabase()
  const registry = useRegistryTouchpoints(cellId)
  const [choice, setChoice] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const entries = registry.status === 'ready' ? registry.data : []
  const options = [
    { value: '', label: 'Choose a registry entry…' },
    ...entries
      .filter((entry) => !shown.includes(entry.name))
      .map((entry) => ({ value: entry.id, label: entry.name })),
  ]

  const run = async (action: () => Promise<unknown>, gone: boolean) => {
    if (!client || busy) return
    setBusy(true)
    setError(null)
    try {
      await action()
      onWritten(gone)
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="flex flex-col gap-2 rounded-md border border-dashed border-border p-2"
      data-registry-link=""
      data-name-only-placement={placement.name}
    >
      <p className="text-xs text-muted-foreground">
        The registry has no “{placement.name}”. Link it to the entry it was
        about, or take it off this cell.
      </p>
      <Field label="Registry" hint="The registry entry this placement was really about.">
        <div className="flex items-center gap-1.5">
          <OptionSelect
            value={choice}
            onChange={setChoice}
            options={options}
            disabled={busy || registry.status !== 'ready'}
            aria-label={`Registry entry for ${placement.name}`}
            className="min-w-0 flex-1"
          />
          <Button
            type="button"
            size="sm"
            disabled={!choice || busy}
            onClick={() => {
              const target = entries.find((entry) => entry.id === choice)
              if (!target || !client) return
              void run(
                () =>
                  setPlacementTouchpoint(
                    client,
                    { id: placement.id, cellId, name: placement.name },
                    { touchpointId: target.id, touchpointName: target.name },
                  ),
                false,
              )
            }}
          >
            Link to registry
          </Button>
        </div>
      </Field>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="self-start px-2 text-muted-foreground hover:text-destructive"
        disabled={busy}
        onClick={() => {
          if (!client) return
          void run(
            () =>
              removePlacement(client, {
                id: placement.id,
                cellId,
                name: placement.name,
              }),
            true,
          )
        }}
      >
        <X className="size-3" />
        Remove from this cell
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
