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
 * /sb:audit here and /sb:audit in the IDE are the same skill. The official
 * name is the ONLY spelling that invokes one; a bare alias is a search term
 * and a near-miss hint, and resolves nothing.
 */
export type AgentSkillCommand = {
  /** The canonical /command token, without the slash. */
  id: 'sb:map' | 'sb:slice' | 'sb:audit' | 'sb:whatif'
  /**
   * Bare spellings a reader reaches for. Deliberately half-alive: they match
   * in the menu and they name the closest skill when a token resolves to
   * none, and they invoke nothing — a message that merely mentions /audit is
   * a sentence, not an invocation.
   */
  aliases: string[]
  label: string
  summary: string
  /** SKILL.md content; null while the skill has not shipped. */
  content: string | null
}

export const AGENT_SKILL_COMMANDS: AgentSkillCommand[] = [
  {
    id: 'sb:map',
    aliases: ['map'],
    label: '/sb:map',
    summary: 'Create or evolve a blueprint from notes and conversation',
    content: mapSkill,
  },
  {
    id: 'sb:slice',
    aliases: ['slice'],
    label: '/sb:slice',
    summary: 'Cut a stakeholder view out of the blueprint',
    content: sliceSkill,
  },
  {
    id: 'sb:audit',
    aliases: ['audit'],
    label: '/sb:audit',
    summary: 'Run the check roster — findings recorded for triage',
    content: auditSkill,
  },
  {
    id: 'sb:whatif',
    aliases: ['whatif'],
    label: '/sb:whatif',
    summary: 'Trace a hypothetical change — promote it only on acceptance',
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

/**
 * The one place a typed token turns into a skill that will actually run.
 * Ids only, because one canonical spelling invokes: with a lookup that fires
 * mid-sentence, every token this resolves is a message it can silently turn
 * into a skill run, and `/audit` in prose is far more often a word than a
 * command.
 */
export function findSkillByToken(token: string): AgentSkillCommand | undefined {
  const t = token.toLowerCase()
  return AGENT_SKILL_COMMANDS.find((entry) => entry.id === t)
}

/**
 * Where a lookup sits in the draft: the query to match skills against, and
 * the half-open span of the `/token` itself, so picking can lift out the
 * token and leave the prose around it standing.
 */
export type SkillLookup = { query: string; start: number; end: number }

/**
 * A slash opens a lookup when it OPENS A WORD — at the head of the draft, or
 * directly after whitespace (the CJK sentence marks included, since a reader
 * typing Japanese gets no space before the slash). Everything else a slash
 * appears in is text: a reference path, a URL, `and/or`, a date.
 *
 * TAIL-ONLY, not caret-aware: the token must run to the end of the draft.
 * The tool this composer mirrors tracks the caret and looks up the token
 * under it; doing that here would mean holding `selectionStart` in state and
 * keeping it honest through every programmatic write to the field. This stays
 * derived from the text alone — the cost is that editing back into an earlier
 * token does not reopen the menu, which is the rarer half of the gesture.
 *
 * A space after the token closes it, because the space is not in the token's
 * character class and the token has to reach the end.
 */
const SKILL_TOKEN_CHARS = '[a-zA-Z0-9._:-]'
const LOOKUP_AT_HEAD = new RegExp(`^/(${SKILL_TOKEN_CHARS}*)$`)
const LOOKUP_AFTER_SPACE = new RegExp(
  `[\\s。、？！]/(${SKILL_TOKEN_CHARS}*)$`,
)

export function findSkillLookup(draft: string): SkillLookup | null {
  // A draft that already opens with a resolved skill is that skill's
  // arguments from the space onwards, and a slash inside arguments is
  // argument text — offering a second lookup there would put a menu over
  // a path the reader is typing for the skill to read.
  const head = /^\/([\w.:-]+)\s/.exec(draft)
  if (head && findSkillByToken(head[1])) return null
  const atHead = LOOKUP_AT_HEAD.exec(draft)
  if (atHead)
    return { query: atHead[1].toLowerCase(), start: 0, end: draft.length }
  const afterSpace = LOOKUP_AFTER_SPACE.exec(draft)
  if (!afterSpace) return null
  return {
    query: afterSpace[1].toLowerCase(),
    // The match opens on the whitespace that qualified the slash; the span
    // starts at the slash, so the space the reader typed survives the pick.
    start: afterSpace.index + 1,
    end: draft.length,
  }
}

/**
 * The draft with the looked-up token lifted out — the prose either side of it
 * untouched. Picking a skill used to clear the field, which threw away the
 * sentence the reader was in the middle of writing; the badge replaces the
 * token, not the message.
 */
export function spliceSkillLookup(draft: string, lookup: SkillLookup): string {
  return draft.slice(0, lookup.start) + draft.slice(lookup.end)
}

/**
 * A draft that *starts* with a skill's official name invokes it:
 * "/sb:audit the intake". Returns the command and the remainder, or null when
 * the token matches no skill — an alias among them (the text then sends
 * as-is, and the unrun-token notice is what breaks the silence).
 */
export function parseSkillDraft(
  draft: string,
): { command: AgentSkillCommand; rest: string } | null {
  const match = /^\/([\w:]+)\s*([\s\S]*)$/.exec(draft.trim())
  if (!match) return null
  const command = findSkillByToken(match[1])
  return command ? { command, rest: match[2].trim() } : null
}
