/**
 * The list is one list, held equal to the two places that also carry it.
 *
 * `references/ir-schema.json` is the source `scripts/validate_ir.py` and
 * `npm run check:target` both read, and the bootstrap migration seeds a
 * version into the database. Nothing at runtime compares them, so these cases
 * are the comparison: a version added here and nowhere else, or there and not
 * here, fails before a target is born speaking a shape the app does not know.
 */
import { describe, expect, test } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  SUPPORTED_SCHEMA_VERSIONS,
  TEMPLATE_SCHEMA_VERSION,
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
})
