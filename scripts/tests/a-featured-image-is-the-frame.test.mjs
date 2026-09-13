#!/usr/bin/env node
/**
 * A cell's featured image is its frame: one function writes it, and placing a
 * cell on a touchpoint with a logo fills an empty one.
 *
 * THE BEHAVIOUR IS PERFORMED IN THE MIGRATION, not here, because it needs a
 * database and a pull request's unit run has none: set, undo, clear, a refused
 * address, and a placement that fills an empty frame and leaves a set one
 * alone. CI replays it on a stock Postgres.
 *
 * What is here is the DECLARATION side: the signature, the grants, and the
 * guard that keeps a placement from overwriting a frame somebody chose.
 *
 * Run: npm test
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const REPO_ROOT = process.cwd()
const read = (path) => readFileSync(resolve(REPO_ROOT, path), 'utf8')

/** Which band a line falls in: core until `-- @recipe`, back at `-- @core`. */
function bandAt(sql, index) {
  let band = 'core'
  for (const line of sql.slice(0, index).split('\n')) {
    if (/^\s*--\s*@recipe\b/.test(line)) band = 'recipe'
    else if (/^\s*--\s*@core\b/.test(line)) band = 'core'
  }
  return band
}

/** The execute privileges a file hands out on one function, as `verb role band`. */
function executeAcl(sql, fn) {
  const pattern = new RegExp(
    `(grant|revoke)\\s+execute\\s+on\\s+function\\s+public\\.${fn}\\([^)]*\\)\\s+(?:to|from)\\s+([a-z_,\\s]+?);`,
    'gi',
  )
  const out = []
  for (const match of sql.matchAll(pattern)) {
    const band = bandAt(sql, match.index)
    for (const role of match[2].split(',').map((r) => r.trim()).filter(Boolean)) {
      out.push(`${match[1].toLowerCase()} ${role} ${band}`)
    }
  }
  return out.sort()
}

const MIGRATION = 'supabase/migrations/21000227000000_a_featured_image_is_the_frame.sql'
const SIBLING_MIGRATION = 'supabase/migrations/20260818001000_authoring_operations.sql'

test('the featured image is written by one guarded function with two required arguments', () => {
  const sql = read(MIGRATION)
  const signature =
    /create or replace function public\.set_cell_featured_image\(\s*cell_id uuid,\s*image_url text\s*\)/i
  assert.match(sql, signature)
  assert.doesNotMatch(sql, /set_cell_featured_image\([^)]*default/i)
  assert.match(sql, /security definer/i)
  assert.match(sql, /if not public\.is_service_account\(\) then/)
  assert.doesNotMatch(sql.replace(/image_url text\s*\)/, 'image_url text default null)'), signature)
})

test('it is granted exactly as the sibling that deletes an edge is', () => {
  const sql = read(MIGRATION)
  const mine = executeAcl(sql, 'set_cell_featured_image')
  assert.deepEqual(mine, ['grant authenticated recipe', 'revoke anon recipe', 'revoke public core'])
  assert.deepEqual(mine, executeAcl(read(SIBLING_MIGRATION), 'clear_cell_dependency'))
})

test('both placement functions fill only an empty frame, and only with a logo', () => {
  const sql = read(MIGRATION)
  const guard = /nullif\(btrim\(c\.frame\), ''\) is null/g
  const logo = /nullif\(btrim\(tp\.icon_url\), ''\) is not null/g
  assert.equal(sql.match(guard)?.length ?? 0, 2)
  assert.equal(sql.match(logo)?.length ?? 0, 2)
  assert.match(sql, /pg_get_functiondef\('public\.sync_cell_touchpoints\(uuid, text\[\]\)'/)
  assert.match(sql, /pg_get_functiondef\('public\.set_placement_touchpoint\(uuid, uuid, text\)'/)
})
