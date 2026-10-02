/**
 * `create-uno-blueprint`: one command that writes an Uno Blueprint workspace.
 *
 * A workspace is the whole template at one release — the release whose tag is
 * this package's own version, so the number a user installed is the number
 * they started from. It is downloaded as the tarball GitHub serves for that
 * tag and unpacked here: gunzip from the standard library, the tar reader
 * beside this file. No git, no system tar, no runtime dependency, no prompt.
 *
 * ONE FUNCTION IS THE WHOLE INTERFACE. `run` takes everything it would
 * otherwise reach for — arguments, environment, working directory, the two
 * streams, the Node version, where the tarball comes from, what installs the
 * dependencies — and returns the exit code. The bin hands it the real process;
 * a test hands it a temporary folder, a tarball built in memory and an install
 * that only records the call, and reads back what a user would see.
 *
 * Once the files are written it installs their dependencies with the package
 * manager that called it, and ends by saying what to type next in that
 * package manager's own words.
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { gunzipSync } from 'node:zlib'

import { readTar } from './tar.mjs'

const NAME = 'create-uno-blueprint'

/** This package's version, which is the template's: the version guard holds the two together. */
const VERSION = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version

/** The oldest Node the template runs on. The root manifest's `engines` states the same floor. */
const NODE_FLOOR = 22

const DEFAULT_DIRECTORY = 'uno-blueprint'

/**
 * Where this package sits in the template, which is the one folder a
 * workspace does not get: it has already done its work by the time the
 * workspace exists.
 */
const OWN_FOLDER = ['packages', 'create-uno-blueprint']

const USAGE = `Usage: ${NAME} [directory] [options]

Writes an Uno Blueprint workspace, the template at release ${VERSION}, into
[directory], and installs its dependencies with the package manager that ran
this command. The folder must be empty or not exist yet. Default: ${DEFAULT_DIRECTORY}

Options:
  --no-install   write the workspace and leave its dependencies uninstalled
  --help         show this message
  --version      show the version
`

/** The tarball GitHub serves for this version's release tag. */
const RELEASE_URL = `https://codeload.github.com/BilLogic/uno-blueprint/tar.gz/refs/tags/v${VERSION}`

/**
 * Two bounds on what comes back from the network, because nothing here has
 * seen it before. A connection that stalls would otherwise be a command that
 * never ends, and a few kilobytes of gzip can unpack to more than a machine
 * holds. The template is about a tenth of the second; both are far enough out
 * that neither is met by a release.
 */
const DOWNLOAD_TIMEOUT_MS = 60_000
const UNPACKED_LIMIT_MB = 128

/** Download a tarball with the platform fetch. Throws on anything but a 2xx, and on the timeout. */
async function fetchRelease(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return new Uint8Array(await response.arrayBuffer())
}

/**
 * The package managers a workspace installs and runs under, each with the
 * two lines a user types: the install, and the one that starts the canvas.
 * `npm` is the one that needs `run`; the other three take a script's name as
 * a command of their own.
 */
const PACKAGE_MANAGERS = {
  npm: { install: 'npm install', dev: 'npm run dev' },
  pnpm: { install: 'pnpm install', dev: 'pnpm dev' },
  yarn: { install: 'yarn install', dev: 'yarn dev' },
  bun: { install: 'bun install', dev: 'bun dev' },
}

/**
 * Which package manager called. `npm create`, `pnpm create`, `yarn create`
 * and `bun create` each put their name and version first in
 * `npm_config_user_agent`, as `pnpm/10.1.0 npm/? node/v22.12.0 …`. Only that
 * first word is read: the three that are not npm name npm further along, to
 * say what they stand in for. Run by hand, or by anything else, it is npm.
 */
function callingPackageManager(env) {
  const name = String(env?.npm_config_user_agent ?? '').trim().split('/')[0]
  return Object.hasOwn(PACKAGE_MANAGERS, name) ? name : 'npm'
}

/**
 * Install a workspace's dependencies by running the package manager there,
 * with its output going straight to the terminal the command was run in.
 * Resolves with its exit code; rejects when it could not be started at all.
 */
function installWith({ pm, cwd }) {
  return new Promise((resolveCode, reject) => {
    // On Windows a package manager is a `.cmd` shim, which only a shell runs.
    // Both arguments are fixed words, so there is nothing for a shell to read.
    const child = spawn(pm, ['install'], { cwd, stdio: 'inherit', shell: process.platform === 'win32' })
    child.on('error', reject)
    // No code means a signal ended it, which is not an install that finished.
    child.on('close', (code) => resolveCode(code ?? 1))
  })
}

