import { describe, expect, it } from 'vitest'

import { planSend, type SendPlan } from '@/lib/agent/sendPlan'
import { findUnrunSkillTokens } from '@/lib/agent/skills'

/*
 * WHAT A DRAFT SENDS, asked and answered without a component.
 *
 * The sequence this file exists for is accept-then-second-miss: a message
 * with two near misses, the first one spelled properly, and the second still
 * naming nothing. It used to be reachable only by clicking through the panel,
 * and the defect it hides — an accept that skips the re-check and sends the
 * second miss in silence — lived in a closure nothing could call. Here the
 * answer goes in and the next question comes out, so the sequence is two
 * assertions on returned values rather than two events through a DOM.
 *
 * The token grammar is next door in `skills.test.ts` and is not re-tested
 * here: which slashes open a word, and which are text in a path or a date.
 * What is asserted here is the state machine over it.
 */

/** The question the panel would put on screen, or a failure if it sends. */
const asking = (plan: SendPlan) => {
  if (plan.kind !== 'ask') throw new Error('expected a question, got a send')
  return plan
}

/** The Send the panel would commit, or a failure if it asks again. */
const sending = (plan: SendPlan) => {
  if (plan.kind !== 'send') throw new Error('expected a send, got a question')
  return plan
}

/** A first press of Send: nothing asked yet, so nothing answered. */
const firstPress = (draft: string) =>
  planSend(draft, { kind: 'declared', misses: [] })

describe('a draft with no near miss in it', () => {
  it('sends every skill its text names, in the order the tokens appear', () => {
    // Four skills in one message, and the order is the instruction. Uncapped
    // and ordered is a decision this repeats rather than one it makes.
    const plan = sending(
      firstPress('/sb:whatif this, /sb:map it, /sb:slice it, then /sb:audit'),
    )
    expect(plan.skills.map((skill) => skill.id)).toEqual([
      'sb:whatif',
      'sb:map',
      'sb:slice',
      'sb:audit',
    ])
    expect(plan.unrunSkills).toEqual([])
  })

  it('sends the tokens as the reader wrote them, prose and all', () => {
    const plan = sending(
      firstPress('build from my notes /sb:map then /sb:audit it'),
    )
    expect(plan.text).toBe('build from my notes /sb:map then /sb:audit it')
  })

  it('turns a draft of nothing but tokens into the instruction they stand for', () => {
    // A bare token is not a sentence, and the order it puts them in is what
    // the loop is asked to work through.
    expect(sending(firstPress('/sb:map /sb:audit')).text).toBe(
      'Run /sb:map, then /sb:audit — each from the top of its flow, in that order.',
    )
    expect(sending(firstPress('/sb:map')).text).toBe(
      'Run /sb:map from the top of its flow.',
    )
  })
})

describe('a near miss the reader has not answered yet', () => {
  it('asks about every miss in the draft rather than the first', () => {
    const plan = asking(firstPress('check /audit then /map this'))
    expect(plan.misses.map((miss) => miss.token)).toEqual(['audit', 'map'])
    expect(plan.draft).toBe('check /audit then /map this')
  })
})

describe('accepting one offer re-checks the draft it produced', () => {
  const DRAFT = 'check /audit then /map this'

  it('asks again for the second miss instead of sending it in silence', () => {
    // THE defect this module exists for. Accepting used to go straight to the
    // send, so `/map` — which names no skill and runs nothing — went to the
    // model as prose with nobody told, one token to the right of the silence
    // the offer had just closed.
    const asked = asking(firstPress(DRAFT))
    const next = asking(
      planSend(DRAFT, { kind: 'accepted', misses: asked.misses }),
    )
    // The accepted token is spelled properly in the draft the question is
    // about, so the field can show what was agreed to before it asks again.
    expect(next.draft).toBe('check /sb:audit then /map this')
    expect(next.misses.map((miss) => miss.token)).toEqual(['map'])
  })

  it('sends both skills in order once the second offer is taken too', () => {
    const asked = asking(firstPress(DRAFT))
    const next = asking(
      planSend(DRAFT, { kind: 'accepted', misses: asked.misses }),
    )
    const plan = sending(
      planSend(next.draft, { kind: 'accepted', misses: next.misses }),
    )
    expect(plan.draft).toBe('check /sb:audit then /sb:map this')
    expect(plan.skills.map((skill) => skill.id)).toEqual(['sb:audit', 'sb:map'])
    // Nothing is left to declare: both tokens resolve and both run.
    expect(plan.unrunSkills).toEqual([])
  })

  it('completes the token where it sits, leaving the sentence around it', () => {
    const draft = 'then /audit the intake'
    const plan = sending(
      planSend(draft, { kind: 'accepted', misses: findUnrunSkillTokens(draft) }),
    )
    expect(plan.text).toBe('then /sb:audit the intake')
  })
})

describe('the reader who means the prose', () => {
  it('declares every miss the message carried, not the first', () => {
    // One declared and the rest left out is the same silence with a smaller
    // mouth: the model reads the undeclared `/map` as a map that ran.
    const draft = 'check /audit then /map this'
    const asked = asking(firstPress(draft))
    const plan = sending(
      planSend(draft, { kind: 'declared', misses: asked.misses }),
    )
    expect(plan.text).toBe(draft)
    expect(plan.skills).toEqual([])
    expect(plan.unrunSkills).toEqual([
      { token: 'audit', label: '/sb:audit' },
      { token: 'map', label: '/sb:map' },
    ])
  })
})
