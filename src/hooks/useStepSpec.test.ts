/**
 * Lane order is a guarantee: a step's frames follow lane position, for any
 * input.
 *
 * A step panel draws one frame per lane so that the same moment can be
 * compared across actors, and which actor is a POSITION on the board — the
 * same `position` the canvas sorts its rows by. The frames arrive from an
 * embedded `lanes(...)` select, and an embedded resource comes back in
 * whatever order the plan produced, so the order the panel renders was
 * incidental until `storyboardFramesFromCells` imposed one. Nothing was
 * visibly broken: the rendered row and the image viewer's sibling group are
 * built from the same array, so they agreed with each other whatever order
 * they were in. They agreed on an order nobody chose.
 *
 * ── WHAT IS ASSERTED, AND WHY IT IS NOT A FIXTURE ──────────────────────────
 *
 * Every assertion below is a property of the FUNCTION over generated inputs,
 * not a picture of today's board. Three cheaper shapes were tried first and
 * each is recorded here because the next person will think of them too.
 *
 * A FIXTURE — "these three lanes come back in this order" — was rejected on
 * the rule this repository states about assertions: it breaks on the next
 * unrelated edit and teaches the reader to update the expected array rather
 * than to ask what changed. Worse, it is the shape that would have PASSED the
 * defect. The fixture's rows are written in lane order by the person writing
 * them, so a function that returns its input untouched satisfies it. Only
 * feeding the same rows in a different order can tell the two apart, which is
 * why permutation is the centre of this file.
 *
 * READING THE SOURCE for a `.sort(` is a keyword search, not a check. It
 * cannot see a sort on the wrong key, and `lane_role` and `name` are both
 * right there in the select for a sort to reach for by mistake.
 *
 * DRIVING THE HOOK against a stub client would exercise `useSupabaseQuery`'s
 * plumbing — a query key, a signal, a fallback — and bury one claim about
 * ordering under a render. The extractor is a pure function precisely so the
 * claim can be made about it directly.
 *
 * ── WHAT THIS CANNOT SEE, STATED RATHER THAN HIDDEN ────────────────────────
 *
 * It reads the FUNCTION, not the query. It proves the array the panel
 * receives is ordered by the position the rows carry; it does not prove that
 * `position` is what a reader means by "which actor". That claim rests on the
 * canvas sorting its own lanes by the same column, and the two agree because
 * both name `position` — nothing here holds them together, and a rename that
 * moved one and not the other would leave this green.
 *
 * The generator produces short lane names, small positions and a handful of
 * frame strings, chosen to make ties and duplicates COMMON rather than rare.
 * An input shape it never produces is not covered. The permutation half is
 * exhaustive only for the small cases; above that it samples shuffles.
 *
 * It says nothing about a caller that re-sorts or re-filters the array
 * afterwards. The panel does not, and that is a fact about the panel.
 */
import { describe, expect, it } from 'vitest'
import { shouldUseStoryboardContent } from '@/lib/blueprintLayout'
import {
  storyboardFramesFromCells,
  type FramedCellRow,
} from '@/hooks/useStepSpec'

/* ------------------------------------------------------------ the generator */

/** A seeded generator, so a failure is reproducible and a run is not a lottery. */
function makeRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

/**
 * Roles the generator draws from: one the canvas calls a storyboard row and
 * several it does not, plus `null`, which a custom lane really carries.
 *
 * The storyboard role is not named here. It is read back from the rule the
 * function itself calls, so this file cannot drift into asserting a role the
 * canvas has stopped treating as a storyboard row.
 */
const ROLES: Array<string | null> = [
  'storyboard',
  'customer_actions',
  'frontstage_touchpoints',
  'tech',
  null,
]

const LANE_NAMES = ['Story', 'Customer', 'Backstage', 'Tech', 'Support']
const FRAMES = ['/a.png', '/b.png', '/c.png', '/d.png', '  ', '']

/** A row set with ties, duplicate frames, blanks and non-storyboard lanes in it. */
function makeRows(random: () => number, count: number): FramedCellRow[] {
  const pick = <T,>(values: T[]): T =>
    values[Math.floor(random() * values.length)]
  return Array.from({ length: count }, () => ({
    // A blank and a null frame are both real: `frame` is nullable, and a
    // cell whose frame was cleared holds an empty string.
    frame: random() < 0.1 ? null : pick(FRAMES),
    lanes: {
      name: pick(LANE_NAMES),
      // A small range on purpose: a lane belongs to one path, so a scenario
      // with four paths has four lanes sharing a position, and the tie is
      // the case the sort has to survive.
      position: Math.floor(random() * 4),
      lane_role: pick(ROLES),
    },
  }))
}

/** Every ordering of `values` — used where the input is small enough to be total. */
function permutations<T>(values: T[]): T[][] {
  if (values.length <= 1) return [values]
  return values.flatMap((value, index) =>
    permutations([
      ...values.slice(0, index),
      ...values.slice(index + 1),
    ]).map((rest) => [value, ...rest]),
  )
}

function shuffle<T>(values: T[], random: () => number): T[] {
  const out = [...values]
  for (let index = out.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1))
    ;[out[index], out[swap]] = [out[swap], out[index]]
  }
  return out
}

/** Whether the canvas would draw this row's lane as a storyboard row. */
const isStoryboardRow = (row: FramedCellRow) =>
  shouldUseStoryboardContent({
    name: row.lanes.name,
    role: row.lanes.lane_role,
  })

