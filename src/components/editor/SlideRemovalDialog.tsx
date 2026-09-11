import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { slideRemovalCopy, type SlideRemoval } from '@/lib/slideRemoval'

/**
 * Asks before a change removes slides that carry a caption or an upload.
 *
 * Keep sits first and is the answer to every way out that is not the
 * Remove button — Escape, the overlay — because a dismissed question must
 * not be read as a yes.
 */
export function SlideRemovalDialog({
  lost,
  onKeep,
  onRemove,
}: {
  /** The slides the waiting change would remove; null when nothing waits. */
  lost: SlideRemoval[] | null
  onKeep: () => void
  onRemove: () => void
}) {
  const copy = lost && lost.length > 0 ? slideRemovalCopy(lost) : null
  return (
    <Dialog
      open={copy !== null}
      onOpenChange={(open) => {
        if (!open) onKeep()
      }}
    >
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        {copy ? (
          <>
            <DialogHeader>
              <DialogTitle>{copy.title}</DialogTitle>
              <DialogDescription>{copy.description}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onKeep}>
                {copy.keep}
              </Button>
              <Button type="button" variant="destructive" onClick={onRemove}>
                {copy.remove}
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
