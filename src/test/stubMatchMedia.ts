/**
 * A `matchMedia` whose answer a case sets, and can then change under the
 * listeners it collected. Shared by the theme module's suite and the toggle's,
 * which both need the OS preference as an input they control.
 */
type MediaListener = (event: { matches: boolean }) => void

export function stubMatchMedia(prefersDark = false) {
  const listeners = new Set<MediaListener>()
  let matches = prefersDark
  window.matchMedia = ((query: string) => ({
    get matches() {
      return matches
    },
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: (_type: string, listener: MediaListener) => {
      listeners.add(listener)
    },
    removeEventListener: (_type: string, listener: MediaListener) => {
      listeners.delete(listener)
    },
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
  return {
    change(next: boolean) {
      matches = next
      listeners.forEach((listener) => listener({ matches: next }))
    },
  }
}
