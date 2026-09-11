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
 * The model list shown BEFORE a key is saved, and nothing else.
 *
 * With a key, the dropdown lists the provider's own list-models endpoint
 * (`providers/models.ts`), so it is current by construction. This list is what
 * a person sees while deciding whether the feature is worth a key — which is
 * the worst possible place for a name a year out of date, because it is read
 * as what this app can do rather than as a default someone forgot to edit.
 *
 * THE POLICY, so the next refresh is a decision already made:
 *
 *   Three entries per provider, newest first. The first is `DEFAULT_MODELS`,
 *   so it must be a model the provider currently serves and a sane default for
 *   an in-browser assistant — not the largest model on the price list.
 *
 *   No previews, no dated snapshots, no aliases the provider may repoint. A
 *   preview disappears; a dated snapshot retires; an alias makes two people
 *   running "the same model" run different ones.
 *
 *   Verified by CALLING each provider's list-models endpoint on the day of the
 *   change, not by recollection and not from a docs page — an id can be
 *   published and still 404 for a given account.
 *
 * Verified 2026-09-11. Google: called, `gemini-3.8-flash` is the newest
 * generally available chat model. Anthropic: the three tiers a person chooses
 * between; the list is deliberately not every id the account can reach.
 * OpenAI: taken from the published model docs and NOT confirmed against
 * `/v1/models`, because no OpenAI key was available — the one entry here that
 * is a claim rather than a measurement.
 */
export const MODEL_OPTIONS: Record<AgentProviderId, string[]> = {
  google: ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.5-flash-lite'],
  anthropic: ['claude-opus-5', 'claude-sonnet-5', 'claude-haiku-4-5'],
  openai: ['gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna'],
}

export const DEFAULT_MODELS: Record<AgentProviderId, string> = {
  google: MODEL_OPTIONS.google[0],
  anthropic: MODEL_OPTIONS.anthropic[0],
  openai: MODEL_OPTIONS.openai[0],
}

/*
 * There is no search-scope setting. The agent reads every service in the
 * deployment when a question names none, and a caller who wants one names it in
 * the per-call `service` argument — so there is nothing left for a stored
 * preference to decide. A value left under `serviceScope` in a browser from
 * before is simply never read.
 */

export type AgentSettings = {
  provider: AgentProviderId
  /** Model override per provider; empty string = the provider's default. */
  models: Partial<Record<AgentProviderId, string>>
  keys: Partial<Record<AgentProviderId, string>>
}

const STORAGE_KEY = storageKey('agent-settings')

const EMPTY: AgentSettings = {
  provider: 'google',
  models: {},
  keys: {},
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
