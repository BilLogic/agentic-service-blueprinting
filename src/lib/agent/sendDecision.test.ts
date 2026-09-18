import { describe, expect, it } from 'vitest'

import { decideSend, type SendDecision } from '@/lib/agent/sendDecision'

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
const asking = (decision: SendDecision) => {
  if (decision.kind !== 'ask') throw new Error('expected a question, got a send')
  return decision
}

/** The Send the panel would commit, or a failure if it asks again. */
const sending = (decision: SendDecision) => {
  if (decision.kind !== 'send') throw new Error('expected a send, got a question')
  return decision
}

/** A first press of Send: nothing asked yet, so nothing answered. */
const firstPress = (draft: string) => decideSend(draft, { kind: 'unasked' })

describe('a draft with no near miss in it', () => {
  it('sends every skill its text names, in the order the tokens appear', () => {
    // Four skills in one message, and the order is the instruction. Uncapped
    // and ordered is a decision this repeats rather than one it makes.
    const decision = sending(
      firstPress('/sb:whatif this, /sb:map it, /sb:slice it, then /sb:audit'),
    )
    expect(decision.send.skills.map((skill) => skill.id)).toEqual([
      'sb:whatif',
      'sb:map',
      'sb:slice',
      'sb:audit',
    ])
    expect(decision.declaredMisses).toEqual([])
  })

  it('sends the tokens as the reader wrote them, prose and all', () => {
    const decision = sending(
      firstPress('build from my notes /sb:map then /sb:audit it'),
    )
    expect(decision.send.text).toBe(
      'build from my notes /sb:map then /sb:audit it',
    )
  })

  it('turns a draft of nothing but tokens into the instruction they stand for', () => {
    // A bare token is not a sentence, and the order it puts them in is what
    // the loop is asked to work through.
    expect(sending(firstPress('/sb:map /sb:audit')).send.text).toBe(
      'Run /sb:map, then /sb:audit — each from the top of its flow, in that order.',
    )
    expect(sending(firstPress('/sb:map')).send.text).toBe(
      'Run /sb:map from the top of its flow.',
    )
  })
})

describe('a near miss the reader has not answered yet', () => {
  it('asks about every miss in the draft rather than the first', () => {
    const decision = asking(firstPress('check /audit then /map this'))
    expect(decision.misses.map((miss) => miss.token)).toEqual(['audit', 'map'])
    expect(decision.draft).toBe('check /audit then /map this')
  })
})

describe('accepting one offer re-checks the draft it produced', () => {
  const DRAFT = 'check /audit then /map this'

  it('asks again for the second miss instead of sending it in silence', () => {
    // THE defect this module exists for. Accepting used to go straight to the
    // send, so `/map` — which names no skill and runs nothing — went to the
    // model as prose with nobody told, one token to the right of the silence
    // the offer had just closed.
    const next = asking(decideSend(DRAFT, { kind: 'accepted' }))
    // The accepted token is spelled properly in the draft the question is
    // about, so the field can show what was agreed to before it asks again.
    expect(next.draft).toBe('check /sb:audit then /map this')
    expect(next.misses.map((miss) => miss.token)).toEqual(['map'])
  })

  it('sends both skills in order once the second offer is taken too', () => {
    const next = asking(decideSend(DRAFT, { kind: 'accepted' }))
    const decision = sending(decideSend(next.draft, { kind: 'accepted' }))
    expect(decision.send.text).toBe('check /sb:audit then /sb:map this')
    expect(decision.send.skills.map((skill) => skill.id)).toEqual([
      'sb:audit',
      'sb:map',
    ])
    // Nothing is left to declare: both tokens resolve and both run.
    expect(decision.declaredMisses).toEqual([])
  })

  it('completes the token where it sits, leaving the sentence around it', () => {
    const decision = sending(
      decideSend('then /audit the intake', { kind: 'accepted' }),
    )
    expect(decision.send.text).toBe('then /sb:audit the intake')
  })

  it('cannot corrupt the draft when the reader accepts twice running', () => {
    // The answer is consent, not spans, and this is the reason. While the
    // answer carried the misses the reader had been shown, a second accept
    // off the same question re-applied a span measured against `/audit` to
    // the `/sb:audit ` that had replaced it, and the offsets landed inside
    // the word: `/audit` came back as `/sb:audit dit `. Every arm now walks
    // the draft it is handed, so a stale answer is at worst a repeat.
    const first = sending(decideSend('/audit', { kind: 'accepted' }))
    expect(first.send.text).toBe('Run /sb:audit from the top of its flow.')
    const again = sending(
      decideSend('/sb:audit ', { kind: 'accepted' }),
    )
    expect(again.send.text).toBe('Run /sb:audit from the top of its flow.')
    expect(again.send.skills.map((skill) => skill.id)).toEqual(['sb:audit'])
  })
})

describe('the reader who means the prose', () => {
  it('declares every miss the message carried, not the first', () => {
    // One declared and the rest left out is the same silence with a smaller
    // mouth: the model reads the undeclared `/map` as a map that ran.
    const draft = 'check /audit then /map this'
    const decision = sending(decideSend(draft, { kind: 'declared' }))
    expect(decision.send.text).toBe(draft)
    expect(decision.send.skills).toEqual([])
    expect(decision.declaredMisses).toEqual([
      { token: 'audit', label: '/sb:audit' },
      { token: 'map', label: '/sb:map' },
    ])
  })

  it('declares what the FINAL text still misses, never what an older draft did', () => {
    // A declaration built from the list the reader was looking at, rather
    // than from the draft being committed, tells the model both halves of a
    // contradiction: `/sb:audit` is in `skills`, so the audit ran, AND
    // `/audit` is declared a near miss that did not. A draft whose only token
    // resolves declares nothing at all.
    const resolved = sending(decideSend('/sb:audit ', { kind: 'declared' }))
    expect(resolved.send.skills.map((skill) => skill.id)).toEqual(['sb:audit'])
    expect(resolved.declaredMisses).toEqual([])

    // The same fact along the path that produces the divergence: accept the
    // first offer, then send the rewritten draft as text. The audit runs and
    // only the map is declared.
    const asked = asking(
      decideSend('check /audit then /map this', { kind: 'accepted' }),
    )
    const decision = sending(decideSend(asked.draft, { kind: 'declared' }))
    expect(decision.send.skills.map((skill) => skill.id)).toEqual(['sb:audit'])
    expect(decision.declaredMisses).toEqual([
      { token: 'map', label: '/sb:map' },
    ])
  })
})
