import { useSyncExternalStore } from 'react'
import { storageKey } from '@/lib/storageNamespace'

/**
 * Light or dark, decided and stamped on the root before anything paints.
 *
 * This replaced `next-themes`, and the reason is a Content Security Policy.
 * That library's flash guard is an INLINE `<script>` it injects into the
 * document, and a deployment serving `default-src 'self'` with no `script-src`
 * refuses it — an inline script is not `'self'`. The guard therefore did
 * nothing: the class arrived from React, after the first paint, so a reader
 * whose stored theme is dark saw a light frame on every load, and the console
 * carried a refusal every time to say so. The fixes available were to loosen
 * the policy, to plumb a nonce through a static host, or to own the sixty
 * lines below; the first two trade a real protection for a theme.
 *
 * ── WHY THE WORK HAPPENS AT MODULE SCOPE ───────────────────────────────────
 *
 * The class is applied by a side effect of THIS MODULE EVALUATING, not by a
 * provider rendering and not by an effect. That is the whole mechanism, and it
 * is what makes a hashed asset — allowed by `'self'` — do the job the inline
 * script could not.
 *
 * It also has to survive both ways this template is consumed. `src/main.tsx`
 * is the template's own entry, but a deployment MOUNTS the package: it imports
 * `App` and owns a `main.tsx` this repository never sees. An entry-file
 * statement would therefore be honoured in one consumer and silently skipped
 * in the other. A module-scope effect is honoured in both, because both reach
 * it through `App`'s import graph, and an import graph finishes evaluating
 * before React renders. `storageNamespace.ts`'s header lists the modules that
 * work this way and why; this is one of them.
 *
 * The non-DOM guard below is the same idiom the others use: the suite and any
 * server-side render evaluate this module with no `document` to stamp.
 *
 * ── WHAT PARITY WITH THE OLD PROVIDER MEANS ────────────────────────────────
 *
 *   - The `class` attribute on `documentElement`, because that is what the
 *     tokens key off: `themes/light.css` targets `:root, .light`,
 *     `themes/dark.css` targets `.dark`, and the `dark:` variant is
 *     `&:where(.dark, .dark *)`.
 *   - `color-scheme` on the same element, which `next-themes` set by default
 *     and which is doing real work — it is what makes scrollbars and native
 *     form controls follow the theme rather than staying light under a dark
 *     page.
 *   - `'system'` is a storable choice that resolves through
 *     `prefers-color-scheme` and keeps tracking it live.
 *   - The default is LIGHT, deliberately not `'system'`: an installation with
 *     nothing stored opens light whatever the OS says.
 *
 * The key moved onto the seam, which MOVES it: `next-themes` stored under the
 * bare `theme`, so a theme saved before this release reads once as no theme at
 * all and the app opens on the default. Nothing migrates it; the changeset
 * says so.
 */

/** What a reader can choose and what is stored. */
export type ThemeChoice = 'light' | 'dark' | 'system'

/** What is actually painted. `'system'` resolves to one of these. */
export type ResolvedTheme = 'light' | 'dark'

/**
 * The one key. Exported so the suite can name it without spelling a prefix,
 * and declared once at module scope — the idiom `check:storage-keys` reads.
 */
export const THEME_STORAGE_KEY = storageKey('theme')

/** Nothing stored means light. Not the system preference — see the header. */
export const DEFAULT_THEME: ThemeChoice = 'light'

const DARK_QUERY = '(prefers-color-scheme: dark)'

/** What the reader sees, and what they chose to get it. */
export type ThemeState = {
  theme: ThemeChoice
  resolvedTheme: ResolvedTheme
}

/**
 * Anything that could be in storage → a choice, with no throw path. Pure and
 * separately tested, because this is where a browser running the old build
 * meets the new one: the bare key is gone, so the common case here is `null`.
 */
export function parseStoredTheme(raw: string | null): ThemeChoice {
  return raw === 'light' || raw === 'dark' || raw === 'system'
    ? raw
    : DEFAULT_THEME
}

