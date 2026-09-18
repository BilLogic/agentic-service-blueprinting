import { describe, expect, it } from 'vitest'
import {
  AGENT_SKILL_COMMANDS,
  completeSkillToken,
  draftWithoutSkillTokens,
  findSkillLookup,
  findSkillTokens,
  findUnrunSkillToken,
  skillMatchesQuery,
} from '@/lib/agent/skills'
import { TOOL_DEFINITIONS } from '@/lib/agent/tools/definitions'
import { readReference, referenceNames } from '@/lib/agent/tools/references'

describe('agent skills (vendored SKILL.md)', () => {
  it('ships all four skills with content', () => {
    expect(AGENT_SKILL_COMMANDS.map((command) => command.id)).toEqual([
      'sb:map',
      'sb:slice',
      'sb:audit',
      'sb:whatif',
    ])
    for (const command of AGENT_SKILL_COMMANDS) {
      expect(command.content, command.id).toBeTruthy()
    }
  })

  it('reads the skill out of a typed-through draft, and only a namespaced one', () => {
    expect(findSkillTokens('/sb:audit the sample scenario')).toEqual([
      {
        command: AGENT_SKILL_COMMANDS.find((entry) => entry.id === 'sb:audit'),
        start: 0,
        end: 9,
      },
    ])
    // The official name invokes; the bare alias only finds.
    expect(findSkillTokens('/audit')).toEqual([])
    expect(findSkillTokens('/frobnicate now')).toEqual([])
  })

  it('prefix-matches queries against ids and aliases', () => {
    const audit = AGENT_SKILL_COMMANDS.find((entry) => entry.id === 'sb:audit')!
    expect(skillMatchesQuery(audit, 'au')).toBe(true)
    expect(skillMatchesQuery(audit, 'sb:au')).toBe(true)
    expect(skillMatchesQuery(audit, 'zz')).toBe(false)
  })
})

describe('the skill lookup a draft carries', () => {
  // The table the trigger exists for: a slash opens a lookup when it opens a
  // word, and the four strings below are the ones that used to be mistaken
  // for one the moment the trigger stopped being anchored to index 0.
  const cases: [string, string | null][] = [
    ['/', ''],
    ['/sb:aud', 'sb:aud'],
    ['Hey can u /sb:aud', 'sb:aud'],
    ['Hey can u /', ''],
    ['check this、/aud', 'aud'],
    ['/sb:audit this', null],
    ['check /sb:audit/notes.md', null],
    ['look at src/lib', null],
    ['see http://example.test', null],
    ['do this and/or that', null],
    ['on 2026/09/17', null],
  ]
  for (const [draft, query] of cases) {
    it(`${query === null ? 'ignores' : `reads "${query}" from`} ${JSON.stringify(draft)}`, () => {
      expect(findSkillLookup(draft)?.query ?? null).toBe(query)
    })
  }

  it('reads the token to the end of the draft, and stops at a space', () => {
    const lookup = findSkillLookup('Hey can u /sb:aud')
    expect(lookup).toEqual({ query: 'sb:aud', start: 10, end: 17 })
    expect(findSkillLookup('Hey can u /sb:aud ')).toBeNull()
  })

  it('stays quiet while the draft already opens with a resolved skill', () => {
    // That skill owns its arguments — a slash inside them is argument text.
    expect(findSkillLookup('/sb:map from /notes')).toBeNull()
    // An unresolved head token owns nothing, so the lookup still runs.
    expect(findSkillLookup('/audit the intake and /sb:m')?.query).toBe('sb:m')
  })

  it('completes the token in place, leaving the prose before it untouched', () => {
    const audit = AGENT_SKILL_COMMANDS.find((entry) => entry.id === 'sb:audit')!
    const draft = 'Hey can u /sb:aud'
    // The token gains its ending and a space, and does not move: the badge
    // this replaced took it out of the sentence and stood it at the front.
    expect(completeSkillToken(draft, findSkillLookup(draft)!, audit)).toBe(
      'Hey can u /sb:audit ',
    )
    expect(
      completeSkillToken('/aud', findSkillLookup('/aud')!, audit),
    ).toBe('/sb:audit ')
  })

  it('keeps a mid-sentence space rather than doubling it', () => {
    // The near-miss offer's span, which is the only one that does not reach
    // the end of the draft: a second space here is a hole in the sentence.
    const audit = AGENT_SKILL_COMMANDS.find((entry) => entry.id === 'sb:audit')!
    const draft = 'then /audit the intake'
    expect(completeSkillToken(draft, { start: 5, end: 11 }, audit)).toBe(
      'then /sb:audit the intake',
    )
  })

  it('closes its own lookup, so the menu does not reopen on the completion', () => {
    const audit = AGENT_SKILL_COMMANDS.find((entry) => entry.id === 'sb:audit')!
    const draft = 'Hey can u /sb:aud'
    const completed = completeSkillToken(draft, findSkillLookup(draft)!, audit)
    expect(findSkillLookup(completed)).toBeNull()
  })
})

