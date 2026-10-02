/**
 * The initialiser, called the way its bin calls it and read the way a user
 * reads it: the files that landed, the text that was printed, the exit code.
 *
 * Every case hands `run` a release tarball built here, in memory, and a
 * throwaway folder to write into. Nothing reaches the network.
 *
 * Run: npm test
 */
import { afterEach, beforeEach, test } from 'vitest'
import assert from 'node:assert/strict'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

import { INITIALISER_MANIFEST, versions } from '../../../scripts/check-version-agreement.mjs'
import { run } from '../src/run.mjs'

const REPO_ROOT = fileURLToPath(new URL('../../..', import.meta.url))

/**
 * Where this package really sits in the template, read off the disk rather
 * than written down again — so the fixture below puts the initialiser where a
 * release tarball has it, and a move that `run` did not follow fails here.
 */
const OWN_FOLDER = relative(REPO_ROOT, fileURLToPath(new URL('..', import.meta.url)))
  .split(sep)
  .filter(Boolean)
  .join('/')

const VERSION = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
).version

/** Where the release for this version is downloaded from. */
const RELEASE_URL = `https://codeload.github.com/BilLogic/uno-blueprint/tar.gz/refs/tags/v${VERSION}`

/** The folder a release tarball wraps everything in: the repository name, then the tag without its `v`. */
const TOP = `uno-blueprint-${VERSION}`

/** A path too long for the header's name field, and with a last segment too long to split across its prefix. */
const LONG_NAME = `docs/${'a-very-long-folder-name/'.repeat(8)}${'n'.repeat(120)}.md`

/** One 512-byte ustar header. `name` is written as given, so a case can hand it a path no archiver would. */
function header({ name, size = 0, type = '0', mode = 0o644, prefix = '' }) {
  const block = Buffer.alloc(512)
  block.write(name, 0, 100, 'utf8')
  block.write(mode.toString(8).padStart(7, '0'), 100, 8, 'ascii')
  block.write('0000000', 108, 8, 'ascii')
  block.write('0000000', 116, 8, 'ascii')
  block.write(size.toString(8).padStart(11, '0'), 124, 12, 'ascii')
  block.write('00000000000', 136, 12, 'ascii')
  block.fill(' ', 148, 156)
  block.write(type, 156, 1, 'ascii')
  block.write('ustar\x0000', 257, 8, 'binary')
  block.write(prefix, 345, 155, 'utf8')
  const sum = block.reduce((total, byte) => total + byte, 0)
  block.write(`${sum.toString(8).padStart(6, '0')}\0 `, 148, 8, 'binary')
  return block
}

/** A header and its data, padded to the block. */
function member(fields, data = '') {
  const body = Buffer.from(data)
  const padding = Buffer.alloc((512 - (body.length % 512)) % 512)
  return Buffer.concat([header({ ...fields, size: body.length }), body, padding])
}

/** One pax record: its own length, a space, `key=value`, a newline. */
function paxRecord(key, value) {
  const rest = ` ${key}=${value}\n`
  let length = Buffer.byteLength(rest)
  while (Buffer.byteLength(`${length}${rest}`) !== length) length += 1
  return `${length}${rest}`
}

/**
 * A gzipped tar holding `entries`, shaped as a release tarball is: a pax
 * global header first, then every path under the one top-level folder. A path
 * past 100 bytes travels in a pax header ahead of its entry, unless the case
 * splits it across the header's prefix field itself. `raw` writes the path as
 * given, outside the top-level folder if it says so.
 */
function tarball(entries) {
  const blocks = [member({ name: 'pax_global_header', type: 'g' }, paxRecord('comment', 'f'.repeat(40)))]
  for (const { path, data = '', type = '0', mode, raw = false, prefix } of entries) {
    const full = raw ? path : `${TOP}/${path}`
    const fields = { type, mode: mode ?? (type === '5' ? 0o755 : 0o644) }
    if (prefix !== undefined) {
      blocks.push(member({ ...fields, name: path, prefix: `${TOP}/${prefix}` }, data))
    } else if (Buffer.byteLength(full) > 100) {
      blocks.push(member({ name: 'pax-header', type: 'x' }, paxRecord('path', full)))
      blocks.push(member({ ...fields, name: full.slice(0, 100) }, data))
    } else {
      blocks.push(member({ ...fields, name: full }, data))
    }
  }
  blocks.push(Buffer.alloc(1024))
  return gzipSync(Buffer.concat(blocks))
}

