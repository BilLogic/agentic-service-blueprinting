#!/usr/bin/env node
/**
 * The reserved-band rule, and the three ways a migration filename breaks it.
 *
 * The interesting case is the last one: a version that is fourteen digits and
 * not a date. `21000230000000` reads as fine and is the thirtieth of February,
 * which the Supabase CLI parses when it lists migrations.
 *
 * Run: npm test
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { BAND_START, PRE_BAND, check, isCalendarTimestamp, parseVersion } from '../check-migration-band.mjs'

const MIGRATIONS = fileURLToPath(new URL('../../supabase/migrations/', import.meta.url))

test('the shipped chain obeys the rule it documents', () => {
  assert.deepEqual(check(readdirSync(MIGRATIONS)), [])
})

test('the frozen migrations are exactly the ones that predate the band', () => {
  const shipped = readdirSync(MIGRATIONS).map(parseVersion).filter(Boolean)
  const outside = shipped.filter((version) => version < BAND_START)
  assert.deepEqual(new Set(outside), PRE_BAND)
})

test('a wall-clock stamp outside the band is reported', () => {
  const problems = check(['20260716200000_template_schema.sql', '20260901120000_new_thing.sql'])
  assert.equal(problems.length, 1)
  assert.match(problems[0], /outside the reserved band/)
})

test('two migrations cannot share a version', () => {
  const problems = check(['21000101000000_one.sql', '21000101000000_two.sql'])
  assert.equal(problems.length, 1)
  assert.match(problems[0], /share the version/)
})

test('fourteen digits is not the same as a date', () => {
  assert.equal(isCalendarTimestamp('21000230000000'), false)
  assert.equal(isCalendarTimestamp('21000101000000'), true)
  const problems = check(['21000230000000_february_the_thirtieth.sql'])
  assert.equal(problems.length, 1)
  assert.match(problems[0], /not a real calendar timestamp/)
})

test('a band migration may not sort before a frozen one', () => {
  // Impossible while the band starts at 2100, and asserted so that moving the
  // band down cannot quietly reintroduce the ordering it exists to prevent.
  const problems = check(['20260716200000_template_schema.sql', '21000101000000_later.sql'])
  assert.deepEqual(problems, [])
})
