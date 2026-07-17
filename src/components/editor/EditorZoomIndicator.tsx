type EditorZoomIndicatorProps = {
  zoom: number
}

export function EditorZoomIndicator({ zoom }: EditorZoomIndicatorProps) {
  return (
    <div
      data-zoom-indicator=""
      className="pointer-events-none absolute bottom-3 left-1/2 z-30 -translate-x-1/2 rounded-md border border-border/70 bg-card/90 px-2 py-1 shadow-sm backdrop-blur-sm"
    >
      <span className="block min-w-[2.75rem] text-center font-mono text-xs leading-none text-muted-foreground">
        {Math.round(zoom * 100)}%
      </span>
    </div>
  )
}
