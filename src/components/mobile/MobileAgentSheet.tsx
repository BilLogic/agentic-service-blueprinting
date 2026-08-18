import { X } from 'lucide-react'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { AgentPanel } from '@/components/editor/AgentPanel'
import { Button } from '@/components/ui/button'

/**
 * The agent, as a BOTTOM sheet — a little over half the screen, so the
 * canvas stays visible behind it (92svh read as a full-screen takeover).
 * AgentPanel state lives in the module store (panelState), so open/close
 * never drops a session.
 *
 * The header is custom rather than the sheet's default chrome so its
 * gutters MATCH the panel's own (the SESSIONS row sits on an 8 px inset):
 * title left-aligned with the section labels, close button's right edge on
 * the same line as the panel's + / filter controls. Without this the sheet
 * title floated on a 16 px gutter one step off everything under it.
 */
export function MobileAgentSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        // min-h + max-h pin the size in BOTH directions: the sheet variant's
        // own data-[side=bottom] h-auto survives tailwind-merge (different
        // variant prefix), so a bare h-[60svh] loses to it — content-hungry
        // panels grew past it, and a fresh empty chat SHRANK below it. The
        // sheet is a fixed room the conversation lives in, not a balloon.
        className="flex min-h-[60svh] max-h-[60svh] flex-col gap-0 rounded-t-2xl p-0"
      >
        <SheetHeader className="flex-row items-center justify-between border-b border-border py-1 pl-2 pr-0.5">
          <SheetTitle className="text-sm">Agent</SheetTitle>
          <SheetClose
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-9"
                aria-label="Close"
              >
                <X />
              </Button>
            }
          />
        </SheetHeader>
        {/* Must be a flex COLUMN, not a block: AgentPanel's own root is
            `min-h-0 flex-1 flex-col`, which only stretches inside a flex
            parent — in a block div the panel takes natural height and the
            composer floats mid-sheet instead of anchoring at the bottom. */}
        <div className="flex min-h-0 flex-1 flex-col">
          <AgentPanel />
        </div>
      </SheetContent>
    </Sheet>
  )
}
