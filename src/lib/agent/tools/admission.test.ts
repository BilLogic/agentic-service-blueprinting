import { afterEach, describe, expect, it } from 'vitest'
import type { ToolDefinition } from '@/lib/agent/tools/definition'
import { TOOL_DEFINITIONS, findToolDefinition } from '@/lib/agent/tools/definitions'
import { admitToolCall, type CallFacts } from '@/lib/agent/tools/admission'
import { configureAgentTools, sessionRoster, type RosterMode } from '@/lib/agent/tools/roster'
import {
  BATCH_LIMIT_REFUSAL,
  MOBILE_SHELL_REFUSAL,
  NO_SEARCH_REFUSAL,
  SAMPLE_TRIAL_REFUSAL,
  STOPPED_REFUSAL,
  VIEW_ONLY_REFUSAL,
  WRITE_BATCH_LIMIT,
  noSuchToolRefusal,
  repeatReadRefusal,
} from '@/lib/agent/tools/refusals'

/*
 * ONE ADMISSION ANSWER PER CALL.
 *
 * The headline pin is `offeredByTheRules` below: an INDEPENDENT statement of
 * what each mode should offer, read off each definition's own `availability`
 * and `surface` fields, which both the offer and the admission are then held
 * to. Independence is the whole point and it is worth saying how it is
 * achieved, because the obvious version of this test cannot fail: comparing
 * `admit(...)` against `sessionRoster(mode)` compares `toolStanding` to
 * itself — `sessionRoster` IS the definitions filtered by it — and so proves
 * only that the two call sites pass the same arguments, never that a gate
 * still withholds what it withheld. The predicate below shares nothing with
 * `toolStanding` but the four rules it is a statement of: it reads the
 * definition fields rather than asking the function, and it is a conjunction
 * rather than a cascade, so it also cannot import the order under test. Loosen
 * any gate in `roster.ts` and it reds.
 *
 * The rest are the four facts the description cannot carry, each still
 * refusing in its own words; the one gate that keeps its own predicate
 * because `ui_command` is a write by its ARGUMENTS; and WHICH sentence a call
 * tripping two gates reads back, which is what the order buys.
 */

afterEach(() => {
  configureAgentTools(undefined)
})

/** Nothing live is true unless a case says so. */
const QUIET: CallFacts = {
  aborted: false,
  isWrite: false,
  writesThisSend: 0,
  repeatRead: false,
}

const DESKTOP: RosterMode = {
  sampleTrial: false,
  mobileReading: false,
  allowWrites: true,
  searchOffered: true,
}

/** Every mode a session can be in: the four facts, all sixteen ways round. */
const MODES: RosterMode[] = []
for (const sampleTrial of [false, true])
  for (const mobileReading of [false, true])
    for (const allowWrites of [false, true])
      for (const searchOffered of [false, true])
        MODES.push({ sampleTrial, mobileReading, allowWrites, searchOffered })

const admit = (mode: RosterMode, name: string, facts: Partial<CallFacts> = {}) =>
  admitToolCall({ mode, name, facts: { ...QUIET, ...facts } })

/**
 * WHAT A MODE SHOULD BE OFFERED, stated here and not asked of the code under
 * test. Four rules, each read off the definition itself: ranked search exists
 * only where the session has a search plan; the no-database trial and the
 * mobile shell get exactly the tools whose own `availability` says they run
 * there; a session that is not a service account gets no tool on the write
 * surface.
 *
 * A CONJUNCTION, deliberately — every rule is evaluated for every tool, so
 * this says which tools are offered without saying anything about the order
 * the gates answer in. The order is pinned separately, by the sentence a call
 * tripping two of them reads back, which is the only thing the order decides.
 */
const offeredByTheRules = (mode: RosterMode, tool: ToolDefinition): boolean =>
  (mode.searchOffered || tool.name !== 'search_blueprint') &&
  (!mode.sampleTrial || tool.availability.sample) &&
  (!mode.mobileReading || tool.availability.mobile) &&
  (mode.allowWrites || tool.surface !== 'write')

const namesOf = (tools: readonly ToolDefinition[]) => new Set(tools.map((tool) => tool.name))

/**
 * The same call, asserted refused, so the answer narrows to the half that
 * carries a sentence. A case reading `.refusal` off the union would be a case
 * that cannot tell an admission from a refusal it mistyped.
 */
const refusalFor = (mode: RosterMode, name: string, facts: Partial<CallFacts> = {}) => {
  const answer = admit(mode, name, facts)
  if (answer.admitted) throw new Error(`${name} was admitted; this case expects a refusal`)
  return answer
}

