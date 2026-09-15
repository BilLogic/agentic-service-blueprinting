/**
 * A DATABASE NOBODY NAMED IS UNVERIFIED; ONE THAT WAS NAMED AND NOT REACHED IS
 * A FINDING.
 *
 * Two checks in this repository need a live database, and each used to answer
 * "there is no database" in its own words and with its own exit code: the
 * target-schema check printed `no target configured` and exited 2, a code the
 * verdict module has no register for; the identifiers sweep went red with
 * `could not sweep a database` whether or not anybody had named one. One rule
 * now covers both, and this file is where it is proven — three cases per
 * check, none of them needing a live database.
 *
 * WHY THESE RUN AS COMMANDS rather than by calling `judge()`. What changed is
 * the EXIT CODE, and an exit code is the one thing a judgement does not carry:
 * `verdict.mjs` decides it, and a test that read the judgement object would
 * pass on a check that had been wired to the wrong outcome. So each case is a
 * process, and what is asserted is the code, the stream the words landed on,
 * and the words.
 *
 * WHAT STANDS IN FOR POSTGRES is a `psql` on PATH that is a shell script: it
 * fails for the unreachable case and answers for the reachable one. The point
 * is not to simulate a catalogue — `--self-test` against a real database is
 * what proves the query — but to hold the three OUTCOMES apart on a machine
 * with no server at all, which is the machine this rule was written for.
 *
 * Run: npm test
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { supportedVersions } from '../check-target-schema.mjs'
import { RETIRED_IDENTIFIER_FRAGMENTS } from '../retired-vocabulary.mjs'

// Resolved as a PATH rather than a URL's `.pathname`, which is percent-encoded
// and so wrong under any directory with a space in its name — the same trap
// `verdict.mjs` refuses in `isTheCommand`.
const ROOT = fileURLToPath(new URL('../..', import.meta.url))

/**
 * One check, run as the command a person runs.
 *
 * `cwd` matters for the target-schema check, which reads a `.env` beside the
 * working directory — a temporary directory is how "nothing is configured"
 * gets asserted on a machine whose checkout has one.
 *
 * ASYNCHRONOUS, and that is not a style choice. `spawnSync` blocks the event
 * loop of the process that calls it, so the reachable case below — where this
 * test is also the server the check fetches — deadlocked: the listener could
 * not accept a connection until the child it was waiting on had finished
 * making it. It sat there for the five minutes undici waits before giving up.
 */
function run(script, args, { cwd = ROOT, env = {} } = {}) {
  const merged = { ...process.env, ...env }
  for (const [name, value] of Object.entries(env)) if (value === undefined) delete merged[name]
  // The unverified register appends to this file when it is set, and under a
  // workflow runner it is set: a test must not write to the run's own summary.
  delete merged.GITHUB_STEP_SUMMARY
  const child = spawn(process.execPath, [join(ROOT, 'scripts', script), ...args], {
    cwd,
    env: merged,
  })
  let out = ''
  let err = ''
  child.stdout.setEncoding('utf8').on('data', (text) => (out += text))
  child.stderr.setEncoding('utf8').on('data', (text) => (err += text))
  return new Promise((done, fail) => {
    child.on('error', fail)
    child.on('close', (code) => done({ code, out, err }))
  })
}

/** A directory with a `psql` in it that runs `body`, for the front of PATH. */
function psqlOnPath(body) {
  const dir = mkdtempSync(join(tmpdir(), 'scratch-bin-'))
  const path = join(dir, 'psql')
  writeFileSync(path, `#!/bin/sh\n${body}\n`)
  chmodSync(path, 0o755)
  return dir
}

/**
 * Every piece of a connection libpq would read, unset. Clearing PGDATABASE
 * alone is not "nobody named a database": PGHOST on its own points the check
 * at a server, and on a developer's machine it often is set.
 */
const NOTHING_NAMED = {
  PGDATABASE: undefined,
  PGHOST: undefined,
  PGUSER: undefined,
  PGPORT: undefined,
  PGSERVICE: undefined,
}

/** A `psql` that cannot connect, the way a named-but-absent server answers. */
const UNREACHABLE = `echo 'psql: error: connection to server at "127.0.0.1", port 1 failed: Connection refused' >&2
exit 2`

/**
 * A `psql` that answers: no rows for the sweep, a relation count for the
 * census. The two are told apart by the SQL, which is the last argument.
 */
const REACHABLE = `for a in "$@"; do last="$a"; done
case "$last" in
  *"count(*)"*) echo 7 ;;
esac
exit 0`

/**
 * A `psql` that answers the self-test: the command tags psql echoes per
 * statement, with the planted row among them. The script arrives on stdin, so
 * it is read and discarded rather than left to break the pipe.
 */
const PLANTS = `cat > /dev/null
printf 'BEGIN\\nCREATE TABLE\\ntable\\tzz_selftest_layer_table\\tlayer\\t\\nROLLBACK\\n'
exit 0`

// ── the catalogue sweep ────────────────────────────────────────────────────

test('a catalogue nobody named is unverified, and the run stays clean', async () => {
  // The `psql` on PATH fails loudly, so a check that reached for a database it
  // was never given would come back red rather than quietly right.
  const { code, out, err } = await run('check-retired-identifiers.mjs', [], {
    env: { ...NOTHING_NAMED, PATH: `${psqlOnPath(UNREACHABLE)}:${process.env.PATH}` },
  })
  assert.equal(code, 0, `expected a clean exit, got ${code}: ${err}`)
  assert.match(err, /^::warning::unverified — a retired word swept across the database catalogue\./)
  assert.match(err, /no database was named/)
  assert.doesNotMatch(err, /could not sweep a database/)
  assert.equal(out, '')
})

