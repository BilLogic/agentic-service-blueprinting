import { readFileSync } from 'node:fs'
import { type Sweep, sweep } from '../../scripts/sweep.mjs'

/**
 * ONE READING OF THE APPLICATION, ADDRESSED BY SURFACE. Test-time only.
 *
 * Fifty-one test modules opened this tree with `readFileSync` and a path they
 * built themselves — `resolve(__dirname, '..', 'components/editor/Foo.tsx')`,
 * `join(process.cwd(), 'src/App.tsx')`, `new URL('../styles/blueprint.css',
 * import.meta.url)`. Each spelling is a second opinion about where the
 * application is, and each one is a copy of the tree's shape written down
 * somewhere the tree cannot see. So a file that moved edited the guards
 * instead of being caught by them: the agent panel split had to change three
 * of them, and the move was correct every time — the guards were simply
 * naming an address that no longer existed.
 *
 * This module is the one answer to "where is the application, and what is in
 * it". It asks `scripts/sweep.mjs` for the `app` subject once — the
 * deployment's `src` laid over the package's, per path, which is the overlay
 * the build applies — holds the listing, and answers questions against it. A
 * guard names a file or a surface; it never names a root.
 *
 * A SURFACE is a named region of the application: `editor`, `ui`, `lib`,
 * `styles`, `app` for the whole of it. Surfaces nest, and `surfaceOf` answers
 * with the most specific one, so `components/editor/EditorShell.tsx` is on
 * `editor` and not merely on `components`. A surface is how a guard says what
 * it is about — "every panel under the blueprint surface" — without saying
 * where that surface lives, which is the fact that keeps moving.
 *
 * WHY A MISSING FILE IS THE INTERESTING CASE. A guard that opens a path
 * directly gets `ENOENT` and a path, which says the guard is broken and
 * nothing about the tree. The reading has the whole listing in hand, so it
 * can say the thing worth saying: this path is not there, a file of that name
 * is at THIS path now, and the surface it swept held these many files. That
 * sentence is the difference between a move that edits the guards and a move
 * the guards catch.
 *
 * PATHS ARE RELATIVE TO `src`, forward-slashed, sorted — the spelling
 * `tokenModel`'s `SourceFile.file` already used and every converted guard
 * already wrote. The `src/` prefix is the sweep's business, not a guard's.
 *
 * NOT here: anything outside the application. The migrations, the published
 * references, the package's own generated documents and `node_modules` are
 * other subjects of the same sweep, and a guard over one of those still asks
 * the sweep for it directly.
 */

/** A file of the application, read once. */
export type SourceFile = {
  /** Path relative to `src`, forward slashes. */
  file: string
  /** The file's text, verbatim — comments and all. */
  text: string
}

/**
 * The named regions of the application, and where each one lives.
 *
 * Declared rather than derived from folder names for the reason
 * `check-harness-claims.mjs` gives about the same tree: folder names are not
 * stable, and a surface is a thing a guard is about rather than a directory
 * listing. `app` is the whole application and is the prefix every other
 * surface hangs off.
 */
const SURFACES = {
  app: '',
  assets: 'assets/',
  components: 'components/',
  blueprint: 'components/blueprint/',
  cover: 'components/cover/',
  editor: 'components/editor/',
  mobile: 'components/mobile/',
  ui: 'components/ui/',
  content: 'content/',
  contexts: 'contexts/',
  data: 'data/',
  dev: 'dev/',
  hooks: 'hooks/',
  lib: 'lib/',
  agent: 'lib/agent/',
  backend: 'lib/backend/',
  slices: 'slices/',
  styles: 'styles/',
  test: 'test/',
  types: 'types/',
} as const

/** A named region of the application. */
export type Surface = keyof typeof SURFACES

/** Every surface, most specific first, so a lookup stops at the right one. */
const BY_DEPTH = (Object.keys(SURFACES) as Surface[]).sort(
  (a, b) => SURFACES[b].length - SURFACES[a].length,
)

/** Is this file a source file — the application's own, not a test of it? */
const isSource = (path: string) =>
  /\.tsx?$/.test(path) && !path.includes('.test.')

/** What one reading of the tree can be asked. */
export type Reading = {
  /** The tree this reading swept. */
  root: string
  /** The paths on a surface, `src`-relative and sorted. */
  paths: (surface?: Surface, where?: (path: string) => boolean) => string[]
  /** The files on a surface, text and all. */
  files: (surface?: Surface, where?: (path: string) => boolean) => SourceFile[]
  /** The non-test TypeScript on a surface. */
  sources: (surface?: Surface) => SourceFile[]
  /** Does the application hold this path? */
  has: (path: string) => boolean
  /** The text of one file, or a refusal that says where the file went. */
  textOf: (path: string) => string
  /** The bytes of one file, for a rule about what text cannot carry. */
  bytesOf: (path: string) => Buffer
  /** The most specific surface this path is on. */
  surfaceOf: (path: string) => Surface
}