/** The choice and the query, combined. Pure. */
export function resolveTheme(
  choice: ThemeChoice,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (choice === 'system') return systemPrefersDark ? 'dark' : 'light'
  return choice
}

function mediaQuery(): MediaQueryList | null {
  // jsdom and any non-browser evaluation may have no `matchMedia`; a missing
  // query is "no dark preference" rather than a crash on import.
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function')
    return null
  return window.matchMedia(DARK_QUERY)
}

function systemPrefersDark(): boolean {
  return mediaQuery()?.matches === true
}

function readStoredTheme(): ThemeChoice {
  try {
    return parseStoredTheme(window.localStorage.getItem(THEME_STORAGE_KEY))
  } catch {
    // Private windows and blocked site data both throw here. A remembered
    // theme is a nicety; the default is a correct answer.
    return DEFAULT_THEME
  }
}

function stamp(resolved: ResolvedTheme): void {
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(resolved)
  // The other half of what `next-themes` did by default, and the half that is
  // invisible until a scrollbar stays white down the side of a dark page.
  root.style.colorScheme = resolved
}

const listeners = new Set<() => void>()

/**
 * The application's whole theme state, one cached object. Cached rather than
 * rebuilt per read because `useSyncExternalStore` compares snapshots by
 * identity, and a fresh object every call loops the render.
 */
let snapshot: ThemeState = { theme: DEFAULT_THEME, resolvedTheme: 'light' }

function publish(choice: ThemeChoice): void {
  const resolved = resolveTheme(choice, systemPrefersDark())
  if (choice === snapshot.theme && resolved === snapshot.resolvedTheme) return
  const repaint = resolved !== snapshot.resolvedTheme
  snapshot = { theme: choice, resolvedTheme: resolved }
  if (repaint && typeof document !== 'undefined') stamp(resolved)
  listeners.forEach((listener) => listener())
}

/** The current state. Diagnostic and test-facing; components use the hook. */
export function getTheme(): ThemeState {
  return snapshot
}

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Choose a theme. Writes through, stamps the root, tells the call sites. */
export function setTheme(choice: ThemeChoice): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, choice)
  } catch {
    // See `readStoredTheme` — the choice still applies to this session.
  }
  publish(choice)
}

/*
 * ── The side effect the module exists for ─────────────────────────────────
 *
 * Read, resolve and stamp, right here, while the import graph evaluates.
 * Everything above is arrangement; these few lines are what happens before
 * the first paint.
 */
if (typeof document !== 'undefined') {
  const choice = readStoredTheme()
  snapshot = {
    theme: choice,
    resolvedTheme: resolveTheme(choice, systemPrefersDark()),
  }
  stamp(snapshot.resolvedTheme)

  // Live tracking, for as long as the choice is `'system'`. `publish`
  // re-resolves, so a reader who has chosen outright is unaffected by the OS
  // flipping at sunset.
  mediaQuery()?.addEventListener('change', () => {
    publish(snapshot.theme)
  })

  // Cross-tab. Two tabs of one installation share the key, and without this
  // the tab that did not toggle keeps painting the old theme until it
  // reloads. `key === null` is a `clear()`, which is a change to every key.
  window.addEventListener('storage', (event) => {
    if (event.key !== null && event.key !== THEME_STORAGE_KEY) return
    publish(readStoredTheme())
  })
}

/**
 * The theme, for a component. Shaped like the hook it replaced so the call
 * sites did not move — except that `resolvedTheme` is never `undefined` here.
 * The read above is synchronous and has already happened, so the first render
 * knows the answer, and nothing needs a mounted flag to avoid painting the
 * wrong icon.
 */
export function useTheme(): ThemeState & {
  setTheme: (choice: ThemeChoice) => void
} {
  const state = useSyncExternalStore(subscribeTheme, getTheme, getTheme)
  return { theme: state.theme, resolvedTheme: state.resolvedTheme, setTheme }
}