/** A small template: a manifest, a script that must stay executable, a nested folder, the initialiser's own folder. */
const TEMPLATE = [
  { path: '', type: '5' },
  { path: 'package.json', data: '{ "name": "uno-blueprint" }\n' },
  { path: 'scripts/', type: '5' },
  { path: 'scripts/run.sh', data: '#!/bin/sh\n', mode: 0o755 },
  { path: 'src/', type: '5' },
  { path: 'src/components/', type: '5' },
  { path: 'src/components/Canvas.tsx', data: 'export {}\n' },
  { path: 'packages/', type: '5' },
  { path: `${OWN_FOLDER}/`, type: '5' },
  { path: `${OWN_FOLDER}/package.json`, data: '{}\n' },
  { path: `${OWN_FOLDER}/src/run.mjs`, data: '\n' },
]

let cwd

beforeEach(() => {
  cwd = mkdtempSync(join(tmpdir(), 'create-uno-blueprint-'))
})

afterEach(() => {
  rmSync(cwd, { recursive: true, force: true })
})

/** Run the initialiser in the throwaway folder and hand back everything a user would see. */
async function create(argv, { entries = TEMPLATE, fetchTarball, ...rest } = {}) {
  const out = []
  const err = []
  const asked = []
  const code = await run({
    argv,
    env: {},
    cwd,
    stdout: { write: (text) => out.push(text) },
    stderr: { write: (text) => err.push(text) },
    nodeVersion: '22.12.0',
    fetchTarball: async (url) => {
      asked.push(url)
      return fetchTarball ? fetchTarball(url) : tarball(entries)
    },
    ...rest,
  })
  return { code, out: out.join(''), err: err.join(''), asked }
}

/** One line, and only one, on stderr. */
function oneLine(err) {
  assert.match(err, /^create-uno-blueprint: [^\n]+\n$/)
}

test('a named folder receives the template at the release matching this version', async () => {
  const { code, out, err, asked } = await create(['my-blueprint'])

  assert.equal(code, 0)
  assert.equal(err, '')
  assert.deepEqual(asked, [RELEASE_URL])
  assert.equal(
    readFileSync(join(cwd, 'my-blueprint/package.json'), 'utf8'),
    '{ "name": "uno-blueprint" }\n',
  )
  assert.equal(
    readFileSync(join(cwd, 'my-blueprint/src/components/Canvas.tsx'), 'utf8'),
    'export {}\n',
  )
  // The wrapping folder is the tarball's, not the workspace's.
  assert.equal(existsSync(join(cwd, 'my-blueprint', TOP)), false)
  assert.ok(out.includes(`Uno Blueprint ${VERSION}`))
  assert.match(out, /\n {2}cd my-blueprint\n {2}npm install\n {2}npm run dev\n/)
})

test('with no folder named, the workspace lands in uno-blueprint', async () => {
  const { code, out } = await create([])

  assert.equal(code, 0)
  assert.equal(existsSync(join(cwd, 'uno-blueprint/package.json')), true)
  assert.match(out, /\n {2}cd uno-blueprint\n/)
})

test('an empty folder that already exists is a fine place to write', async () => {
  mkdirSync(join(cwd, 'empty'))

  const { code } = await create(['empty'])

  assert.equal(code, 0)
  assert.equal(existsSync(join(cwd, 'empty/package.json')), true)
})

test('a folder that already has files is refused in one line, untouched', async () => {
  mkdirSync(join(cwd, 'mine'))
  writeFileSync(join(cwd, 'mine/notes.txt'), 'keep me\n')

  const { code, out, err, asked } = await create(['mine'])

  assert.equal(code, 1)
  assert.equal(out, '')
  oneLine(err)
  assert.match(err, /mine already has files in it/)
  assert.deepEqual(asked, [])
  assert.deepEqual(readdirSync(join(cwd, 'mine')), ['notes.txt'])
})

test('a Node below 22 is refused before anything else, naming the version needed', async () => {
  const { code, out, err, asked } = await create(['--help'], { nodeVersion: '20.11.1' })

  assert.equal(code, 1)
  assert.equal(out, '')
  oneLine(err)
  assert.match(err, /Node 22/)
  assert.match(err, /20\.11\.1/)
  assert.deepEqual(asked, [])
})

test('a failed download is reported in one line naming where it tried', async () => {
  const { code, out, err } = await create(['my-blueprint'], {
    fetchTarball: async () => {
      throw new Error('getaddrinfo ENOTFOUND codeload.github.com')
    },
  })

  assert.equal(code, 1)
  assert.equal(out, '')
  oneLine(err)
  assert.ok(err.includes(RELEASE_URL))
  assert.match(err, /ENOTFOUND/)
  assert.equal(existsSync(join(cwd, 'my-blueprint')), false)
})

test('--help prints the interface and writes nothing', async () => {
  const { code, out, err, asked } = await create(['--help'])

  assert.equal(code, 0)
  assert.equal(err, '')
  assert.ok(out.includes('create-uno-blueprint [directory]'))
  for (const flag of ['--no-install', '--help', '--version']) assert.ok(out.includes(flag), flag)
  assert.deepEqual(asked, [])
  assert.deepEqual(readdirSync(cwd), [])
})