const SRC_PREFIX = 'src/'

/**
 * The text of a listed path, insisting the file is still there.
 *
 * The sweep hands back null for a path that went between the listing and the
 * read — a skip a walk over a moving tree can afford, and a guard cannot:
 * every rule riding this reading asserts about a COMPLETE sample, and a
 * sample that quietly lost a file passes each one of them. The rule was
 * `tokenModel`'s and is stated here instead, once, for every reader.
 */
function readListed(walk: Sweep, path: string): string {
  const text = walk.read(`${SRC_PREFIX}${path}`)
  if (text === null) {
    throw new Error(`${path} went away between the listing and the read`)
  }
  return text
}

/**
 * Read the application under `root`.
 *
 * The listing is taken once and held; a file's text is read the first time
 * something asks for it and held too, so a suite of guards over the same tree
 * pays for each file once however many rules read it.
 */
export function readingIn(root: string): Reading {
  const walk = sweep({
    subject: 'app',
    root,
    what: 'file of the application',
  })
  const listed = walk.files
    .map((path) => path.slice(SRC_PREFIX.length))
    .sort((a, b) => a.localeCompare(b))
  const held = new Set(listed)
  const texts = new Map<string, string>()

  const surfaceOf = (path: string): Surface =>
    BY_DEPTH.find((surface) => path.startsWith(SURFACES[surface])) ?? 'app'

  const on = (surface: Surface, where?: (path: string) => boolean) => {
    const prefix = SURFACES[surface]
    return listed.filter(
      (path) => path.startsWith(prefix) && (where ? where(path) : true),
    )
  }

  const textOf = (path: string): string => {
    if (!held.has(path)) throw missing(path)
    const cached = texts.get(path)
    if (cached !== undefined) return cached
    const text = readListed(walk, path)
    texts.set(path, text)
    return text
  }

  /**
   * The refusal a guard naming a path the tree no longer has should read.
   *
   * It names the surface swept and how much was on it, so "the reading found
   * nothing" and "the reading found the wrong tree" cannot be confused; and
   * where a file of the same name stands somewhere else, it names that, which
   * is the whole answer to a move for every guard at once.
   */
  function missing(path: string): Error {
    const surface = surfaceOf(path)
    const basename = path.slice(path.lastIndexOf('/') + 1)
    const elsewhere = listed.filter(
      (candidate) =>
        candidate !== path &&
        (candidate === basename || candidate.endsWith(`/${basename}`)),
    )
    const moved = elsewhere.length
      ? ` A file of that name is at ${elsewhere.join(', ')}; if it moved, name it there.`
      : ''
    return new Error(
      `the application has no ${path}: the reading swept ${on(surface).length} ` +
        `files on the ${surface} surface under ${walk.base}.${moved}`,
    )
  }

  return {
    root: walk.base,
    paths: (surface = 'app', where) => on(surface, where),
    files: (surface = 'app', where) =>
      on(surface, where).map((file) => ({ file, text: textOf(file) })),
    sources: (surface = 'app') =>
      on(surface, isSource).map((file) => ({ file, text: textOf(file) })),
    has: (path) => held.has(path),
    textOf,
    bytesOf: (path) => {
      if (!held.has(path)) throw missing(path)
      return readFileSync(walk.locate(`${SRC_PREFIX}${path}`))
    },
    surfaceOf,
  }
}

let cached: Reading | null = null

/**
 * The reading of the tree this run is in.
 *
 * The root is the working directory, never this file's own location: a
 * deployment installs the package under `node_modules` and a reading resolved
 * from here would measure the package inside the consumer and never the
 * application the consumer builds. That is the rule `sweep.mjs`'s header
 * states for every check, and this is the one place the application's guards
 * apply it.
 */
export function reading(): Reading {
  if (!cached) cached = readingIn(process.cwd())
  return cached
}

/** Forget the held reading. For a test that changes the tree under it. */
export function forgetReading(): void {
  cached = null
}

/** The paths on a surface of this tree. */
export const pathsOn = (
  surface?: Surface,
  where?: (path: string) => boolean,
): string[] => reading().paths(surface, where)

/** The files on a surface of this tree, text and all. */
export const filesOn = (
  surface?: Surface,
  where?: (path: string) => boolean,
): SourceFile[] => reading().files(surface, where)

/** The non-test TypeScript on a surface of this tree. */
export const sourcesOn = (surface?: Surface): SourceFile[] =>
  reading().sources(surface)

/** The text of one file of this tree, addressed relative to `src`. */
export const sourceOf = (path: string): string => reading().textOf(path)

/** The bytes of one file of this tree, addressed relative to `src`. */
export const bytesOf = (path: string): Buffer => reading().bytesOf(path)

/** Does this tree hold this path? */
export const hasSource = (path: string): boolean => reading().has(path)

/** The most specific surface a path of this tree is on. */
export const surfaceOf = (path: string): Surface => reading().surfaceOf(path)
