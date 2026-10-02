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
 * streams, the Node version, where the tarball comes from — and returns the
 * exit code. The bin hands it the real process; a test hands it a temporary
 * folder and a tarball built in memory, and reads back what a user would see.
 *
 * It stops once the files are written and says what to type next. Installing
 * the workspace's dependencies is the user's next line, not a step here.
 */
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
[directory]. The folder must be empty or not exist yet. Default: ${DEFAULT_DIRECTORY}

Options:
  --no-install   leave dependencies uninstalled, which this version always does
  --help         show this message
  --version      show the version
`

/** The tarball GitHub serves for a release tag. */
export const releaseUrl = (version) =>
  `https://codeload.github.com/BilLogic/uno-blueprint/tar.gz/refs/tags/v${version}`

/** Download a tarball with the platform fetch. Throws on anything but a 2xx. */
async function fetchRelease(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return new Uint8Array(await response.arrayBuffer())
}

/**
 * Write a workspace, or say in one line why not.
 *
 * @param {object} options
 * @param {string[]} options.argv  the arguments after the command's own name
 * @param {Record<string, string | undefined>} options.env
 * @param {string} options.cwd  what a relative directory is resolved against
 * @param {{ write(text: string): unknown }} options.stdout
 * @param {{ write(text: string): unknown }} options.stderr
 * @param {string} options.nodeVersion  `process.versions.node`
 * @param {(url: string) => Promise<Uint8Array>} [options.fetchTarball]  the gzipped tarball at a URL
 * @returns {Promise<number>} the exit code: 0 only when the workspace is complete
 */
export async function run({ argv, env: _env, cwd, stdout, stderr, nodeVersion, fetchTarball = fetchRelease }) {
  // `env` is taken and not read yet: it is where the calling package manager
  // names itself, and nothing here depends on which one called.
  const fail = (message) => {
    stderr.write(`${NAME}: ${message}\n`)
    return 1
  }

  // First, before the arguments are even read: every later line assumes it.
  if (parseInt(nodeVersion.replace(/^v/, ''), 10) < NODE_FLOOR) {
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
  const existed = existsSync(target)
  if (existed && !statSync(target).isDirectory()) {
    return fail(`${directory} exists and is not a folder.`)
  }
  if (existed && readdirSync(target).length > 0) {
    return fail(`${directory} already has files in it. Name an empty folder, or one that does not exist yet.`)
  }

  const url = releaseUrl(VERSION)
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
    entries = workspaceEntries(readTar(gunzipSync(tarball)))
  } catch (error) {
    return fail(`the template downloaded from ${url} could not be unpacked (${reason(error)}).`)
  }

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
    // Taking it back can fail for the reason the write did; the write's
    // failure is the one worth reporting.
    try {
      if (existed) {
        for (const name of readdirSync(target)) rmSync(join(target, name), { recursive: true, force: true })
      } else {
        rmSync(target, { recursive: true, force: true })
      }
    } catch {
      // Nothing to add: the line below already says the workspace is not there.
    }
    return fail(`could not write the workspace to ${directory} (${reason(error)}).`)
  }

  const steps = [...(target === resolve(cwd) ? [] : [`cd ${directory}`]), 'npm install', 'npm run dev']
  stdout.write(
    `Uno Blueprint ${VERSION} is in ${directory}.\n\nNext steps:\n\n${steps.map((step) => `  ${step}\n`).join('')}`,
  )
  return 0
}

/**
 * What the arguments ask for: at most one directory, and the three flags.
 * `--no-install` is read and changes nothing, because nothing is installed.
 */
function parseArguments(argv) {
  const asked = { directory: undefined, help: false, version: false, fault: undefined }
  for (const argument of argv) {
    if (argument === '--help' || argument === '-h') asked.help = true
    else if (argument === '--version' || argument === '-v') asked.version = true
    else if (argument === '--no-install') continue
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
    if (segments.length === 0 || isUnder(OWN_FOLDER, segments)) continue
    // A link can point anywhere, and a template has no use for one.
    if (kind === 'other') throw new Error(`${path} is neither a file nor a folder`)
    entries.push({ segments, kind, mode, data })
  }
  // A folder that held nothing but the initialiser is not written either: an
  // empty `packages/` in a workspace would be a question with no answer.
  return entries.filter(
    ({ segments, kind }) =>
      kind !== 'directory' ||
      !isUnder(segments, OWN_FOLDER) ||
      entries.some((other) => other.kind === 'file' && isUnder(segments, other.segments)),
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

/** Whether `segments` is `folder` or somewhere beneath it. */
function isUnder(folder, segments) {
  return folder.every((segment, index) => segments[index] === segment)
}

/** Why something failed, on one line. A failed fetch keeps its cause one level down, so that is read too. */
function reason(error) {
  const messages = [error?.message, error?.cause?.message].filter(Boolean)
  return (messages.join(': ') || String(error)).replace(/\s+/g, ' ')
}
