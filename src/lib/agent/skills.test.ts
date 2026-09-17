import { describe, expect, it } from 'vitest'
import {
  AGENT_SKILL_COMMANDS,
  findSkillLookup,
  findUnrunSkillToken,
  parseSkillDraft,
  skillMatchesQuery,
  spliceSkillLookup,
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

  it('parses a namespaced slash draft, and only a namespaced one', () => {
    const namespaced = parseSkillDraft('/sb:audit the sample scenario')
    expect(namespaced?.command.id).toBe('sb:audit')
    expect(namespaced?.rest).toBe('the sample scenario')
    // The official name invokes; the bare alias only finds.
    expect(parseSkillDraft('/audit')).toBeNull()
    expect(parseSkillDraft('/frobnicate now')).toBeNull()
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

  it('splices out the token span and nothing else', () => {
    const draft = 'Hey can u /sb:aud'
    const lookup = findSkillLookup(draft)!
    expect(spliceSkillLookup(draft, lookup)).toBe('Hey can u ')
    expect(spliceSkillLookup('/sb:aud', findSkillLookup('/sb:aud')!)).toBe('')
  })

  it('takes one of the two spaces that surrounded a mid-sentence span', () => {
    // The notice's span, not a lookup's: a token with prose on both sides.
    expect(
      spliceSkillLookup('Hey can u /sb:audit the goal setting', {
        start: 10,
        end: 19,
      }),
    ).toBe('Hey can u the goal setting')
  })
})

describe('a skill token that would send as prose', () => {
  it('names the skill a word-start token spells exactly', () => {
    const unrun = findUnrunSkillToken('Hey can u /sb:audit the goal setting')
    expect(unrun).toEqual({
      token: 'sb:audit',
      command: AGENT_SKILL_COMMANDS.find((entry) => entry.id === 'sb:audit'),
      matched: 'name',
      start: 10,
      end: 19,
    })
  })

  it('offers the canonical skill for a bare alias rather than resolving it', () => {
    const unrun = findUnrunSkillToken('then /audit the intake')
    expect(unrun?.command.id).toBe('sb:audit')
    expect(unrun?.matched).toBe('alias')
  })

  it('stays quiet where there is nothing to say', () => {
    // A draft that already invokes needs no notice — it runs.
    expect(findUnrunSkillToken('/sb:audit the intake')).toBeNull()
    // A token naming nothing is a word with a slash on it.
    expect(findUnrunSkillToken('Hey can u /frobnicate this')).toBeNull()
    // The same strings the lookup refuses to fire on.
    expect(findUnrunSkillToken('look at src/lib')).toBeNull()
    expect(findUnrunSkillToken('do this and/or that')).toBeNull()
    expect(findUnrunSkillToken('on 2026/09/17')).toBeNull()
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
