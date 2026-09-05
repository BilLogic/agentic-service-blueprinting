import { useSyncExternalStore } from 'react'

/**
 * Whether the shell is showing its once-per-entry boot skeleton.
 *
 * `EditorShell` owns the boot latch and publishes it here; the identity bars
 * read it to hold their own skeletons until the shell lifts its lane, so the
 * screen assembles as one thing rather than three racing (#253).
 *
 * A module store rather than context, for the same reason
 * `sidebarCollapsedContext` is one: the bars live deep inside canvas content,
 * several providers away from the shell that owns the state, and this is one
 * boolean rather than something worth threading through every surface.
 *
 * SEPARATE FROM THE HOLD KEY, deliberately. Giving the bar
 * `EDITOR_BOOT_HOLD_KEY` was rejected, and that rejection stands: a shared
 * hold key is ONE session with one fade, meant for stages of a waterfall that
 * hand off to each other. The bar keeps its own session and draws its own skeleton. What it
 * reads here is only WHEN it may stop — which is the same one-directional read
 * the shell already makes of the canvas's reveal rung, one link further along
 * the same chain and still not a cycle.
 *
 * It defaults to false and stays false unless a shell publishes otherwise, so
 * a bar on a surface with no boot lane — the mobile shell, a bar under test —
 * waits on its query and on nothing else.
 */
let booting = false
const listeners = new Set<() => void>()

export function setShellBooting(next: boolean): void {
  if (booting === next) return
  booting = next
  listeners.forEach((listener) => listener())
}

export function useShellBooting(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => booting,
    () => booting,
  )
}
