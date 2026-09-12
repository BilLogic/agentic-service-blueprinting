import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  AGENT_PROVIDERS,
  DEFAULT_MODELS,
  MODEL_OPTIONS,
  type AgentProviderId,
} from '@/lib/agent/settings'

/*
 * THE NO-KEY MODEL LIST, held to the policy written beside it.
 *
 * This list cannot be checked for freshness by a test — nothing here can call
 * a provider — and pretending otherwise would be worse than not trying. What a
 * test CAN hold is the shape the policy asks for, which is what stopped being
 * true last time: an id that is a preview, a dated snapshot, or an alias the
 * provider repoints; a provider that quietly lost its entry; a default that is
 * not the first name a person is offered.
 *
 * Freshness is held by the date in the source comment and by the person who
 * changes it, having called the endpoint. That is a weaker guarantee, honestly
 * stated, rather than a green test that measures nothing.
 */

const PROVIDERS = AGENT_PROVIDERS.map((provider) => provider.id)

/** A preview, a dated snapshot, or a moving alias — none of them belongs. */
const UNSTABLE = /(preview|latest|exp|-\d{4}-\d{2}-\d{2}|-\d{8}$)/

describe('the list a person sees before they have a key', () => {
  it('covers every provider the app offers', () => {
    expect(Object.keys(MODEL_OPTIONS).sort()).toEqual([...PROVIDERS].sort())
  })

  it('offers three names per provider, which is the policy', () => {
    // Not two, not seven. A menu that ages badly should be short enough to
    // re-read in one pass when somebody refreshes it.
    for (const provider of PROVIDERS) {
      expect(MODEL_OPTIONS[provider as AgentProviderId]).toHaveLength(3)
    }
  })

  it('names no preview, dated snapshot or moving alias', () => {
    // A preview disappears, a dated snapshot retires, and an alias makes two
    // people running "the same model" run different ones.
    const offenders = PROVIDERS.flatMap((provider) =>
      MODEL_OPTIONS[provider as AgentProviderId]
        .filter((model) => UNSTABLE.test(model))
        .map((model) => `${provider}: ${model}`),
    )
    expect(offenders, offenders.join('\n')).toEqual([])
  })

  it('defaults to the first name it offers', () => {
    // The default is what a person gets if they save a key and never open the
    // dropdown — and the live list does not override a stored choice, so a
    // stale first entry is a model somebody keeps running for months.
    for (const provider of PROVIDERS) {
      const id = provider as AgentProviderId
      expect(DEFAULT_MODELS[id]).toBe(MODEL_OPTIONS[id][0])
    }
  })

  it('repeats no name within a provider', () => {
    for (const provider of PROVIDERS) {
      const models = MODEL_OPTIONS[provider as AgentProviderId]
      expect(new Set(models).size).toBe(models.length)
    }
  })

  it('says when it was last verified, in a form that can be read', () => {
    // The freshness guarantee is a person and a date. If the date goes, the
    // list is unfalsifiable — nobody can tell a current list from a forgotten
    // one without calling three endpoints themselves.
    const source = new URL('./settings.ts', import.meta.url)
    const text = readFileSync(source, 'utf8')
    const stamp = /Verified (\d{4})-(\d{2})-(\d{2})\./.exec(text)
    expect(stamp, 'settings.ts must carry `Verified YYYY-MM-DD.`').not.toBeNull()
    expect(Number(stamp![1])).toBeGreaterThanOrEqual(2026)
  })
})
