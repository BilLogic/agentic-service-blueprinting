import { afterEach, describe, expect, it } from 'vitest'
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const ROOT = resolve(new URL('../..', import.meta.url).pathname)
const SCRIPT = resolve(ROOT, 'scripts/tests/resource-split-migration.test.sh')
const temporaryDirectories = []

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

describe('resource-split migration guard diagnostics', () => {
  it('names the failing script line and focused rerun when setup fails', () => {
    const bin = mkdtempSync(resolve(tmpdir(), 'resource-split-guard-'))
    temporaryDirectories.push(bin)
    const createdb = resolve(bin, 'createdb')
    writeFileSync(createdb, '#!/usr/bin/env bash\nexit 23\n')
    chmodSync(createdb, 0o755)

    const result = spawnSync('bash', [SCRIPT, 'forced_setup_failure'], {
      encoding: 'utf8',
      env: { ...process.env, PATH: `${bin}${delimiter}${process.env.PATH}` },
    })

    expect(result.status).toBe(23)
    expect(result.stderr).toMatch(
      /scripts\/tests\/resource-split-migration\.test\.sh:\d+: migration replay command failed/,
    )
    expect(result.stderr).toContain(
      'Run: bash scripts/tests/resource-split-migration.test.sh',
    )
  })
})