test('a catalogue that was named and could not be reached is a finding, error quoted', async () => {
  const { code, err } = await run('check-retired-identifiers.mjs', ['--database', 'scratch_absent'], {
    env: { PATH: `${psqlOnPath(UNREACHABLE)}:${process.env.PATH}` },
  })
  assert.equal(code, 1, 'a database that should have been there and was not is red')
  assert.match(err, /could not sweep a database/)
  // The connection error itself, not a paraphrase of it.
  assert.match(err, /Connection refused/)
  assert.doesNotMatch(err, /::warning::unverified/)
})

test('a catalogue that answers is swept, and says how much it swept', async () => {
  const { code, out, err } = await run('check-retired-identifiers.mjs', ['--database', 'scratch_fake'], {
    env: { PATH: `${psqlOnPath(REACHABLE)}:${process.env.PATH}` },
  })
  assert.equal(code, 0, err)
  assert.equal(
    out,
    'ok — no retired vocabulary in any database identifier ' +
      `(${RETIRED_IDENTIFIER_FRAGMENTS.length} fragments swept across the catalogue)\n`,
  )
  assert.equal(err, '')
})

test('a server named by PGHOST alone is named, and its failure is a finding', async () => {
  // The command at the top of the check's own usage block takes no arguments
  // and reads the connection out of the environment. Treating that run as
  // "nobody named a database" would retire it.
  const { code, err } = await run('check-retired-identifiers.mjs', [], {
    env: { ...NOTHING_NAMED, PGHOST: '127.0.0.1', PATH: `${psqlOnPath(UNREACHABLE)}:${process.env.PATH}` },
  })
  assert.equal(code, 1, 'PGHOST points the check at a server, so a failure to reach it is red')
  assert.match(err, /could not sweep a database/)
  assert.doesNotMatch(err, /::warning::unverified/)
})

test('--database with no value is a usage finding, not a run nobody asked for', async () => {
  const { code, err } = await run('check-retired-identifiers.mjs', ['--database'], {
    env: { ...NOTHING_NAMED, PATH: `${psqlOnPath(UNREACHABLE)}:${process.env.PATH}` },
  })
  assert.equal(code, 1, 'somebody who meant to name a database is not somebody who named none')
  assert.match(err, /--database was given no value/)
  assert.doesNotMatch(err, /::warning::unverified/)
})

test('--self-test obeys the same rule, and names what IT measures', async () => {
  const nothing = await run('check-retired-identifiers.mjs', ['--self-test'], {
    env: { ...NOTHING_NAMED, PATH: `${psqlOnPath(UNREACHABLE)}:${process.env.PATH}` },
  })
  assert.equal(nothing.code, 0)
  // The planted object, not the sweep: a skip that named the sweep would be
  // describing a run nobody asked for.
  assert.match(nothing.err, /^::warning::unverified — a planted object the sweep must report\./)

  const named = await run('check-retired-identifiers.mjs', ['--self-test', '--database', 'scratch_fake'], {
    env: { PATH: `${psqlOnPath(PLANTS)}:${process.env.PATH}` },
  })
  assert.equal(named.code, 0, named.err)
  assert.equal(
    named.out,
    'ok — self-test: the sweep reported 1 planted object(s), then rolled back\n',
  )
})

// ── the target schema ──────────────────────────────────────────────────────

test('a target nobody named is unverified, and the run stays clean', async () => {
  // A directory of its own, because the check reads `.env` beside the working
  // directory and this repository's own checkout may have one.
  const { code, out, err } = await run('check-target-schema.mjs', [], {
    cwd: mkdtempSync(join(tmpdir(), 'scratch-env-')),
    env: { VITE_SUPABASE_URL: undefined, VITE_SUPABASE_ANON_KEY: undefined },
  })
  assert.equal(code, 0, `expected a clean exit, got ${code}: ${err}`)
  assert.match(err, /^::warning::unverified — the target database\./)
  assert.match(err, /no target configured/)
  assert.equal(out, '')
})

test('a target that was named and could not be reached is a finding, error quoted', async () => {
  // Port 1 is a port nothing serves; the check quotes whatever fetch says of
  // it, which is the point — the reason travels rather than being flattened.
  const { code, err } = await run('check-target-schema.mjs', ['--url', 'http://127.0.0.1:1', '--key', 'k'], {
    cwd: mkdtempSync(join(tmpdir(), 'scratch-env-')),
  })
  assert.equal(code, 1, 'a target that was named and did not answer is red')
  assert.match(err, /could not reach http:\/\/127\.0\.0\.1:1: /)
  assert.doesNotMatch(err, /::warning::unverified/)
})

test('a target that answers prints the version it carries, and nothing else', async () => {
  const version = supportedVersions()[0]
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end(JSON.stringify([{ version }]))
  })
  await new Promise((done) => server.listen(0, '127.0.0.1', done))
  try {
    const { port } = server.address()
    const { code, out, err } = await run('check-target-schema.mjs', [
      '--url',
      `http://127.0.0.1:${port}`,
      '--key',
      'k',
    ])
    assert.equal(code, 0, err)
    // Byte for byte what it printed before the unconfigured branch moved.
    assert.equal(out, `the target carries schema_version ${version}\n`)
    assert.equal(err, '')
  } finally {
    await new Promise((done) => server.close(done))
  }
})
