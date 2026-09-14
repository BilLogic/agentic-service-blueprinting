/**
 * Types for `sweep.mjs`; the account of the module — what a subject is, and
 * what each of them means by "cannot see the subject" — is in that file.
 */

/** The named trees a check can ask for. */
export type Subject =
  | 'app'
  | 'docs'
  | 'scripts'
  | 'migrations'
  | 'references'
  | 'reference-docs'
  | 'deployment-seed'
  | 'commit'

/** What a sweep hands back, the same shape for every subject. */
export type Sweep = {
  subject: Subject
  /** The directory the paths hang off. */
  base: string
  /** The files, as a finding prints them: relative to `base`, sorted. */
  files: string[]
  /** Whether the subject was there; false only where a subject may skip. */
  seen: boolean
  /** The absolute path of one file, `where` or no `where`. */
  locate(path: string): string
  /** The file's text, or null for a path that has gone; anything else throws. */
  read(path: string, encoding?: BufferEncoding): string | null
}

/** The files for one subject. */
export function sweep(options?: {
  subject: Subject
  root?: string
  where?: (path: string) => boolean
  what?: string
  io?: {
    env?: Record<string, string | undefined>
    write?: (text: string) => void
    append?: (path: string, text: string) => void
  }
}): Sweep

/** Root documents the `docs` subject never lists. */
export const UNSWEPT_ROOT_DOCS: readonly string[]

/** The package a deployment reads the application out of. */
export const APP_PACKAGE: string

/** The subjects, in the order `sweep.mjs` explains them. */
export const SUBJECTS: readonly Subject[]

/** The application's layers under `root`, overlay first, each on disk. */
export function appLayers(root: string): string[]

/** `what` went unverified, because `why`; true when this call said it. */
export function unverified(
  what: string,
  why: string,
  io?: Parameters<typeof sweep>[0]['io'],
): boolean

/** Forget what has been said. For a test, which runs many cases in one process. */
export function forgetUnverified(): void