describe('the skills a draft names', () => {
  const idsIn = (draft: string) =>
    findSkillTokens(draft).map((span) => span.command.id)

  it('reads a token wherever it opens a word, in the order it appears', () => {
    expect(idsIn('build this from my notes /sb:map then /sb:audit it')).toEqual([
      'sb:map',
      'sb:audit',
    ])
    expect(idsIn('check this、/sb:whatif')).toEqual(['sb:whatif'])
  })

  it('reports the span the composer colours', () => {
    const spans = findSkillTokens('Hey can u /sb:audit the intake')
    expect(spans).toHaveLength(1)
    expect('Hey can u /sb:audit the intake'.slice(spans[0]!.start, spans[0]!.end))
      .toBe('/sb:audit')
  })

  it('reads nothing out of the strings a slash is text in', () => {
    // The same table the lookup refuses. This walk is NOT tail-anchored, so
    // the path cases are its own to refuse: a token with a path behind it,
    // and a URL.
    expect(idsIn('check /sb:audit/notes.md')).toEqual([])
    expect(idsIn('see http://example.test')).toEqual([])
    expect(idsIn('look at src/lib')).toEqual([])
    expect(idsIn('do this and/or that')).toEqual([])
    expect(idsIn('on 2026/09/17')).toEqual([])
    // A bare alias resolves nothing, so it colours nothing and runs nothing.
    expect(idsIn('then /audit the intake')).toEqual([])
  })

  it('says what the message holds besides the skills it names', () => {
    expect(draftWithoutSkillTokens('/sb:audit')).toBe('')
    expect(draftWithoutSkillTokens('  /sb:map /sb:audit ')).toBe('')
    expect(draftWithoutSkillTokens('Hey can u /sb:audit the intake')).toBe(
      'Hey can u  the intake',
    )
  })
})

describe('a near-miss token that would send as prose', () => {
  it('names the closest skill for a bare alias rather than resolving it', () => {
    const unrun = findUnrunSkillToken('then /audit the intake')
    expect(unrun).toEqual({
      token: 'audit',
      command: AGENT_SKILL_COMMANDS.find((entry) => entry.id === 'sb:audit'),
      start: 5,
      end: 11,
    })
  })

  it('reports the span, so accepting rewrites the token where it sits', () => {
    const draft = 'Hey can u /audit the goal setting'
    const unrun = findUnrunSkillToken(draft)
    expect(draft.slice(unrun!.start, unrun!.end)).toBe('/audit')
  })

  it('stays quiet where there is nothing to say', () => {
    // A token that RESOLVES is not a near miss. It is coloured in the field
    // and it runs, so there is no silence to break and no question to ask —
    // this is the confirm-once prompt's deletion, pinned.
    expect(findUnrunSkillToken('/sb:audit the intake')).toBeNull()
    expect(findUnrunSkillToken('Hey can u /sb:audit the goal setting')).toBeNull()
    // A token naming nothing is a word with a slash on it.
    expect(findUnrunSkillToken('Hey can u /frobnicate this')).toBeNull()
    // The same strings the lookup refuses to fire on.
    expect(findUnrunSkillToken('look at src/lib')).toBeNull()
    expect(findUnrunSkillToken('do this and/or that')).toBeNull()
    expect(findUnrunSkillToken('on 2026/09/17')).toBeNull()
    // This walk is NOT tail-anchored, so the path cases it has to refuse are
    // its own to refuse: a token with a path behind it, and a URL.
    expect(findUnrunSkillToken('check /audit/notes.md')).toBeNull()
    expect(findUnrunSkillToken('see http://example.test')).toBeNull()
  })
})

describe('vendored references', () => {
  // Importing references.ts also fires its init assertion that the record
  // and REFERENCE_NAMES agree — this test existing is what runs it.
  it('serves every published name with real content', () => {
    for (const name of referenceNames()) {
      expect(readReference(name, TOOL_DEFINITIONS).length, name).toBeGreaterThan(100)
    }
  })

  it('answers an unknown name with the available list, not a throw', () => {
    expect(readReference('nope', TOOL_DEFINITIONS)).toContain('Unknown reference')
  })
})
