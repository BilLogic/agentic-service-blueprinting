import { afterEach, describe, expect, it } from 'vitest'
import type { AgentSearchIndex } from '@/deploymentConfig'
import { agentSearchPlan, configureAgentSearch } from '@/lib/agent/searchPlan'

/*
 * WHO GETS RANKED SEARCH, and who is quietly not offered it.
 *
 * Three states and one refusal, and the refusal is the reason this module
 * exists: a person whose provider cannot reach any index the deployment holds
 * is offered NOTHING, rather than a keyword search dressed as the search
 * everyone else gets. An empty index list is the opposite case — nobody holds
 * an index, so keyword matching is what ranked search means there, and every
 * provider gets it equally.
 */

afterEach(() => {
  configureAgentSearch(undefined)
})

const GOOGLE_INDEX = {
  provider: 'google' as const,
  model: 'gemini-embedding-001',
  dimensions: 768,
}

describe('agentSearchPlan', () => {
  it('offers nothing when the deployment has not built search', () => {
    configureAgentSearch(undefined)
    expect(agentSearchPlan('google')).toEqual({ offered: false })
    expect(agentSearchPlan('openai')).toEqual({ offered: false })
    expect(agentSearchPlan('anthropic')).toEqual({ offered: false })
  })

  it('offers keyword-only search to everyone when no index is listed', () => {
    configureAgentSearch({ enabled: true, indexes: [] })
    expect(agentSearchPlan('google')).toEqual({ offered: true, index: null })
    expect(agentSearchPlan('anthropic')).toEqual({ offered: true, index: null })
    expect(agentSearchPlan('openai')).toEqual({ offered: true, index: null })
  })

  it('embeds with the matching index when the person’s provider has one', () => {
    configureAgentSearch({ enabled: true, indexes: [GOOGLE_INDEX] })
    expect(agentSearchPlan('google')).toEqual({
      offered: true,
      index: GOOGLE_INDEX,
    })
  })

  it('does not offer the tool to an Anthropic key once an index is listed', () => {
    configureAgentSearch({ enabled: true, indexes: [GOOGLE_INDEX] })
    // Anthropic has no embedding model, so it is never a listed provider.
    expect(agentSearchPlan('anthropic')).toEqual({ offered: false })
  })

  it('does not offer the tool to a provider the deployment has no index for', () => {
    configureAgentSearch({ enabled: true, indexes: [GOOGLE_INDEX] })
    expect(agentSearchPlan('openai')).toEqual({ offered: false })
  })

  it('serves a second provider once its index is listed, with no code change', () => {
    configureAgentSearch({
      enabled: true,
      indexes: [
        GOOGLE_INDEX,
        { provider: 'openai', model: 'text-embedding-3-small', dimensions: 768 },
      ],
    })
    expect(agentSearchPlan('openai')).toEqual({
      offered: true,
      index: { provider: 'openai', model: 'text-embedding-3-small', dimensions: 768 },
    })
    expect(agentSearchPlan('google')).toEqual({ offered: true, index: GOOGLE_INDEX })
  })

  it('reads an index list off `enabled` alone, not off the list being there', () => {
    // A deployment that lists an index but has not switched search on is
    // saying its database has no function to call. No tool.
    configureAgentSearch({ enabled: false, indexes: [GOOGLE_INDEX] })
    expect(agentSearchPlan('google')).toEqual({ offered: false })
  })

  it('copies the config, so a host mutation cannot change what is embedded', () => {
    const indexes: AgentSearchIndex[] = [{ ...GOOGLE_INDEX }]
    configureAgentSearch({ enabled: true, indexes })
    indexes[0].model = 'some-other-model'
    indexes.push({ provider: 'openai', model: 'sneaky', dimensions: 1 })
    const plan = agentSearchPlan('google')
    expect(plan).toEqual({ offered: true, index: GOOGLE_INDEX })
    expect(agentSearchPlan('openai')).toEqual({ offered: false })
  })

  it('hands out a copy, so a caller cannot edit the configured index', () => {
    configureAgentSearch({ enabled: true, indexes: [GOOGLE_INDEX] })
    const plan = agentSearchPlan('google')
    if (!plan.offered || !plan.index) throw new Error('expected an index')
    plan.index.dimensions = 1
    expect(agentSearchPlan('google')).toEqual({ offered: true, index: GOOGLE_INDEX })
  })
})
