import { useCallback, useEffect, useRef } from 'react'
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
 * AgentPanel state lives in the session module (`lib/agent/sessions.ts`), so
 * open/close never drops a session.
 *
 * The header is custom rather than the sheet's default chrome so its
 * gutters MATCH the panel's own (the SESSIONS row sits on an 8 px inset):
 * title left-aligned with the section labels, close button's right edge on
 * the same line as the panel's + / filter controls. Without this the sheet
 * title floated on a 16 px gutter one step off everything under it.
 *
 * The sheet does not get out of the way for an agent-driven camera move —
 * it keeps a thin scrim that never moves and reports the height it occludes, and the shell
 * does the rest. Closing was the old answer, and it threw the conversation
 * away mid-run: the session keeps going in the module with no surface left
 * to report it, so a turn that failed had nowhere to say so.
 */
export function MobileAgentSheet({
  open,
  onOpenChange,
  onOccludedHeightChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * The height this sheet covers, measured from its own node and handed up so
   * the camera can aim above it. Measured rather than read off the `60svh`
   * class, which would drift the moment either one is retuned.
   */
  onOccludedHeightChange?: (px: number) => void
}) {
  const report = useRef(onOccludedHeightChange)
  useEffect(() => {
    report.current = onOccludedHeightChange
  })

  const measureRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) {
      report.current?.(0)
      return
    }
    report.current?.(node.getBoundingClientRect().height)
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            report.current?.(node.getBoundingClientRect().height)
          })
    observer?.observe(node)
    return () => {
      observer?.disconnect()
      report.current?.(0)
    }
  }, [])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        ref={measureRef}
        // A THIN scrim that never moves. The sheet's own surface is opaque,
        // so this wash only ever covers the strip of canvas above it — and at
        // this weight that strip stays readable, which is the whole point: a
        // camera move the agent makes is visible AS it happens, with no state
        // to clear and restore and nothing to fall out of phase.
        //
        // The heavier wash it replaces is why the sheet used to close on a
        // jump: at 90% over a blur the canvas behind was unreadable, so the
        // only way to show the move was to take the conversation away.
        //
        // The strip is WATCHABLE, not touchable. The wash keeps the overlay's
        // hit target, so a tap on the visible canvas dismisses the sheet — the
        // standard way out of a bottom sheet, and the reason no pass-through
        // is set here. Panning the canvas with the sheet up means closing it
        // first, which is deliberate: a gesture that both moved the camera and
        // left the sheet open would need the overlay to distinguish a tap from
        // a drag, and the sheet has no business arbitrating canvas gestures.
        overlayClassName="bg-background/40 supports-backdrop-filter:backdrop-blur-none"
        // min-h + max-h pin the size in BOTH directions: the sheet variant's
        // own data-[side=bottom] h-auto survives tailwind-merge (different
        // variant prefix), so a bare h-[60svh] loses to it — content-hungry
        // panels grew past it, and a fresh empty chat SHRANK below it. The
        // sheet is a fixed room the conversation lives in, not a balloon.
        className="flex min-h-[60svh] max-h-[60svh] flex-col gap-0 rounded-t-xl p-0"
      >
        <SheetHeader className="flex-row items-center justify-between border-b border-border py-1 pl-2 pr-1">
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