describe('the offer and the admission answer from one description', () => {
  it('admits exactly the calls the four rules allow, under every mode', () => {
    for (const mode of MODES) {
      for (const tool of TOOL_DEFINITIONS) {
        const answer = admit(mode, tool.name, { isWrite: tool.surface === 'write' })
        expect(answer.admitted, `${tool.name} under ${JSON.stringify(mode)}`).toBe(
          offeredByTheRules(mode, tool),
        )
      }
    }
    // Spot-checks by name, so a reader has something concrete beside the
    // predicate: the write surface is the tier's and the shell's to withhold,
    // and a database read is the trial's.
    expect(admit(DESKTOP, 'upsert_cell', { isWrite: true }).admitted).toBe(true)
    expect(
      admit({ ...DESKTOP, allowWrites: false }, 'upsert_cell', { isWrite: true }).admitted,
    ).toBe(false)
    expect(
      admit({ ...DESKTOP, mobileReading: true }, 'upsert_cell', { isWrite: true }).admitted,
    ).toBe(false)
    expect(admit({ ...DESKTOP, sampleTrial: true }, 'list_stakeholders').admitted).toBe(false)
  })

  it('offers exactly the tools those same rules allow, under every mode', () => {
    for (const mode of MODES) {
      expect(namesOf(sessionRoster(mode)), JSON.stringify(mode)).toEqual(
        namesOf(TOOL_DEFINITIONS.filter((tool) => offeredByTheRules(mode, tool))),
      )
    }
  })

  it('so the offer and the admission cannot disagree about a tool', () => {
    // Held to the same independent statement above, the two are equal to each
    // other as a consequence — which is worth asserting directly, because it
    // is the property the loop relies on, but is not on its own a check that
    // either of them still refuses anything.
    for (const mode of MODES) {
      const offered = namesOf(sessionRoster(mode))
      for (const tool of TOOL_DEFINITIONS)
        expect(
          admit(mode, tool.name, { isWrite: tool.surface === 'write' }).admitted,
          `${tool.name} under ${JSON.stringify(mode)}`,
        ).toBe(offered.has(tool.name))
    }
  })

  it('refuses a tool the deployment allowlist withheld as one that does not exist', () => {
    configureAgentTools(['list_blueprint'])
    expect(sessionRoster(DESKTOP).map((tool) => tool.name)).toEqual(['list_blueprint'])
    expect(admit(DESKTOP, 'upsert_cell', { isWrite: true })).toEqual({
      admitted: false,
      ground: 'not-enabled',
      refusal: noSuchToolRefusal('upsert_cell'),
    })
    expect(admit(DESKTOP, 'list_blueprint').admitted).toBe(true)
  })

  it('answers each withholding ground in the roster’s own words', () => {
    expect(refusalFor({ ...DESKTOP, searchOffered: false }, 'search_blueprint').refusal).toBe(
      NO_SEARCH_REFUSAL,
    )
    expect(refusalFor({ ...DESKTOP, sampleTrial: true }, 'list_stakeholders').refusal).toBe(
      SAMPLE_TRIAL_REFUSAL,
    )
    expect(refusalFor({ ...DESKTOP, mobileReading: true }, 'set_canvas_mode').refusal).toBe(
      MOBILE_SHELL_REFUSAL,
    )
    expect(
      refusalFor({ ...DESKTOP, allowWrites: false }, 'create_phase', { isWrite: true }).refusal,
    ).toBe(VIEW_ONLY_REFUSAL)
  })

  it('leaves a name no definition declares to the dispatcher when every mode gate passes', () => {
    // The dispatcher is the reader that knows a name resolves to nothing, and
    // it has a sentence for the two cases it can tell apart. Refusing here
    // would take that answer away from it.
    expect(admit(DESKTOP, 'delete_everything').admitted).toBe(true)
    // On a trial or a phone it has no availability to show, so the mode gates
    // withhold it rather than letting it reach a database that is not there.
    expect(refusalFor({ ...DESKTOP, sampleTrial: true }, 'delete_everything').refusal).toBe(
      SAMPLE_TRIAL_REFUSAL,
    )
  })
})

describe('the write gate keeps its own predicate', () => {
  /*
   * `ui_command` is an interface tool whose definition says nothing about
   * writing, and it IS a write when its `command` argument names a mutating
   * control — `undo_last_change` reverts through the delete RPCs. No roster
   * can hold an argument, so the loop's predicate answers, and the same
   * answer serves the viewer refusal and the batch budget.
   */
  it('refuses a mutating ui_command to a viewer, by argument, though its surface is interface', () => {
    expect(findToolDefinition('ui_command')!.surface).toBe('interface')
    const viewer = { ...DESKTOP, allowWrites: false }
    expect(admit(viewer, 'ui_command', { isWrite: true })).toEqual({
      admitted: false,
      ground: 'view-only',
      refusal: VIEW_ONLY_REFUSAL,
    })
    // The same call with a non-mutating command is the interface tool it looks
    // like, and a viewer may fire it.
    expect(admit(viewer, 'ui_command', { isWrite: false }).admitted).toBe(true)
  })

  it('spends the write budget on the same predicate that refused the viewer', () => {
    expect(
      refusalFor(DESKTOP, 'ui_command', { isWrite: true, writesThisSend: WRITE_BATCH_LIMIT }).refusal,
    ).toBe(BATCH_LIMIT_REFUSAL)
    expect(
      admit(DESKTOP, 'ui_command', { isWrite: false, writesThisSend: WRITE_BATCH_LIMIT }).admitted,
    ).toBe(true)
  })
})

