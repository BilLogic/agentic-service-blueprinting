import {
  completeSkillToken,
  draftWithoutSkillTokens,
  findUnrunSkillTokens,
  skillsInDraft,
  type AgentSkillCommand,
  type UnrunSkillToken,
} from '@/lib/agent/skills'

/**
 * WHAT A DRAFT SENDS, given what the reader has already been asked.
 *
 * The composer used to hold this as an ordering contract written nowhere and
 * spread over three closures: ask about the first near miss, rewrite the
 * draft on accept, re-check the REWRITTEN draft, dispatch with the misses
 * that remain, and pass the draft text as an argument rather than reading it
 * back from a state setter that has not committed yet. Every step of that was
 * a caller's obligation, and the one a caller dropped was the re-check —
 * accepting an offer sent straight out, so a second near miss in the same
 * message rode along in silence, which is the exact silence the offer exists
 * to close.
 *
 * Here the re-check is not a step anybody can skip: accepting is an ANSWER
 * handed to this function, and the answer comes back as another question when
 * the rewrite leaves one standing. A caller that renders what it gets back
 * cannot get the sequence wrong, because there is no sequence left to get
 * wrong.
 *
 * `skills.ts` keeps the token grammar — the regexes, the span arithmetic, the
 * lookahead that stops a path segment resolving as a skill. This is the state
 * machine over that grammar and nothing more.
 */

/**
 * What the reader has said about the near misses they were shown. `misses`
 * empty is the ordinary first press of Send: nothing has been asked yet, so
 * nothing has been answered.
 */
export type MissAnswer =
  /**
   * The message goes as it is typed, and every miss in it is declared to the
   * model. EVERY one, not the first: a message carries as many skills as its
   * text names, so one declared and the rest left out reads to the model as
   * the rest having run.
   */
  | { kind: 'declared'; misses: readonly UnrunSkillToken[] }
  /**
   * The reader takes the offer on the FIRST miss — spell it properly and run
   * it. One at a time, because each rewrite moves the offsets of everything
   * behind it in the draft, and because a reader agreeing to one token has
   * not agreed to the others.
   */
  | { kind: 'accepted'; misses: readonly UnrunSkillToken[] }

/** The near misses a draft must still be asked about, or the Send to commit. */
export type SendPlan =
  | {
      kind: 'ask'
      /**
       * The draft the question is about — rewritten when an accepted offer
       * got this far, so the field shows the reader the token they agreed to
       * before it asks them about the next one.
       */
      draft: string
      misses: readonly UnrunSkillToken[]
    }
  | {
      kind: 'send'
      /** The draft the message was read out of, rewrites included. */
      draft: string
      /**
       * What goes to the model. The resolved tokens stay in it, because they
       * are what the reader wrote; a draft that is NOTHING but tokens becomes
       * the instruction they stand for, since a bare token is not a sentence.
       */
      text: string
      /** One per resolved token, in the order the tokens appear, deduped. */
      skills: readonly AgentSkillCommand[]
      /** The misses going as prose, flattened to what the prompt names. */
      unrunSkills: readonly { token: string; label: string }[]
    }

/** The Send, once nothing in the draft is still an open question. */
function commit(draft: string, misses: readonly UnrunSkillToken[]): SendPlan {
  const skills = skillsInDraft(draft)
  const prose = draftWithoutSkillTokens(draft)
  // Tokens and no words is a complete instruction — and with several of them,
  // the order is the instruction, so it is spelled out rather than left for
  // the loop to infer from a list.
  const text =
    skills.length > 0 && !prose
      ? skills.length === 1
        ? `Run ${skills[0].label} from the top of its flow.`
        : `Run ${skills.map((skill) => skill.label).join(', then ')} — each from the top of its flow, in that order.`
      : draft.trim()
  return {
    kind: 'send',
    draft,
    text,
    skills,
    unrunSkills: misses.map((miss) => ({
      token: miss.token,
      label: miss.command.label,
    })),
  }
}

/**
 * The whole decision, in one call: this text and these answers give either
 * the question left to ask or the Send to commit.
 *
 * The recursion is the re-check, and it is why no caller has to remember to
 * perform one. An accepted offer rewrites one token and then asks this same
 * function about the draft it produced — so a rewrite that leaves a second
 * near miss standing comes back as `ask`, and a rewrite that leaves none
 * comes back as the Send. It terminates because each rewrite turns a bare
 * alias into an official name, which is a token this walk never returns.
 */
export function planSend(draft: string, answer: MissAnswer): SendPlan {
  if (answer.kind === 'accepted') {
    const [miss] = answer.misses
    // Nothing to accept is the same question as a first press: the draft may
    // have moved under a stale answer, and the draft is the record.
    if (!miss) return planSend(draft, { kind: 'declared', misses: [] })
    return planSend(completeSkillToken(draft, miss, miss.command), {
      kind: 'declared',
      misses: [],
    })
  }
  if (answer.misses.length > 0) return commit(draft, answer.misses)
  const misses = findUnrunSkillTokens(draft)
  if (misses.length > 0) return { kind: 'ask', draft, misses }
  return commit(draft, [])
}
