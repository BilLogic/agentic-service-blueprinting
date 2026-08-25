/**
 * The compatibility check the adapter contract has always claimed to run.
 *
 * The case that matters is the mismatch message: it has to name the version
 * the target carries AND the versions this template speaks, because the reader
 * of that failure is deciding whether to apply a migration or check out a
 * different revision, and one number cannot tell them which.
 */
import { describe, expect, test } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createFixtureBackend } from './adapters/fixture'
import { runConformance } from './conformance'
import {
  SUPPORTED_SCHEMA_VERSIONS,
  SchemaVersionMismatch,
  TEMPLATE_SCHEMA_VERSION,
  assertSchemaCompatible,
  isSchemaVersionSupported,
} from './schemaVersion'

describe('schema version', () => {
  test('the version this checkout builds is one it speaks', () => {
    expect(isSchemaVersionSupported(TEMPLATE_SCHEMA_VERSION)).toBe(true)
    expect(SUPPORTED_SCHEMA_VERSIONS[0]).toBe(TEMPLATE_SCHEMA_VERSION)
  })

  test('the schema enum and this list are the same list', () => {
    // references/ir-schema.json is the one source: scripts/validate_ir.py reads
    // it to reject an unknown version by name, and a second copy of a version
    // list is a second thing to forget.
    const schema = JSON.parse(
      readFileSync(new URL('../../../references/ir-schema.json', import.meta.url), 'utf8'),
    )
    assert(Array.isArray(schema.properties.schema_version.enum))
    expect(schema.properties.schema_version.enum).toEqual([...SUPPORTED_SCHEMA_VERSIONS])
  })

  test('the migration seeds a version this checkout speaks', () => {
    // The bootstrap row and the bump both have to be versions the app knows,
    // or a fresh database is born incompatible with the code that built it.
    const sql = readFileSync(
      new URL('../../../supabase/migrations/', import.meta.url).pathname +
        '21000101000000_schema_version_is_a_table.sql',
      'utf8',
    )
    const seeded = /values \('([\d.]+)'\)/.exec(sql)?.[1]
    expect(seeded).toBeDefined()
    expect(isSchemaVersionSupported(seeded as string)).toBe(true)
  })

  test('an unknown version is rejected, and the message names both sides', () => {
    let error: unknown
    try {
      assertSchemaCompatible('2025.01.01')
    } catch (caught) {
      error = caught
    }
    expect(error).toBeInstanceOf(SchemaVersionMismatch)
    expect((error as Error).message).toContain('2025.01.01')
    expect((error as Error).message).toContain(TEMPLATE_SCHEMA_VERSION)
  })

  test('a conforming backend answers the question', async () => {
    const backend = createFixtureBackend()
    expect(await backend.schemaVersion()).toBe(TEMPLATE_SCHEMA_VERSION)
  })

  test('the conformance suite fails a backend on the wrong schema', async () => {
    const backend = createFixtureBackend()
    const stale = { ...backend, schemaVersion: async () => '2025.01.01' }
    const results = await runConformance(stale, {
      scenarioId: (await backend.blueprints.listPhases())[0].scenarios[0].id,
      pathId: (
        await backend.blueprints.listPaths(
          (await backend.blueprints.listPhases())[0].scenarios[0].id,
        )
      )[0].id,
    })
    const check = results.find((result) => result.id === 'read/schema-version')
    expect(check?.status).toBe('fail')
    expect(check?.detail).toContain('2025.01.01')
    expect(check?.detail).toContain(TEMPLATE_SCHEMA_VERSION)
  })
})