describe('the live facts still refuse in their own words', () => {
  it('a stopped run', () => {
    expect(admit(DESKTOP, 'list_blueprint', { aborted: true })).toEqual({
      admitted: false,
      ground: 'stopped',
      refusal: STOPPED_REFUSAL,
    })
  })

  it('a write past the batch limit, and not the one that reaches it', () => {
    expect(
      admit(DESKTOP, 'create_phase', { isWrite: true, writesThisSend: WRITE_BATCH_LIMIT - 1 })
        .admitted,
    ).toBe(true)
    expect(
      admit(DESKTOP, 'create_phase', { isWrite: true, writesThisSend: WRITE_BATCH_LIMIT }),
    ).toEqual({ admitted: false, ground: 'batch-limit', refusal: BATCH_LIMIT_REFUSAL })
  })

  it('a read this turn already ran, named by the arguments that repeated', () => {
    expect(
      admit(DESKTOP, 'list_blueprint', { repeatRead: { args: 'granularity: phase' } }),
    ).toEqual({
      admitted: false,
      ground: 'repeat-read',
      refusal: repeatReadRefusal('list_blueprint', 'granularity: phase'),
    })
  })
})

describe('gate order is no longer load-bearing', () => {
  /*
   * The cascade's order WAS the contract: a call tripping two conditions read
   * back whichever block came first, and the roster's order was different, so
   * a `search_blueprint` call on a no-database trial was told it had no
   * database about a tool the roster had withheld for the missing search
   * plan. One description now decides, and these pin that the answer is a
   * function of the description rather than of where a block sits.
   */
  it('gives one answer to a call that trips every declarable gate at once, and it is the roster’s', () => {
    const everything: RosterMode = {
      sampleTrial: true,
      mobileReading: true,
      allowWrites: false,
      searchOffered: false,
    }
    expect(sessionRoster(everything).map((tool) => tool.name)).not.toContain('search_blueprint')
    expect(refusalFor(everything, 'search_blueprint').refusal).toBe(NO_SEARCH_REFUSAL)
    // And the same call with only the search plan missing reads back the same
    // sentence: piling further tripped conditions on top changes nothing.
    expect(refusalFor({ ...DESKTOP, searchOffered: false }, 'search_blueprint').refusal).toBe(
      NO_SEARCH_REFUSAL,
    )
  })

  it('answers a call failing both mode gates in the trial\u2019s words, not the shell\u2019s', () => {
    // THE ONE PAIR THE CASES ABOVE LEAVE UNPINNED. `set_canvas_mode` is
    // available neither on the trial nor on the phone, so a session that is
    // both trips the two gates at once and the order decides which sentence
    // it reads: the trial's, because "no database is connected" is the fact a
    // model can act on — a phone with a database still has the reading tools
    // this one asks to be used instead. Without this case the two lines in
    // `toolStanding` could be swapped and the whole suite would still pass.
    const trialOnAPhone: RosterMode = { ...DESKTOP, sampleTrial: true, mobileReading: true }
    expect(refusalFor(trialOnAPhone, 'set_canvas_mode').refusal).toBe(SAMPLE_TRIAL_REFUSAL)
    expect(refusalFor(trialOnAPhone, 'set_canvas_mode').ground).toBe('sample-trial')
    // And with each gate alone, so the case above is read as an ORDER and not
    // as the trial gate answering for both.
    expect(refusalFor({ ...DESKTOP, sampleTrial: true }, 'set_canvas_mode').ground).toBe(
      'sample-trial',
    )
    expect(refusalFor({ ...DESKTOP, mobileReading: true }, 'set_canvas_mode').ground).toBe(
      'mobile-reading',
    )
  })

  it('answers a tool this session does not have before spending either budget on it', () => {
    // A withheld tool costs no batch budget and leaves no repeat record: the
    // budgets belong to calls that could have run.
    const viewer = { ...DESKTOP, allowWrites: false }
    expect(
      refusalFor(viewer, 'create_phase', {
        isWrite: true,
        writesThisSend: WRITE_BATCH_LIMIT,
        repeatRead: { args: 'name: Handover' },
      }).ground,
    ).toBe('view-only')
  })

  it('says the run stopped whatever else the call also tripped', () => {
    expect(
      refusalFor(
        { sampleTrial: true, mobileReading: true, allowWrites: false, searchOffered: false },
        'search_blueprint',
        { aborted: true, isWrite: true, writesThisSend: 99, repeatRead: { args: 'q: x' } },
      ).refusal,
    ).toBe(STOPPED_REFUSAL)
  })

  it('answers the same call the same way however many times it is asked', () => {
    const facts = { isWrite: true, writesThisSend: WRITE_BATCH_LIMIT }
    const once = admit({ ...DESKTOP, sampleTrial: true }, 'create_phase', facts)
    const twice = admit({ ...DESKTOP, sampleTrial: true }, 'create_phase', facts)
    expect(once).toEqual(twice)
    expect(once.admitted).toBe(false)
  })
})
