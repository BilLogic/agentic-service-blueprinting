import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
import { createPath, duplicatePath } from '@/lib/authoringRpc'
import {
  PATH_TYPES,
  PATH_TYPE_LABELS,
  describeVersionOutcome,
  validateDraftVersion,
  type DraftVersion,
  type PathType,
} from '@/lib/versionValidation'

export type ExistingVersion = { pathId: string; name: string }

const EMPTY: DraftVersion = {
  mode: 'blank',
  name: '',
  pathType: 'alternative',
  sourcePathId: null,
  copyCells: true,
  copyDependencies: true,
}

/**
 * Add a version of a journey — blank, or a copy of one that exists.
 *
 * The two modes are one dialog because the choice between them is the same
 * decision: how much of an existing version is worth keeping. Splitting them
 * into "New" and "Duplicate" would make people pick before they know.
 *
 * The outcome sentence is not decoration. Copying arrows is the part people
 * get wrong, and "with the arrows repointed onto the copies" is the only way
 * to say that the copy will not draw lines back into the original.
 */
export function CreateVersionDialog({
  scenarioId,
  scenarioName,
  versions,
  open,
  onOpenChange,
  onCreated,
}: {
  scenarioId: string
  scenarioName: string
  versions: ExistingVersion[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (pathId: string) => void
}) {
  const { client } = useSupabase()
  const [draft, setDraft] = useState<DraftVersion>(EMPTY)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof DraftVersion>(key: K, value: DraftVersion[K]) =>
    setDraft((current) => ({ ...current, [key]: value }))

  const problems = validateDraftVersion(
    draft,
    versions.map((version) => version.name),
  )

  const handleCreate = async () => {
    if (!client || busy || problems.length > 0) return
    setBusy(true)
    setError(null)
    try {
      const pathId =
        draft.mode === 'duplicate' && draft.sourcePathId
          ? await duplicatePath(client, {
              sourcePathId: draft.sourcePathId,
              name: draft.name,
              pathType: draft.pathType,
              copyCells: draft.copyCells,
              copyDependencies: draft.copyDependencies,
            })
          : await createPath(client, {
              scenarioId,
              name: draft.name,
              pathType: draft.pathType,
              laneSourcePathId: draft.sourcePathId,
            })
      invalidateStructure()
      setDraft(EMPTY)
      onOpenChange(false)
      onCreated?.(pathId)
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New path in {scenarioName}</DialogTitle>
          <DialogDescription>
            Paths are alternatives, not stages — nothing connects across them.
          </DialogDescription>
        </DialogHeader>

        <div
          className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto px-6"
          data-create-version-fields=""
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-foreground">Name</span>
            <Input
              value={draft.name}
              autoFocus
              placeholder="Escalation"
              onChange={(event) => set('name', event.target.value)}
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-foreground">Kind</span>
            <div className="flex flex-wrap gap-1.5">
              {PATH_TYPES.map((type) => (
                <Button
                  key={type}
                  type="button"
                  size="sm"
                  variant={draft.pathType === type ? 'default' : 'outline'}
                  className="h-7 text-xs"
                  onClick={() => set('pathType', type as PathType)}
                >
                  {PATH_TYPE_LABELS[type]}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-foreground">
              Start from
            </span>
            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                size="sm"
                variant={draft.mode === 'blank' ? 'default' : 'outline'}
                className="h-7 text-xs"
                onClick={() => set('mode', 'blank')}
              >
                Empty grid
              </Button>
              <Button
                type="button"
                size="sm"
                variant={draft.mode === 'duplicate' ? 'default' : 'outline'}
                className="h-7 text-xs"
                disabled={versions.length === 0}
                onClick={() => set('mode', 'duplicate')}
              >
                A copy of…
              </Button>
            </div>
          </div>

          {versions.length > 0 ? (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-foreground">
                {draft.mode === 'duplicate' ? 'Version to copy' : 'Lanes from'}
              </span>
              <select
                value={draft.sourcePathId ?? ''}
                onChange={(event) =>
                  set('sourcePathId', event.target.value || null)
                }
                className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
                aria-label={
                  draft.mode === 'duplicate' ? 'Version to copy' : 'Lanes from'
                }
              >
                {draft.mode === 'duplicate' ? (
                  <option value="">Pick a path…</option>
                ) : (
                  <option value="">Same lanes as the rest of this journey</option>
                )}
                {versions.map((version) => (
                  <option key={version.pathId} value={version.pathId}>
                    {version.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {draft.mode === 'duplicate' ? (
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-2 text-xs text-foreground">
                <input
                  type="checkbox"
                  checked={draft.copyCells}
                  onChange={(event) => set('copyCells', event.target.checked)}
                />
                Copy the cell text
              </label>
              <label className="flex items-center gap-2 text-xs text-foreground">
                <input
                  type="checkbox"
                  checked={draft.copyDependencies}
                  onChange={(event) =>
                    set('copyDependencies', event.target.checked)
                  }
                />
                Copy the arrows
              </label>
            </div>
          ) : null}

          <p
            className="text-xs text-muted-foreground"
            data-version-outcome=""
          >
            {describeVersionOutcome(draft)}
          </p>

          {problems.length > 0 ? (
            <ul
              className="flex flex-col gap-1 text-xs text-muted-foreground"
              data-create-version-problems=""
            >
              {problems.map((problem) => (
                <li key={problem}>· {problem}</li>
              ))}
            </ul>
          ) : null}

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
          <Button
            type="button"
            disabled={busy || problems.length > 0}
            onClick={handleCreate}
          >
            {busy ? 'Creating…' : 'Create path'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
