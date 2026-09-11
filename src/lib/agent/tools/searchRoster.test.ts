import { afterEach, describe, expect, it } from 'vitest'
import { TOOL_SPECS, sessionRoster } from '@/lib/agent/tools/specs'
import { agentSearchPlan, configureAgentSearch } from '@/lib/agent/searchPlan'

/*
 * WHETHER THE MODEL IS EVEN TOLD the search tool exists.
 *
 * `searchPlan.test.ts` pins the decision; this pins that the roster obeys it,
 * which is the part a person can feel. A tool on the roster is a tool the
 * model will describe and offer to use — so a session whose key cannot reach
 * any listed index must not see the name at all, rather than seeing it and
 * silently getting a lesser search under it.
 *
 * The gates' ORDER is the other thing here. Each of the first three subsumes
 * the ones after it, and ranked search is removed from whatever they produced.
 */

afterEach(() => {
  configureAgentSearch(undefined)
})

const GOOGLE_INDEX = {
  provider: 'google' as const,
  model: 'gemini-embedding-001',
  dimensions: 768,
}

const DESKTOP = {
  sampleTrial: false,
  mobileReading: false,
  allowWrites: true,
}

function names(session: Parameters<typeof sessionRoster>[1]): string[] {
  return sessionRoster(TOOL_SPECS, session).map((spec) => spec.name)
}

describe('the search tool on a session roster', () => {
  it('is absent for every provider when the deployment has no search function', () => {
    configureAgentSearch(undefined)
    for (const provider of ['google', 'openai', 'anthropic'] as const) {
      const roster = names({
        ...DESKTOP,
        searchOffered: agentSearchPlan(provider).offered,
      })
      expect(roster).not.toContain('search_blueprint')
    }
  })

  it('is present for everyone when search is on with no index listed', () => {
    configureAgentSearch({ enabled: true, indexes: [] })
    for (const provider of ['google', 'openai', 'anthropic'] as const) {
      const roster = names({
        ...DESKTOP,
        searchOffered: agentSearchPlan(provider).offered,
      })
      expect(roster).toContain('search_blueprint')
    }
  })

  it('is present on a Google key and absent on Anthropic and OpenAI keys once a Google index is listed', () => {
    configureAgentSearch({ enabled: true, indexes: [GOOGLE_INDEX] })
    expect(
      names({ ...DESKTOP, searchOffered: agentSearchPlan('google').offered }),
    ).toContain('search_blueprint')
    expect(
      names({ ...DESKTOP, searchOffered: agentSearchPlan('anthropic').offered }),
    ).not.toContain('search_blueprint')
    expect(
      names({ ...DESKTOP, searchOffered: agentSearchPlan('openai').offered }),
    ).not.toContain('search_blueprint')
  })

  it('reaches the mobile reading roster, since a phone’s question is the case for it', () => {
    expect(
      names({
        sampleTrial: false,
        mobileReading: true,
        allowWrites: false,
        searchOffered: true,
      }),
    ).toContain('search_blueprint')
  })

  it('is absent on mobile when this session was not offered it', () => {
    expect(
      names({
        sampleTrial: false,
        mobileReading: true,
        allowWrites: false,
        searchOffered: false,
      }),
    ).not.toContain('search_blueprint')
  })

  it('stays absent in the no-database trial even when it is offered', () => {
    // Nothing to search: the trial answers from a bundled fixture, and the
    // whitelist does not name it. A session gate cannot add to a whitelist —
    // a tool reaches that roster only by being put in it with a sample answer.
    expect(
      names({
        sampleTrial: true,
        mobileReading: false,
        allowWrites: false,
        searchOffered: true,
      }),
    ).not.toContain('search_blueprint')
  })

  it('leaves every other gate alone', () => {
    const viewer = names({
      ...DESKTOP,
      allowWrites: false,
      searchOffered: false,
    })
    expect(viewer).not.toContain('upsert_cell')
    expect(viewer).toContain('list_blueprint')
    const author = names({ ...DESKTOP, searchOffered: false })
    expect(author).toContain('upsert_cell')
  })
})
