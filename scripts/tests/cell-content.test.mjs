#!/usr/bin/env node
/**
 * Phase 4 logic that is worth testing without a browser.
 *
 * Two things here can lose data silently, which is why they get tests rather
 * than a click-through:
 *
 * 1. `updateCellResources` REPLACES a cell's resources. It used to rewrite a
 *    jsonb array that also held touchpoint detail and provenance citations,
 *    and had to filter itself to avoid deleting them on every save. The three
 *    contents now live apart, so the filter is gone, and what is asserted
 *    here is that the whole list — and only this cell's list — goes to the
 *    database in one call.
 * 2. A resource URL that is not `https:` must be refused rather than coerced.
 *
 * Run: npm test
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { validateResourceUrl } from '../../src/lib/resourceUrl.ts'
import {
  updateCellContent,
  updateCellResources,
} from '../../src/lib/cellContentMutations.ts'
import { updateCellSpec } from '../../src/lib/cellSpecMutations.ts'

test('bare host is upgraded to https', () => {
  const result = validateResourceUrl('figma.com/file/abc')
  assert.equal(result.ok, true)
  assert.equal(result.url, 'https://figma.com/file/abc')
})

test('http is refused, never silently upgraded', () => {
  const result = validateResourceUrl('http://example.com')
  assert.equal(result.ok, false)
  assert.match(result.problem, /not secure/)
})

test('non-http schemes are refused', () => {
  for (const raw of ['javascript:alert(1)', 'file:///etc/passwd', 'ftp://x.com']) {
    const result = validateResourceUrl(raw)
    assert.equal(result.ok, false, `${raw} should be refused`)
  }
})

test('empty and malformed are refused', () => {
  assert.equal(validateResourceUrl('').ok, false)
  assert.equal(validateResourceUrl('   ').ok, false)
  assert.equal(validateResourceUrl('https://').ok, false)
})

/**
 * Minimal stand-in for the PostgREST builder chain, capturing the payload.
 *
 * `rows` is what `.select()` resolves with — the whole point of the second
 * test group below. PostgREST answers a matched-nothing update with
 * `{ data: [], error: null }`, so an empty array here is a *successful*
 * response that wrote nothing.
 *
 * A content write also brings the cell's touchpoint placements into line with
 * the text, through one `sync_cell_touchpoints` RPC. It is stubbed here as a
 * no-op returning nothing removed: these tests are about the content write
 * and its matched-nothing detection. Which cells the sync acts on, and what
 * it does to them, is decided inside the function and proved in its own
 * migration, because a client-side assertion can no longer see it.
 */
function fakeClient(rows = [{ id: 'cell-1' }]) {
  const captured = {}
  return {
    captured,
    rpcError: null,
    rpc(name, args) {
      captured.rpc = { name, args }
      if (this.rpcError) return Promise.resolve({ data: null, error: this.rpcError })
      return Promise.resolve({ data: { skipped: true, removed: [] }, error: null })
    },
    from(table) {
      return {
        update(values) {
          captured.values = values
          return {
            eq(column, value) {
              captured.eq = [column, value]
              return {
                select(columns) {
                  // Only the cells table's write is the subject; the sync's
                  // own updates must not overwrite what was captured.
                  if (table === 'cells') captured.select = columns
                  return Promise.resolve({ data: rows, error: null })
                },
              }
            },
          }
        },
      }
    },
  }
}

test('a resources save sends the whole list, for this cell, in one call', async () => {
  const client = fakeClient()

  await updateCellResources(
    client,
    'cell-1',
    [{ kind: 'link', name: 'Old', url: 'https://old.example.com/' }],
    [
      { name: 'Spec', url: 'https://spec.example.com' },
      { name: 'Figma', url: 'https://figma.com/file/abc' },
    ],
  )

  // One RPC, not a statement per row: `resources_cell_position_unique` is
  // deferrable, and PostgREST gives every statement its own transaction, so a
  // reorder issued row by row collides on the first one.
  assert.equal(client.captured.rpc.name, 'sync_cell_resources')
  assert.equal(client.captured.rpc.args.p_cell_id, 'cell-1')
  assert.deepEqual(
    client.captured.rpc.args.p_rows.map((row) => row.name),
    ['Spec', 'Figma'],
  )
  assert.equal(client.captured.rpc.args.p_rows[0].url, 'https://spec.example.com/')
  assert.ok(
    client.captured.rpc.args.p_rows.every((row) => row.kind === 'link'),
  )
  // No table write at all — the whole rewrite is the function's.
  assert.equal(client.captured.values, undefined)
})

