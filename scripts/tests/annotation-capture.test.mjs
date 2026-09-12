#!/usr/bin/env node
/**
 * Annotation capture (phase 7).
 *
 * Marks stay ephemeral by design, so the thing worth testing is not storage
 * but the one path *out* of the scratch layer: what a mark covers, and whether
 * the sentence shown before it is handed over is honest about it.
 *
 * Run: npm test
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { readAppFile } from '../app-source.mjs'
// Through the alias, not up two directories. A deployment reads the
// application out of `node_modules/agentic-service-blueprinting` and has no
// `src` to walk up into, so `../../src/lib/…` is a file that is not there and
// the suite cannot even load. `@/…` is the same pair of roots the build
// resolves, so this import lands on whichever one holds the application.
import {
  captureMarks,
  describeMarks,
  markBounds,
  overlaps,
} from '@/lib/annotationCapture.ts'

const cell = (cellId, left, top, right, bottom) => ({
  cellId,
  bounds: { left, top, right, bottom },
})

test('a pen stroke is bounded by its furthest points', () => {
  assert.deepEqual(
    markBounds({
      id: '1',
      type: 'pen',
      color: '#000',
      strokeWidth: 2,
      points: [
        { x: 10, y: 40 },
        { x: 30, y: 5 },
        { x: 20, y: 25 },
      ],
    }),
    { left: 10, top: 5, right: 30, bottom: 40 },
  )
})

test('a stroke with no points has no bounds', () => {
  assert.equal(
    markBounds({ id: '1', type: 'pen', color: '#000', strokeWidth: 2, points: [] }),
    null,
  )
})

test('a shape is bounded by its own box', () => {
  assert.deepEqual(
    markBounds({
      id: '2',
      type: 'rect',
      x: 5,
      y: 10,
      width: 20,
      height: 30,
      strokeWidth: 1,
      color: '#000',
      fillColor: null,
      text: '',
    }),
    { left: 5, top: 10, right: 25, bottom: 40 },
  )
})

test('text falls back to its line height, since it has no measured box', () => {
  assert.deepEqual(
    markBounds({
      id: '3',
      type: 'text',
      color: '#000',
      x: 8,
      y: 12,
      text: 'late?',
      fontSize: 14,
    }),
    { left: 8, top: 12, right: 8, bottom: 26 },
  )
})

test('overlap is intersect, not contain — a partial mark counts', () => {
  const mark = { left: 0, top: 0, right: 10, bottom: 10 }
  assert.equal(overlaps(mark, { left: 9, top: 9, right: 50, bottom: 50 }), true)
  assert.equal(overlaps(mark, { left: 11, top: 0, right: 20, bottom: 10 }), false)
})

test('a mark reports every cell it touches', () => {
  const marks = captureMarks(
    [
      {
        id: 'm1',
        type: 'ellipse',
        x: 0,
        y: 0,
        width: 100,
        height: 20,
        strokeWidth: 1,
        color: '#000',
        fillColor: null,
        text: '',
      },
    ],
    [
      cell('a', 10, 5, 40, 15),
      cell('b', 50, 5, 90, 15),
      cell('c', 200, 200, 240, 220),
    ],
  )
  assert.equal(marks.length, 1)
  assert.deepEqual(marks[0].overlaps, ['a', 'b'])
})

test('a mark over blank canvas says so rather than guessing', () => {
  const marks = captureMarks(
    [
      {
        id: 'm1',
        type: 'rect',
        x: 500,
        y: 500,
        width: 10,
        height: 10,
        strokeWidth: 1,
        color: '#000',
        fillColor: null,
        text: '',
      },
    ],
    [cell('a', 0, 0, 20, 20)],
  )
  assert.deepEqual(marks[0].overlaps, [])
  assert.match(describeMarks(marks)[0], /over blank canvas/)
})

test('the description names what is being handed over', () => {
  const marks = captureMarks(
    [
      {
        id: 'm1',
        type: 'sticky',
        color: '#ff0',
        x: 0,
        y: 0,
        width: 30,
        height: 30,
        text: 'late?',
        fontSize: 12,
      },
    ],
    [cell('a', 5, 5, 25, 25)],
  )
  assert.equal(describeMarks(marks)[0], 'A sticky reading “late?”, over 1 cell')
})

/* ------------------------------------------------ the selector, both ends */

/**
 * The agent's marker pen finds the canvas by a DOM ATTRIBUTE, and nothing
 * type-checks a querySelector string against the element that carries it.
 *
 * The rename that moved the table `layers` to `lanes` swept the word on the
 * element into the swimlane's name while four readers kept asking for
 * `[data-canvas-annotation-layer]`. The annotation layer is a RENDERING
 * layer — the same false positive `retired-copy.test.mjs` already excludes
 * data attributes for — so the element was renamed and the swimlane was
 * never involved.
 *
 * What it cost: `registerAgentAnnotator` returns "No annotatable canvas is
 * open right now." when its query misses, so `annotate_cells` failed on every
 * call, on every board, with a sentence that reads like a normal empty state.
 * A silent tool, not a crash.
 *
 * So the attribute is asserted from BOTH ends: the element that emits it and
 * every selector that looks for it, as text, because that is the join the
 * compiler cannot make.
 */
const ATTRIBUTE = 'data-canvas-annotation-layer'

/** The tree the application is read out of: this repository's, or a deployment's. */
const REPO_ROOT = process.cwd()

/** Files that emit the attribute, and files that query for it. */
const EMITTERS = ['src/components/editor/CanvasAnnotationLayer.tsx']
const READERS = [
  'src/contexts/CanvasAnnotationProvider.tsx',
  'src/components/editor/AnnotationCaptureMenu.tsx',
  'src/components/editor/ServiceOverviewView.tsx',
  'src/styles/utilities.css',
]

test('every reader of the annotation canvas asks for the attribute it emits', () => {
  // Read out of the application wherever it is. `process.cwd()` is the
  // deployment's root, and a deployment holds no `src` of its own — every
  // path below would be a file that is not there. `readAppFile` refuses a
  // named file that is missing rather than treating it as an empty one, which
  // is the whole assertion: a reader this check cannot find is a reader this
  // check cannot vouch for.
  const source = (path) => readAppFile(REPO_ROOT, path)

  for (const path of EMITTERS) {
    assert.match(
      source(path),
      new RegExp(`${ATTRIBUTE}=`),
      `${path} no longer emits ${ATTRIBUTE}; every selector below is now dead`,
    )
  }
  for (const path of READERS) {
    assert.ok(
      source(path).includes(`[${ATTRIBUTE}]`),
      `${path} queries an attribute nothing emits`,
    )
  }

  // The failure that shipped: no reader may hold the swept spelling. It is
  // derived rather than written out, so this file does not itself say the
  // thing the lane-is-not-a-layer guard exists to stop.
  const swept = ATTRIBUTE.replace(/layer$/, 'la' + 'ne')
  for (const path of [...EMITTERS, ...READERS]) {
    assert.ok(
      !source(path).includes(swept),
      `${path} calls the rendering layer by the swimlane's name`,
    )
  }
})
