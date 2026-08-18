import mapSkill from '@/lib/agent/skill/skills/map.md?raw'
import sliceSkill from '@/lib/agent/skill/skills/slice.md?raw'
import auditSkill from '@/lib/agent/skill/skills/audit.md?raw'
import whatifSkill from '@/lib/agent/skill/skills/whatif.md?raw'

/**
 * The four-skill architecture, in the composer. These are the SAME SKILL.md
 * files IDE humans run from this repo's skills/ tree — vendored by
 * scripts/sync-canvas-skills.mjs, never authored here. A /command loads its
 * skill into the system prompt for that message only.
 *
 * Commands are namespaced `sb:` to match the plugin invocation exactly —
 * /sb:audit here and /sb:audit in the IDE are the same skill. Bare aliases
 * (/audit) are kept for muscle memory.
 */
export type AgentSkillCommand = {
  /** The canonical /command token, without the slash. */
  id: 'sb:map' | 'sb:slice' | 'sb:audit' | 'sb:whatif'
  /** Bare tokens that also resolve to this command. */
  aliases: string[]
  label: string
  description: string
  /** SKILL.md content; null while the skill has not shipped. */
  content: string | null
}

export const AGENT_SKILL_COMMANDS: AgentSkillCommand[] = [
  {
    id: 'sb:map',
    aliases: ['map'],
    label: '/sb:map',
    description: 'Create or evolve a blueprint from notes and conversation',
    content: mapSkill,
  },
  {
    id: 'sb:slice',
    aliases: ['slice'],
    label: '/sb:slice',
    description: 'Cut a stakeholder view out of the blueprint',
    content: sliceSkill,
  },
  {
    id: 'sb:audit',
    aliases: ['audit'],
    label: '/sb:audit',
    description: 'Run the check roster — findings recorded for triage',
    content: auditSkill,
  },
  {
    id: 'sb:whatif',
    aliases: ['whatif'],
    label: '/sb:whatif',
    description: 'Trace a hypothetical change — promote it only on acceptance',
    content: whatifSkill,
  },
]

/** True when `query` is a prefix of the command's id or any alias. */
export function skillMatchesQuery(
  command: AgentSkillCommand,
  query: string,
): boolean {
  const q = query.toLowerCase()
  return (
    command.id.startsWith(q) ||
    command.aliases.some((alias) => alias.startsWith(q))
  )
}

function findSkillByToken(token: string): AgentSkillCommand | undefined {
  const t = token.toLowerCase()
  return AGENT_SKILL_COMMANDS.find(
    (entry) => entry.id === t || entry.aliases.includes(t),
  )
}

/**
 * A draft that *starts* with a slash names a skill: "/sb:audit the sample"
 * (or the bare alias "/audit the sample"). Returns the command and the
 * remainder, or null when the token matches no skill (the text then sends
 * as-is — no surprise swallowing).
 */
export function parseSkillDraft(
  draft: string,
): { command: AgentSkillCommand; rest: string } | null {
  const match = /^\/([\w:]+)\s*([\s\S]*)$/.exec(draft.trim())
  if (!match) return null
  const command = findSkillByToken(match[1])
  return command ? { command, rest: match[2].trim() } : null
}
