import { describe, expect, it } from 'vitest'
import {
  AGENT_SKILL_COMMANDS,
  parseSkillDraft,
  skillMatchesQuery,
} from '@/lib/agent/skills'
import { readReference, REFERENCE_NAMES } from '@/lib/agent/tools/read'

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

  it('parses namespaced and bare slash drafts', () => {
    const namespaced = parseSkillDraft('/sb:audit the sample scenario')
    expect(namespaced?.command.id).toBe('sb:audit')
    expect(namespaced?.rest).toBe('the sample scenario')
    const bare = parseSkillDraft('/audit')
    expect(bare?.command.id).toBe('sb:audit')
    expect(parseSkillDraft('/frobnicate now')).toBeNull()
  })

  it('prefix-matches queries against ids and aliases', () => {
    const audit = AGENT_SKILL_COMMANDS.find((entry) => entry.id === 'sb:audit')!
    expect(skillMatchesQuery(audit, 'au')).toBe(true)
    expect(skillMatchesQuery(audit, 'sb:au')).toBe(true)
    expect(skillMatchesQuery(audit, 'zz')).toBe(false)
  })
})

describe('vendored references', () => {
  // Importing read.ts also fires its init assertion that REFERENCES and
  // REFERENCE_NAMES agree — this test existing is what runs it.
  it('serves every published name with real content', () => {
    for (const name of REFERENCE_NAMES) {
      expect(readReference(name).length, name).toBeGreaterThan(100)
    }
  })

  it('answers an unknown name with the available list, not a throw', () => {
    expect(readReference('nope')).toContain('Unknown reference')
  })
})
