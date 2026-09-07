import { useSyncExternalStore } from 'react'
import { storageKey } from '@/lib/storageNamespace'

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

/**
 * How wide the agent searches when the caller names no service.
 *
 * `active` (the default) scopes every read to the ONE service on screen — the
 * one the URL slug names — so a large deployment does not search every service
 * on every question. `all` is the creator's opt-in to a deployment-wide default.
 * A per-call `service` filter overrides this either way (one named service, or
 * `all`). This replaces the old global single-service cache: the agent no
 * longer assumes one service per deployment, it defaults to the active one.
 */
export type AgentServiceScopeMode = 'active' | 'all'

export type AgentSettings = {
  provider: AgentProviderId
  /** Model override per provider; empty string = the provider's default. */
  models: Partial<Record<AgentProviderId, string>>
  keys: Partial<Record<AgentProviderId, string>>
  /** Default search scope when a tool call names no service. */
  serviceScope: AgentServiceScopeMode
}

const STORAGE_KEY = storageKey('agent-settings')

const EMPTY: AgentSettings = {
  provider: 'google',
  models: {},
  keys: {},
  serviceScope: 'active',
}

function read(): AgentSettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw) as Partial<AgentSettings>
    return {
      provider: parsed.provider ?? 'google',
      models: parsed.models ?? {},
      keys: parsed.keys ?? {},
      serviceScope: parsed.serviceScope === 'all' ? 'all' : 'active',
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

/** The default search scope from a settings snapshot. */
export function serviceScopeMode(settings: AgentSettings): AgentServiceScopeMode {
  return settings.serviceScope ?? 'active'
}

/**
 * The default search scope, read straight off the module snapshot — for the
 * non-React dispatch path (`registry.ts`), which resolves a tool's scope with
 * no hook in reach. Returns `active` in a non-browser context (EMPTY snapshot).
 */
export function getAgentServiceScopeMode(): AgentServiceScopeMode {
  return snapshot.serviceScope ?? 'active'
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
