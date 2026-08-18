import { useSyncExternalStore } from 'react'

/**
 * BYO-key agent settings. Keys live in localStorage and nowhere else — not
 * the repo, not the bundle, not a server env. A browser-held key is readable
 * by anyone with devtools on this machine; the settings UI says so in those
 * words rather than implying a safety it does not have.
 */

export type AgentProviderId = 'google' | 'anthropic' | 'openai'

export const AGENT_PROVIDERS: Array<{ id: AgentProviderId; label: string }> = [
  { id: 'google', label: 'Google Gemini' },
  { id: 'anthropic', label: 'Anthropic Claude' },
  { id: 'openai', label: 'OpenAI' },
]

/**
 * FALLBACK model lists, shown only until a key is saved — with a key, the
 * dropdown lists the provider's own list-models endpoint (models.ts), so
 * it is current by construction. First entry is the default.
 * Verified against provider docs 2026-08-04.
 */
export const MODEL_OPTIONS: Record<AgentProviderId, string[]> = {
  google: [
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-2.5-pro',
    'gemini-2.5-flash',
  ],
  anthropic: ['claude-opus-5', 'claude-sonnet-5', 'claude-haiku-4-5'],
  openai: ['gpt-5.5', 'gpt-5.4', 'gpt-5.4-mini'],
}

export const DEFAULT_MODELS: Record<AgentProviderId, string> = {
  google: MODEL_OPTIONS.google[0],
  anthropic: MODEL_OPTIONS.anthropic[0],
  openai: MODEL_OPTIONS.openai[0],
}

export type AgentSettings = {
  provider: AgentProviderId
  /** Model override per provider; empty string = the provider's default. */
  models: Partial<Record<AgentProviderId, string>>
  keys: Partial<Record<AgentProviderId, string>>
}

const STORAGE_KEY = 'asb-agent-settings'

const EMPTY: AgentSettings = { provider: 'google', models: {}, keys: {} }

function read(): AgentSettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw) as Partial<AgentSettings>
    return {
      provider: parsed.provider ?? 'google',
      models: parsed.models ?? {},
      keys: parsed.keys ?? {},
    }
  } catch {
    return EMPTY
  }
}

// Snapshot cached so useSyncExternalStore sees a stable reference between
// writes (a fresh object per getSnapshot call would loop the render).
let snapshot: AgentSettings = typeof window === 'undefined' ? EMPTY : read()
const listeners = new Set<() => void>()

function write(next: AgentSettings) {
  snapshot = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Quota / private-browsing failures degrade to session-only settings.
  }
  listeners.forEach((listener) => listener())
}

export function useAgentSettings(): AgentSettings {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => snapshot,
  )
}

export function saveAgentSettings(patch: Partial<AgentSettings>) {
  write({
    ...snapshot,
    ...patch,
    models: { ...snapshot.models, ...patch.models },
    keys: { ...snapshot.keys, ...patch.keys },
  })
}

export function modelFor(settings: AgentSettings): string {
  return settings.models[settings.provider] || DEFAULT_MODELS[settings.provider]
}

export function hasKey(settings: AgentSettings): boolean {
  return Boolean(settings.keys[settings.provider])
}

/**
 * "Open the ⚙ popover" as a callable, shared between the rail button and
 * the chat view's no-key hint. Lives here (not the component file) so fast
 * refresh keeps working there.
 */
let settingsOpenFlag = false
const settingsOpenListeners = new Set<() => void>()

export function openAgentSettings(): void {
  settingsOpenFlag = true
  settingsOpenListeners.forEach((listener) => listener())
}

export function setAgentSettingsOpen(next: boolean): void {
  settingsOpenFlag = next
  settingsOpenListeners.forEach((listener) => listener())
}

export function useAgentSettingsOpen(): boolean {
  return useSyncExternalStore(
    (listener) => {
      settingsOpenListeners.add(listener)
      return () => settingsOpenListeners.delete(listener)
    },
    () => settingsOpenFlag,
  )
}
