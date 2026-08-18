import { useState } from 'react'
import { Share, Download, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useCanvasAnnotations } from '@/contexts/canvasAnnotationContext'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { setPendingAgentAttachment } from '@/lib/agent/attachments'
import { openAgentSurface } from '@/lib/agent/uiBridge'
import {
  captureMarks,
  describeMarks,
  type MarkBounds,
} from '@/lib/annotationCapture'

/**
 * The way marks get out of the scratch layer.
 *
 * Annotations are not saved, on purpose: persisting every stroke turns markup
 * into a record, and people stop scribbling freely once a scribble is
 * permanent. Costing nothing is the point of the layer. So instead of quiet
 * persistence there is one explicit action, and it appears only once there is
 * something to capture — the affordance is also the notice that reloading will
 * lose them.
 */
export function AnnotationCaptureMenu() {
  const { annotations } = useCanvasAnnotations()
  const { canWrite } = useSupabase()
  const [busy, setBusy] = useState(false)

  if (annotations.length === 0) return null

  /**
   * Every cell's box, in the same coordinate space the marks use.
   *
   * Read from the DOM at capture time rather than tracked continuously: this
   * runs once, when someone asks for it, and the camera has usually moved
   * several times since the marks were drawn.
   */
  // Marks live in the annotation layer's local space; cell rects come from
  // the DOM in screen space. Undo the camera by measuring the layer itself:
  // its on-screen rect vs its layout size gives the zoom, its origin the pan.
  const layerElement = document.querySelector<HTMLElement>(
    '[data-canvas-annotation-layer]',
  )
  const layerRect = layerElement?.getBoundingClientRect()
  const scale =
    layerElement && layerRect && layerElement.offsetWidth > 0
      ? layerRect.width / layerElement.offsetWidth
      : 1
  const originLeft = layerRect?.left ?? 0
  const originTop = layerRect?.top ?? 0

  const cellRects = Array.from(
    document.querySelectorAll('[data-blueprint-cell]'),
  ).flatMap((element) => {
    const cellId = element.getAttribute('data-blueprint-cell')
    if (!cellId) return []
    const rect = element.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) return []
    const bounds: MarkBounds = {
      left: (rect.left - originLeft) / scale,
      top: (rect.top - originTop) / scale,
      right: (rect.right - originLeft) / scale,
      bottom: (rect.bottom - originTop) / scale,
    }
    return [{ cellId, bounds }]
  })

  const download = () => {
    setBusy(true)
    try {
      const marks = captureMarks(annotations, cellRects)
      const payload = {
        capturedAt: new Date().toISOString(),
        marks,
        summary: describeMarks(marks),
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `annotations-${payload.capturedAt.slice(0, 19)}.json`
      link.click()
      // Revoked immediately: the click has already handed the blob to the
      // browser, and leaving it alive holds the whole payload in memory.
      URL.revokeObjectURL(url)
    } finally {
      setBusy(false)
    }
  }

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  aria-label="Save or send these marks"
                  className="pointer-events-auto size-7 shrink-0 p-0 text-muted-foreground hover:text-foreground"
                >
                  <Share className="size-3.5" aria-hidden />
                </Button>
              }
            />
          }
        />
        <TooltipContent side="top" className="text-xs">
          Marks are not saved — capture them before reloading
        </TooltipContent>
      </Tooltip>

      <DropdownMenuContent align="center" side="top">
        <DropdownMenuItem onClick={download}>
          <Download className="size-3.5" aria-hidden />
          Save {annotations.length} mark{annotations.length === 1 ? '' : 's'}
        </DropdownMenuItem>
        {/*
          Structure, not pixels: the marks resolve to the cells they overlap
          plus their text, land on the composer as a removable chip, and the
          chip lists exactly what will travel. Hidden without write access —
          the agent surface does not exist on the read-only site.
        */}
        {canWrite ? (
          <DropdownMenuItem
            onClick={() => {
              const marks = captureMarks(annotations, cellRects)
              const lines = describeMarks(marks)
              setPendingAgentAttachment({
                kind: 'annotations',
                label: `${marks.length} canvas mark${marks.length === 1 ? '' : 's'}`,
                lines,
                payload: JSON.stringify(
                  marks.map((mark) => ({
                    type: mark.type,
                    ...(mark.text ? { text: mark.text } : {}),
                    overlapping_cell_ids: mark.overlaps,
                  })),
                  null,
                  1,
                ),
              })
              openAgentSurface()
            }}
          >
            <MessageSquare className="size-3.5" aria-hidden />
            Send to the agent
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
