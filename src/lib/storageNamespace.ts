/**
 * The localStorage namespace this installation owns.
 *
 * A CONFIGURATION SEAM. Every key written to `window.localStorage` is
 * prefixed, and the prefix names the INSTALLATION rather than the code: this
 * kit ships as `sb-`, and an adopter gives its own installation a prefix of
 * its own. Two installations served from one origin would otherwise read each
 * other's settings, sessions and chat placement, so the prefix is the one
 * thing about a stored key that must differ per install.
 *
 * That is why this module exists instead of a string literal at each call
 * site. Every module that stores anything imports `storageKey` from here,
 * which leaves those modules identical across installations and confines the
 * difference to one value. Do not inline the prefix again: an adopter would
 * then have to find and edit every call site, and would miss one.
 *
 * ── HOW AN ADOPTER SETS IT, AND WHY IT IS NOT A `DeploymentConfig` FIELD ───
 *
 * There are two kinds of adopter and they reach the prefix differently.
 *
 * An app that COPIES this repo edits `STORAGE_PREFIX` below, which is what
 * the seam has always asked for and still works.
 *
 * A deployment that MOUNTS this package cannot edit a constant inside a module
 * it imports — by design it imports the template rather than overlaying it —
 * so it calls `configureStorageNamespace('acme-')` instead, and it must do so
 * BEFORE it imports the app. That ordering is not a preference. Five modules
 * compute their key at MODULE SCOPE (`agent/settings.ts`, `agent/sessions.ts`,
 * `agent/placement.ts`, `mobilePathMemory.ts` and
 * `components/editor/EditorShell.tsx`), and three of those go further and READ
 * localStorage at module scope to seed a `useSyncExternalStore` snapshot. All
 * of that happens while the import graph evaluates — before React exists, let
 * alone before `App` renders. A `DeploymentConfig` field would therefore be
 * read one lifecycle too late, and the failure would be silent: the app would
 * run on `sb-` keys and quietly share a namespace with any other installation
 * on the origin. A field that cannot be honoured is worse than no field, so
 * the prefix is deliberately NOT part of `DeploymentConfig`; `deploymentConfig.ts`
 * says so and points here.
 *
 * The host's call therefore belongs in a module of its own, imported first:
 *
 *     // main.tsx
 *     import './deploymentBootstrap'          // configures the namespace
 *     import { App } from 'agentic-service-blueprinting'
 *
 * Getting that wrong is LOUD rather than silent: the prefix freezes the first
 * time `storageKey` reads it, and a later call that disagrees throws.
 *
 * The prefix is frozen in a second, longer sense too. Change it ONCE, when
 * adopting the kit. After that the keys already sitting in readers' browsers
 * carry it, and nothing migrates them, so a later change silently forgets
 * every saved API key, session list and remembered path.
 */

/**
 * The prefix this kit ships with, and the default every installation starts
 * from. An app that copies the repo edits this line; a deployment that mounts
 * the package leaves it alone and calls `configureStorageNamespace`.
 */
export const STORAGE_PREFIX = 'sb-'

let prefix: string = STORAGE_PREFIX

/**
 * Has anything asked for a key yet? Once it has, the namespace is settled —
 * whatever was stored under the old prefix is unreachable under a new one, so
 * a disagreeing call after this point is a wiring bug and says so.
 */
let observed = false

/** The prefix in force. Diagnostic: reading it does not settle it. */
export function currentStoragePrefix(): string {
  return prefix
}

/**
 * Name this installation's namespace. Idempotent, so a host that configures
 * from two entry points (an app and a test harness, say) is fine as long as
 * both agree.
 *
 * Throws on a prefix that cannot namespace anything, and on a late change —
 * see the module header for why the call has to precede the app's import.
 */
export function configureStorageNamespace(next: string): void {
  if (next === '') throw new Error('A storage prefix cannot be empty.')
  if (next === prefix) return
  if (observed)
    throw new Error(
      `The storage namespace is already in use as "${prefix}" and cannot be ` +
        `changed to "${next}". Call configureStorageNamespace from a module ` +
        `imported BEFORE the one that imports the app — by the time the app's ` +
        `modules have evaluated, their keys are already built.`,
    )
  prefix = next
}

/** A namespaced localStorage key — `storageKey('agent-settings')`. */
export function storageKey(name: string): string {
  observed = true
  return `${prefix}${name}`
}
