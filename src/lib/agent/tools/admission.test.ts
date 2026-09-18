import { afterEach, describe, expect, it } from 'vitest'
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
 * The offer and the admission are two readers of one description now, so the
 * first thing pinned here is that they cannot disagree: over every mode and
 * every definition, a tool the roster withholds is a tool the admission
 * refuses. That is the check the eight-block cascade could not have — it
 * re-stated the roster's conditions in its own order, and nothing compared
 * the two.
 *
 * The rest are the four facts the description cannot carry, each still
 * refusing in its own words, and the one gate that keeps its own predicate
 * because `ui_command` is a write by its ARGUMENTS.
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
  admitToolCall({
    mode,
    name,
    definition: findToolDefinition(name),
    facts: { ...QUIET, ...facts },
  })

describe('the offer and the admission answer from one description', () => {
  it('refuses every tool the roster withholds, under every mode, and admits every tool it offers', () => {
    for (const mode of MODES) {
      const offered = new Set(sessionRoster(mode).map((tool) => tool.name))
      for (const tool of TOOL_DEFINITIONS) {
        const answer = admit(mode, tool.name, { isWrite: tool.surface === 'write' })
        expect(answer.admitted, `${tool.name} under ${JSON.stringify(mode)}`).toBe(
          offered.has(tool.name),
        )
      }
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
    expect(admit({ ...DESKTOP, searchOffered: false }, 'search_blueprint').refusal).toBe(
      NO_SEARCH_REFUSAL,
    )
    expect(admit({ ...DESKTOP, sampleTrial: true }, 'list_stakeholders').refusal).toBe(
      SAMPLE_TRIAL_REFUSAL,
    )
    expect(admit({ ...DESKTOP, mobileReading: true }, 'set_canvas_mode').refusal).toBe(
      MOBILE_SHELL_REFUSAL,
    )
    expect(admit({ ...DESKTOP, allowWrites: false }, 'create_phase', { isWrite: true }).refusal).toBe(
      VIEW_ONLY_REFUSAL,
    )
  })

  it('leaves a name no definition declares to the dispatcher when every mode gate passes', () => {
    // The dispatcher is the reader that knows a name resolves to nothing, and
    // it has a sentence for the two cases it can tell apart. Refusing here
    // would take that answer away from it.
    expect(admit(DESKTOP, 'delete_everything').admitted).toBe(true)
    // On a trial or a phone it has no availability to show, so the mode gates
    // withhold it rather than letting it reach a database that is not there.
    expect(admit({ ...DESKTOP, sampleTrial: true }, 'delete_everything').refusal).toBe(
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
      admit(DESKTOP, 'ui_command', { isWrite: true, writesThisSend: WRITE_BATCH_LIMIT }).refusal,
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
    expect(admit(everything, 'search_blueprint').refusal).toBe(NO_SEARCH_REFUSAL)
    // And the same call with only the search plan missing reads back the same
    // sentence: piling further tripped conditions on top changes nothing.
    expect(admit({ ...DESKTOP, searchOffered: false }, 'search_blueprint').refusal).toBe(
      NO_SEARCH_REFUSAL,
    )
  })

  it('answers a tool this session does not have before spending either budget on it', () => {
    // A withheld tool costs no batch budget and leaves no repeat record: the
    // budgets belong to calls that could have run.
    const viewer = { ...DESKTOP, allowWrites: false }
    expect(
      admit(viewer, 'create_phase', {
        isWrite: true,
        writesThisSend: WRITE_BATCH_LIMIT,
        repeatRead: { args: 'name: Handover' },
      }).ground,
    ).toBe('view-only')
  })

  it('says the run stopped whatever else the call also tripped', () => {
    expect(
      admit(
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
