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
 * it stands ITS SCRIM down and reports the height it occludes, and the shell
 * does the rest. Closing was the old answer, and it threw the conversation
 * away mid-run: the session keeps going in the module with no surface left
 * to report it, so a turn that failed had nowhere to say so.
 */
export function MobileAgentSheet({
  open,
  onOpenChange,
  backdropCleared = false,
  onOccludedHeightChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Fade the scrim out and drop its blur. The canvas behind this sheet is
   * moving and the reader is meant to watch it — a 90%-opaque page colour
   * over `inset-0` does not merely cover the canvas, it washes it out.
   */
  backdropCleared?: boolean
  /**
   * The height this sheet takes off the bottom of the screen, measured
   * rather than recomputed from the `svh` class below — the two would drift,
   * and a camera inset that disagrees with the panel's real edge frames the
   * target just behind it. 0 once the sheet is gone.
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
        // The scrim's own `transition-opacity duration-150` carries the fade
        // both ways. `backdrop-blur-none` needs the same `supports-` prefix
        // the blur was written with, or tailwind-merge keeps both and the
        // blur outlives the wash.
        overlayClassName={
          backdropCleared
            ? 'opacity-0 supports-backdrop-filter:backdrop-blur-none'
            : undefined
        }
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
