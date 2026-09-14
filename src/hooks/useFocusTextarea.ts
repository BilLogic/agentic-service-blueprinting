import { useEffect, useRef } from 'react'

/**
 * Focus a textarea after mount/edit — deferred past pointerup / chrome mount.
 *
 * Every annotation node that can be typed into wants the same thing when its
 * editor opens: the caret at the end of the text, once the gesture that opened
 * it has finished. Waiting is the whole of it, which is why the two frames and
 * the timeout below are the body rather than a detail.
 */
export function useFocusTextarea(active: boolean) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (!active) return
    let cancelled = false
    const focus = () => {
      if (cancelled) return
      const el = ref.current
      if (!el) return
      el.focus({ preventScroll: true })
      const len = el.value.length
      el.setSelectionRange(len, len)
    }
    // Double rAF + timeout: first paint, then after pointer capture releases.
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        focus()
        window.setTimeout(focus, 0)
      })
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
    }
  }, [active])
  return ref
}