const positionOf = (rows: FramedCellRow[], src: string) =>
  Math.min(
    ...rows
      .filter((row) => row.frame?.trim() === src && isStoryboardRow(row))
      .map((row) => row.lanes.position),
  )

/* ----------------------------------------------------------- the properties */

describe('a step\'s frames follow lane position', () => {
  it('never places a lower lane after a higher one, for any generated input', () => {
    const random = makeRandom(20260908)
    for (let trial = 0; trial < 400; trial += 1) {
      const rows = makeRows(random, 1 + Math.floor(random() * 12))
      const frames = storyboardFramesFromCells(rows)
      const positions = frames.map((frame) => positionOf(rows, frame.src))
      expect(
        positions.every((position, index) =>
          index === 0 ? true : positions[index - 1] <= position,
        ),
        `frames out of lane order: ${positions.join(',')}`,
      ).toBe(true)
    }
  })

  it('returns the same frames however the rows arrive — exhaustively, while that is affordable', () => {
    const random = makeRandom(1)
    for (let trial = 0; trial < 60; trial += 1) {
      // Five rows is 120 orderings, which is the whole space and cheap.
      const rows = makeRows(random, 5)
      const expected = storyboardFramesFromCells(rows)
      for (const ordering of permutations(rows)) {
        expect(storyboardFramesFromCells(ordering)).toEqual(expected)
      }
    }
  })

  it('returns the same frames however the rows arrive — sampled, where the space is too large', () => {
    const random = makeRandom(2)
    for (let trial = 0; trial < 200; trial += 1) {
      const rows = makeRows(random, 8 + Math.floor(random() * 20))
      const expected = storyboardFramesFromCells(rows)
      for (let sample = 0; sample < 8; sample += 1) {
        expect(storyboardFramesFromCells(shuffle(rows, random))).toEqual(
          expected,
        )
      }
    }
  })

  it('credits a repeated frame to the first lane in the order, not the first row on the wire', () => {
    // The same step is drawn once per path and the paths share their imagery,
    // so the surviving row decides the caption. Reversing the input must not
    // change whose lane the frame is attributed to.
    const random = makeRandom(3)
    for (let trial = 0; trial < 200; trial += 1) {
      const rows = makeRows(random, 2 + Math.floor(random() * 10))
      const frames = storyboardFramesFromCells(rows)
      expect(storyboardFramesFromCells([...rows].reverse())).toEqual(frames)
      for (const frame of frames) {
        // The oracle is written out longhand rather than borrowed from the
        // function: lowest position wins, and a tie on position is settled by
        // the lane's name.
        const drew = rows
          .filter(
            (row) => row.frame?.trim() === frame.src && isStoryboardRow(row),
          )
          .map((row) => row.lanes)
        const first = Math.min(...drew.map((entry) => entry.position))
        expect(frame.laneName).toBe(
          drew
            .filter((entry) => entry.position === first)
            .map((entry) => entry.name)
            .sort()[0],
        )
      }
    }
  })
})

describe('a frame is what a storyboard row draws', () => {
  it('keeps exactly the rows the canvas rule keeps, once each', () => {
    const random = makeRandom(4)
    for (let trial = 0; trial < 400; trial += 1) {
      const rows = makeRows(random, 1 + Math.floor(random() * 14))
      const frames = storyboardFramesFromCells(rows)
      // The rule is CALLED, not restated: this asserts agreement with the
      // canvas, so a change to what counts as a storyboard row moves both.
      const drawable = new Set(
        rows
          .filter((row) => isStoryboardRow(row) && (row.frame?.trim() ?? '') !== '')
          .map((row) => row.frame!.trim()),
      )
      expect(new Set(frames.map((frame) => frame.src))).toEqual(drawable)
      expect(frames.length).toBe(drawable.size)
    }
  })
})

describe('the guard reads the function', () => {
  // A property test whose subject is wired up wrong is green forever and
  // looks exactly like a function that is correct. These few lines prove the
  // ordering, the tie-break and the storyboard filter are all live.
  const lane = (name: string, position: number, role: string | null) => ({
    name,
    position,
    lane_role: role,
  })

  it('orders by position, and breaks ties by lane name then frame', () => {
    expect(
      storyboardFramesFromCells([
        { frame: '/late.png', lanes: lane('Zed', 9, 'storyboard') },
        { frame: '/tie-b.png', lanes: lane('Bee', 1, 'storyboard') },
        { frame: '/early.png', lanes: lane('Ay', 0, 'storyboard') },
        { frame: '/tie-a.png', lanes: lane('Ay', 1, 'storyboard') },
      ]),
    ).toEqual([
      { laneName: 'Ay', src: '/early.png' },
      { laneName: 'Ay', src: '/tie-a.png' },
      { laneName: 'Bee', src: '/tie-b.png' },
      { laneName: 'Zed', src: '/late.png' },
    ])
  })

  it('drops a blank frame and a lane the canvas does not draw as a storyboard', () => {
    expect(
      storyboardFramesFromCells([
        { frame: '  ', lanes: lane('Story', 0, 'storyboard') },
        { frame: null, lanes: lane('Story', 0, 'storyboard') },
        { frame: '/logo.png', lanes: lane('Tech', 1, 'tech') },
        { frame: '  /kept.png  ', lanes: lane('Story', 2, 'storyboard') },
      ]),
    ).toEqual([{ laneName: 'Story', src: '/kept.png' }])
  })
})