/**
 * Write a workspace and install it, or say in one line why not.
 *
 * @param {object} options
 * @param {string[]} options.argv  the arguments after the command's own name
 * @param {Record<string, string | undefined>} options.env
 * @param {string} options.cwd  what a relative directory is resolved against
 * @param {{ write(text: string): unknown }} options.stdout
 * @param {{ write(text: string): unknown }} options.stderr
 * @param {string} options.nodeVersion  `process.versions.node`
 * @param {(url: string) => Promise<Uint8Array>} [options.fetchTarball]  the gzipped tarball at a URL
 * @param {(request: { pm: 'npm' | 'pnpm' | 'yarn' | 'bun', cwd: string }) => number | Promise<number>} [options.install]
 *   installs the dependencies of the workspace at `cwd` with `pm`, and answers with its exit code
 * @returns {Promise<number>} the exit code: 0 only when the workspace is complete
 */
export async function run({
  argv,
  env,
  cwd,
  stdout,
  stderr,
  nodeVersion,
  fetchTarball = fetchRelease,
  install = installWith,
}) {
  const fail = (message) => {
    stderr.write(`${NAME}: ${message}\n`)
    return 1
  }

  // First, before the arguments are even read: every later line assumes it.
  // Written as "not at least" so a version that cannot be read is refused
  // rather than compared with nothing and let through.
  if (!(parseInt(String(nodeVersion).replace(/^v/, ''), 10) >= NODE_FLOOR)) {
    return fail(`Node ${NODE_FLOOR} or later is needed; this is Node ${nodeVersion}.`)
  }

  const asked = parseArguments(argv)
  if (asked.fault) return fail(`${asked.fault} Run with --help to see what it takes.`)
  if (asked.help) {
    stdout.write(USAGE)
    return 0
  }
  if (asked.version) {
    stdout.write(`${VERSION}\n`)
    return 0
  }

  const directory = asked.directory ?? DEFAULT_DIRECTORY
  const target = resolve(cwd, directory)
  /** Whether the workspace is the folder the command was run in, which changes how it is spoken of. */
  const here = target === resolve(cwd)
  try {
    const existed = existsSync(target)
    if (existed && !statSync(target).isDirectory()) {
      return fail(`${directory} exists and is not a folder.`)
    }
    if (existed && readdirSync(target).length > 0) {
      return fail(
        `${here ? 'this folder' : directory} already has files in it. Name an empty folder, or one that does not exist yet.`,
      )
    }
  } catch (error) {
    return fail(`could not read ${directory} (${reason(error)}).`)
  }

  const url = RELEASE_URL
  let tarball
  try {
    tarball = await fetchTarball(url)
  } catch (error) {
    return fail(`could not download the template from ${url} (${reason(error)}).`)
  }

  // The whole archive is read and every path judged before the first byte is
  // written, so a tarball that is refused leaves nothing behind.
  let entries
  try {
    entries = workspaceEntries(
      readTar(gunzipSync(tarball, { maxOutputLength: UNPACKED_LIMIT_MB * 1024 * 1024 })),
    )
  } catch (error) {
    const why =
      error?.code === 'ERR_BUFFER_TOO_LARGE'
        ? `it unpacks to more than ${UNPACKED_LIMIT_MB} MB`
        : reason(error)
    return fail(`the template downloaded from ${url} could not be unpacked (${why}).`)
  }

  // The highest folder this run will have made: the target, or the first of
  // its parents that is not there yet. It is what a failed write takes back.
  let made = null
  for (let path = target; !existsSync(path); path = dirname(path)) made = path

  try {
    for (const { segments, kind, mode, data } of entries) {
      const path = join(target, ...segments)
      if (kind === 'directory') {
        mkdirSync(path, { recursive: true })
        continue
      }
      mkdirSync(dirname(path), { recursive: true })
      // Git records one thing about a file's mode — whether it can be run —
      // so that is the one thing carried over; the umask decides the rest.
      writeFileSync(path, data, { mode: mode & 0o111 ? 0o755 : 0o644 })
    }
  } catch (error) {
    // The folder was empty or absent a moment ago, so all that is in it now
    // is half a workspace, and leaving it would make the next run refuse.
    // What goes is what this run made and nothing else: the folders it had to
    // create on the way down, or, in a folder that was already there, what it
    // put inside. Taking it back can fail for the reason the write did; the
    // write's failure is the one worth reporting.
    try {
      if (made !== null) {
        rmSync(made, { recursive: true, force: true })
      } else {
        for (const name of readdirSync(target)) rmSync(join(target, name), { recursive: true, force: true })
      }
    } catch {
      // Nothing to add: the line below already says the workspace is not there.
    }
    return fail(`could not write the workspace to ${directory} (${reason(error)}).`)
  }

  const pm = callingPackageManager(env)
  const commands = PACKAGE_MANAGERS[pm]
  const where = here ? 'this folder' : directory
  stdout.write(`Uno Blueprint ${VERSION} is in ${where}.`)

  if (asked.install) {
    // Said before the install rather than after, so the wait that follows has
    // a reason on screen and the package manager's own output has a heading.
    stdout.write(` Installing its dependencies with ${pm}.\n\n`)
    // A package manager that exits non-zero and one that could not be
    // started are the same failure here. Either way the files stay: they are
    // a whole workspace, and what is left to do in it is the line this names.
    let why = null
    try {
      const code = await install({ pm, cwd: target })
      if (code !== 0) why = `exit code ${code}`
    } catch (error) {
      why = reason(error)
    }
    if (why !== null) {
      return fail(
        `the workspace is in ${where}, but ${commands.install} failed there (${why}). Run it in that folder to finish.`,
      )
    }
  } else {
    stdout.write('\n')
  }

  // The install is a next step only when it was not done here.
  const steps = [
    ...(here ? [] : [`cd ${directory}`]),
    ...(asked.install ? [] : [commands.install]),
    commands.dev,
  ]
  stdout.write(`\nNext steps:\n\n${steps.map((step) => `  ${step}\n`).join('')}`)
  return 0
}