test('--version prints this version and writes nothing', async () => {
  const { code, out, asked } = await create(['--version'])

  assert.equal(code, 0)
  assert.equal(out, `${VERSION}\n`)
  assert.deepEqual(asked, [])
  assert.deepEqual(readdirSync(cwd), [])
})

test('--no-install is accepted, on either side of the folder', async () => {
  const before = await create(['--no-install', 'one'])
  const after = await create(['two', '--no-install'])

  assert.equal(before.code, 0)
  assert.equal(after.code, 0)
  assert.equal(existsSync(join(cwd, 'one/package.json')), true)
  assert.equal(existsSync(join(cwd, 'two/package.json')), true)
})

test('an option it does not know is refused in one line', async () => {
  const { code, err, asked } = await create(['my-blueprint', '--template=other'])

  assert.equal(code, 1)
  oneLine(err)
  assert.ok(err.includes('--template=other'))
  assert.deepEqual(asked, [])
})

test('the workspace does not carry the initialiser', async () => {
  const { code } = await create(['my-blueprint'])

  assert.equal(code, 0)
  // Its folder is gone, and so is the parent that held nothing else.
  assert.deepEqual(readdirSync(join(cwd, 'my-blueprint')).sort(), ['package.json', 'scripts', 'src'])
})

test('a folder beside the initialiser is kept', async () => {
  const { code } = await create(['my-blueprint'], {
    entries: [...TEMPLATE, { path: 'packages/other/index.mjs', data: '\n' }],
  })

  assert.equal(code, 0)
  assert.deepEqual(readdirSync(join(cwd, 'my-blueprint/packages')), ['other'])
})

test.skipIf(process.platform === 'win32')('a file that was executable stays executable', async () => {
  await create(['my-blueprint'])

  assert.notEqual(statSync(join(cwd, 'my-blueprint/scripts/run.sh')).mode & 0o100, 0)
  assert.equal(statSync(join(cwd, 'my-blueprint/package.json')).mode & 0o100, 0)
})

test('a name too long for the header arrives whole, by either road an archiver takes', async () => {
  const split = {
    prefix: 'docs/a-folder-deep-enough-to-push-the-whole-path-past-one-hundred-bytes/and-then-some',
    path: 'a-file-with-a-name.md',
  }
  const { code } = await create(['my-blueprint'], {
    entries: [...TEMPLATE, { path: LONG_NAME, data: 'long\n' }, { ...split, data: 'split\n' }],
  })

  assert.equal(code, 0)
  assert.equal(readFileSync(join(cwd, 'my-blueprint', LONG_NAME), 'utf8'), 'long\n')
  assert.equal(readFileSync(join(cwd, 'my-blueprint', split.prefix, split.path), 'utf8'), 'split\n')
})

test('a tarball that reaches outside the folder is refused and nothing is written', async () => {
  for (const path of [`${TOP}/../escaped.txt`, `${TOP}/src/../../escaped.txt`, '/escaped.txt']) {
    const { code, out, err } = await create(['my-blueprint'], {
      entries: [...TEMPLATE, { path, raw: true, data: 'out\n' }],
    })

    assert.equal(code, 1, path)
    assert.equal(out, '')
    oneLine(err)
    assert.match(err, /could not be unpacked/)
    assert.equal(existsSync(join(cwd, 'escaped.txt')), false)
    assert.equal(existsSync(join(cwd, 'my-blueprint')), false)
  }
})

test('a download that is not a tarball is reported, not thrown', async () => {
  const { code, err } = await create(['my-blueprint'], {
    fetchTarball: async () => Buffer.from('<html>rate limited</html>'),
  })

  assert.equal(code, 1)
  oneLine(err)
  assert.match(err, /could not be unpacked/)
  assert.equal(existsSync(join(cwd, 'my-blueprint')), false)
})

test('a folder that cannot be written is reported in one line, with nothing left half-made', async () => {
  writeFileSync(join(cwd, 'a-file'), '')

  const { code, out, err } = await create(['a-file/inside'])

  assert.equal(code, 1)
  assert.equal(out, '')
  oneLine(err)
  assert.match(err, /could not write the workspace to a-file\/inside/)
})

test('a name that is a file is refused before anything is downloaded', async () => {
  writeFileSync(join(cwd, 'a-file'), '')

  const { code, err, asked } = await create(['a-file'])

  assert.equal(code, 1)
  oneLine(err)
  assert.deepEqual(asked, [])
})

test('the version guard holds this package to the template', () => {
  // The guard skips a manifest that is not there, because a workspace has
  // none. This test travels with the package, so wherever the package is,
  // the guard is looking at it.
  assert.equal(INITIALISER_MANIFEST, `${OWN_FOLDER}/package.json`)
  assert.equal(versions(REPO_ROOT)[INITIALISER_MANIFEST], VERSION)
})
