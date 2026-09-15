/**
 * The two session dialogs: rename and delete.
 *
 * Both are opened from the sessions list, and rename also from the chat
 * header, so they sit beside the views rather than inside either one. Each
 * takes the session it acts on — `null` is closed — and reports the close
 * back, so nothing about which list opened it reaches in here.
 *
 * And each REPORTS its verb rather than performing it. A dialog that reached
 * into the session store was a third writer of it, beside the panel and the
 * chat view, which is how the open session came to be deleted by code that
 * had no idea a session was open. What a dialog knows is the session and the
 * title somebody typed; what happens to them is the session module's.
 */
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { type AgentSession } from '@/lib/agent/sessions'

export function RenameSessionDialog({
  session,
  onRename,
  onOpenChange,
}: {
  session: AgentSession | null
  /** Called only for a title that is both non-empty and actually new. */
  onRename: (id: string, title: string) => void
  onOpenChange: (open: boolean) => void
}) {
  const [title, setTitle] = useState('')
  // Freeze the incoming title per dialog opening.
  const [lastId, setLastId] = useState<string | null>(null)
  if (session && session.id !== lastId) {
    setLastId(session.id)
    setTitle(session.title)
  }
  if (!session && lastId !== null) setLastId(null)

  const submit = () => {
    if (!session) return
    const trimmed = title.trim()
    if (trimmed && trimmed !== session.title) onRename(session.id, trimmed)
    onOpenChange(false)
  }

  return (
    <Dialog open={session !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">Rename session</DialogTitle>
        </DialogHeader>
        {/* Body content carries its own gutter — DialogContent is
            deliberately unpadded so p-0 surfaces (command palette,
            walkthrough) don't fight it. */}
        <div className="px-6 py-4">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submit()
            }}
            aria-label="Session title"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit} disabled={title.trim() === ''}>
            Rename
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function DeleteSessionDialog({
  session,
  onDelete,
  onOpenChange,
}: {
  session: AgentSession | null
  onDelete: (id: string) => void
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={session !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">
            Delete “{session?.title}”?
          </DialogTitle>
        </DialogHeader>
        <p className="px-6 py-4 text-xs text-muted-foreground">
          Changes it already made to the blueprint stay — revert those from
          Changes.
        </p>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (session) onDelete(session.id)
              onOpenChange(false)
            }}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