/**
 * What the arguments ask for: at most one directory, and the three flags.
 * `-h` and `-v` are the short forms a person tries first.
 */
function parseArguments(argv) {
  const asked = { directory: undefined, install: true, help: false, version: false, fault: undefined }
  for (const argument of argv) {
    if (argument === '--help' || argument === '-h') asked.help = true
    else if (argument === '--version' || argument === '-v') asked.version = true
    else if (argument === '--no-install') asked.install = false
    // An empty argument is what a script passes when its variable was unset.
    else if (argument === '') continue
    else if (argument.startsWith('-')) asked.fault ??= `unknown option ${argument}.`
    else if (asked.directory !== undefined) asked.fault ??= `one directory at a time: got ${asked.directory} and ${argument}.`
    else asked.directory = argument
  }
  return asked
}

/**
 * The archive's entries as a workspace takes them: the wrapping top-level
 * folder dropped, the initialiser's own folder left out, and every path
 * proven to stay inside the target. Throws on the first entry that does not.
 */
function workspaceEntries(archive) {
  const entries = []
  for (const { path, kind, mode, data } of archive) {
    const segments = segmentsInsideTop(path)
    if (segments.length === 0 || isAtOrBelow(segments, OWN_FOLDER)) continue
    // A link can point anywhere, and a template has no use for one.
    if (kind === 'other') throw new Error(`${path} is neither a file nor a folder`)
    entries.push({ segments, kind, mode, data })
  }
  // A folder that held nothing but the initialiser is not written either: an
  // empty `packages/` in a workspace would be a question with no answer.
  return entries.filter(
    ({ segments, kind }) =>
      kind !== 'directory' ||
      !isAtOrBelow(OWN_FOLDER, segments) ||
      entries.some((other) => other.kind === 'file' && isAtOrBelow(other.segments, segments)),
  )
}

/**
 * An archive path as segments below its top-level folder, or a throw.
 *
 * A release tarball wraps the tree in one folder named after the tag, and
 * that segment is dropped. What is left has to be a plain way down: an
 * absolute path, a `..`, or a backslash — which Windows reads as a separator —
 * is a tarball that is not the template, and none of it is written.
 */
function segmentsInsideTop(path) {
  const segments = path.split('/').filter((segment) => segment !== '' && segment !== '.')
  if (path.startsWith('/') || segments.some((segment) => segment === '..' || segment.includes('\\'))) {
    throw new Error(`${path} reaches outside the folder`)
  }
  return segments.slice(1)
}

/** Whether `path` is `folder` or somewhere beneath it, both as segments. */
function isAtOrBelow(path, folder) {
  return folder.every((segment, index) => path[index] === segment)
}

/** Why something failed, on one line. A failed fetch keeps its cause one level down, so that is read too. */
function reason(error) {
  const messages = [error?.message, error?.cause?.message].filter(Boolean)
  return (messages.join(': ') || String(error)).replace(/\s+/g, ' ')
}
