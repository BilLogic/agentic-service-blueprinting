import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { invalidateStructure } from '@/hooks/useSupabaseQuery'
import { createPhase } from '@/lib/authoringRpc'

/**
 * A new phase at the end of the service.
 *
 * No position picker. A phase is a column of the whole canvas, so inserting one
 * mid-sequence re-lays-out every scenario to its right — that is a reorder,
 * with its own consequences, and it is not what "add a phase" means. This
 * appends, which is always safe.
 *
 * Only a name is asked for. The description shows under the phase title and is
 * worth having, but it is the kind of sentence that gets written properly on
 * the second pass; demanding it up front is how placeholder text ends up in a
 * blueprint.
 */
export function CreatePhaseDialog({
  lifecycleId,
  open,
  onOpenChange,
  onCreated,
}: {
  lifecycleId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (phaseId: string) => void
}) {
  const { client } = useSupabase()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trimmed = name.trim()
  const ready = trimmed.length > 0 && !busy && client !== null && lifecycleId !== null

  const handleCreate = async () => {
    if (!client || !lifecycleId || !ready) return
    setBusy(true)
    setError(null)
    try {
      const phaseId = await createPhase(client, { lifecycleId, name: trimmed })
      invalidateStructure()
      setName('')
      onOpenChange(false)
      onCreated?.(phaseId)
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : String(createError),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) setError(null)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New phase</DialogTitle>
          <DialogDescription>
            Phases run left to right across the whole canvas. A new one is added
            at the end.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 px-6" data-create-phase-fields="">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-foreground">Name</span>
            <Input
              value={name}
              autoFocus
              placeholder="e.g. Offboarding"
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && ready) void handleCreate()
              }}
            />
          </label>

          {error ? (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" aria-hidden />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={!ready} onClick={handleCreate}>
            {busy ? 'Creating…' : 'Create phase'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