test('a saved row names itself by id, and a new row has none yet', async () => {
  // `sync_cell_resources` upserts by id: a row that arrives with its
  // id is updated in place, a row without one is inserted, and a row the
  // list no longer names is deleted. The editor therefore has to send the
  // id it read, or every save is a delete-and-reinsert and the ids churn.
  const client = fakeClient()

  await updateCellResources(
    client,
    'cell-1',
    [{ id: 'r-1', kind: 'link', name: 'Spec', url: 'https://spec.example.com/' }],
    [
      { id: 'r-1', name: 'Spec', url: 'https://spec.example.com' },
      { name: 'Figma', url: 'https://figma.com/file/abc' },
    ],
  )

  assert.deepEqual(
    client.captured.rpc.args.p_rows.map((row) => row.id),
    ['r-1', null],
  )
})

test('a resource with no name falls back to its host', async () => {
  const client = fakeClient()
  await updateCellResources(client, 'cell-1', [], [
    { name: '  ', url: 'https://www.notion.so/page' },
  ])
  assert.equal(client.captured.rpc.args.p_rows[0].name, 'notion.so')
})

test('one bad URL aborts the whole write', async () => {
  const client = fakeClient()
  await assert.rejects(
    () =>
      updateCellResources(client, 'cell-1', [], [
        { name: 'Good', url: 'https://ok.example.com' },
        { name: 'Bad', url: 'http://insecure.example.com' },
      ]),
    /not secure/,
  )
  // Nothing may reach the database when any entry is invalid — a partial
  // write would drop the good link's sibling without saying so.
  assert.equal(client.captured.values, undefined)
})

/*
 * Zero rows is a real answer.
 *
 * `.update(...).eq('id', …)` against a row that is gone returns 200 with an
 * empty array and `error: null`. Checking `error` alone reports it as a
 * success — which is how "edit cell C, then delete the path that cascades C,
 * then Revert all" told the user the edit had been taken back, dropped the
 * entry from the ledger, and left the new text waiting to reappear with the
 * restored path.
 */
test('a content write that matches no row throws instead of succeeding', async () => {
  const client = fakeClient([])
  await assert.rejects(
    () =>
      updateCellContent(
        client,
        'cell-gone',
        { content: 'New text', summary: '', owner: '', perceivedOwner: '' },
        undefined,
        { record: false },
      ),
    /no longer exists/,
  )
  assert.equal(client.captured.select, 'id', '.select() is what makes it visible')
})

test('a spec write that matches no row throws instead of succeeding', async () => {
  const client = fakeClient([])
  await assert.rejects(
    () =>
      updateCellSpec(
        client,
        'cell-gone',
        { function: 'Reassure', form: 'Card', valueProps: [] },
        undefined,
        { record: false },
      ),
    /no longer exists/,
  )
})

test('a resources write onto a cell that is gone surfaces the refusal', async () => {
  // The zero-rows check moved into the database with the write. The function
  // raises on a cell that does not exist, and what this side must not do is
  // swallow that into a silent success — which is the same failure the two
  // tests above are about, one layer along.
  const client = fakeClient()
  client.rpcError = { message: 'cell cell-gone does not exist' }
  await assert.rejects(
    () => updateCellResources(client, 'cell-gone', [], []),
    // Through `toAuthoringError`, like every other write in this module:
    // the reader gets the house sentence and the raw refusal is kept on the
    // error for the console.
    (error) => /does not exist/.test(error.raw),
  )
})

test('a content write that matches its row still resolves', async () => {
  const client = fakeClient()
  await updateCellContent(
    client,
    'cell-1',
    { content: 'New text', summary: '', owner: '', perceivedOwner: '' },
    undefined,
    { record: false },
  )
  assert.equal(client.captured.values.content, 'New text')
})

test('a content save asks the database to sync the placements it named', () => {
  // The client no longer decides which cells are touchpoint-bearing or what
  // to do with them; it hands over the names and the function decides. What
  // is still this side's job, and so is asserted here, is that the names it
  // sends are the ones the author typed, split the same way the board reads
  // them.
  const client = fakeClient()
  return updateCellContent(
    client,
    'cell-1',
    { content: 'Zoom, Member Portal', summary: '', owner: '', perceivedOwner: '', status: 'live' },
    undefined,
    { record: false },
  ).then(() => {
    assert.equal(client.captured.rpc.name, 'sync_cell_touchpoints')
    assert.deepEqual(client.captured.rpc.args, {
      p_cell_id: 'cell-1',
      p_names: ['Zoom', 'Member Portal'],
    })
  })
})
