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
 * character class and the token has to reach the end. So does a second slash:
 * `/sb:audit/notes.md` is a path, and the token has to be the last thing in
 * the draft for it to be a lookup at all.
 *
 * ONE SPELLING of the token grammar, `SKILL_TOKEN_CHARS`, used by every
 * pattern below. Two spellings of it drift, and the drift shows up as a
 * trigger that fires on a string the tests next door swear it refuses.
 */
// The trailing `-` stays last: anywhere else in a class it is a range.
const SKILL_TOKEN_INNER = 'a-zA-Z0-9._:-'
const SKILL_TOKEN_CHARS = `[${SKILL_TOKEN_INNER}]`
const LOOKUP_AT_HEAD = new RegExp(`^/(${SKILL_TOKEN_CHARS}*)$`)
const LOOKUP_AFTER_SPACE = new RegExp(
  `[\\s。、？！]/(${SKILL_TOKEN_CHARS}*)$`,
)
const RESOLVED_HEAD_SKILL = new RegExp(`^/(${SKILL_TOKEN_CHARS}+)\\s`)

export function findSkillLookup(draft: string): SkillLookup | null {
  // A draft that already opens with a resolved skill is that skill's
  // arguments from the space onwards, and a slash inside arguments is
  // argument text — offering a second lookup there would put a menu over
  // a path the reader is typing for the skill to read.
  const head = RESOLVED_HEAD_SKILL.exec(draft)
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
 * The draft with the token span lifted out and the prose either side of it
 * kept. Picking a skill used to clear the field, which threw away the
 * sentence the reader was in the middle of writing; the badge replaces the
 * token, not the message.
 *
 * One space of the two that surrounded a mid-sentence token goes with it,
 * because the alternative is a message that reads "Hey can u  the goal
 * setting scenario" — a visible hole where the reader's word used to be.
 * A token at the end of the draft has nothing after it, so nothing is
 * collapsed and the space the reader typed before it survives.
 *
 * The span is any token span, not only a lookup's: the unrun-token notice
 * removes the token it offered through this same function.
 */
export function spliceSkillLookup(
  draft: string,
  span: { start: number; end: number },
): string {
  const before = draft.slice(0, span.start)
  const after = draft.slice(span.end)
  return /\s$/.test(before) && /^\s/.test(after)
    ? before + after.slice(1)
    : before + after
}

/** The bare spelling a token missed by: never resolved, only suggested. */
function findSkillByAlias(token: string): AgentSkillCommand | undefined {
  const t = token.toLowerCase()
  return AGENT_SKILL_COMMANDS.find((entry) => entry.aliases.includes(t))
}

/**
 * A skill a message NAMES but does not invoke — the token the reader typed,
 * the skill it points at, and whether it spelled the name or only an alias.
 */
export type UnrunSkillToken = {
  /** The token as typed, without its slash. */
  token: string
  /** The skill to run, or the closest match when the token only aliased one. */
  command: AgentSkillCommand
  matched: 'name' | 'alias'
  start: number
  end: number
}

/**
 * Every word-start slash token in the draft, wherever it sits. The lookup
 * next door gets its path safety free from the `$` anchor — a token that has
 * to be the last thing in the draft cannot have `/notes.md` behind it — and
 * this scan, which reads the whole draft, has to say so itself: without the
 * lookahead, "check /sb:audit/notes.md" stops the token at the slash,
 * resolves it, and offers to run the audit on a path.
 *
 * The lookahead forbids a token character as well as a slash, and that is
 * load-bearing rather than belt-and-braces: forbidding only the slash lets
 * the match BACKTRACK to a shorter token — "sb:audi" — which satisfies it and
 * leaves the scan reading tokens the reader never typed.
 */
const TOKEN_ENDS_HERE = `(?![/${SKILL_TOKEN_INNER}])`
const SKILL_TOKEN_ANYWHERE = new RegExp(
  `(?:^|[\\s。、？！])/(${SKILL_TOKEN_CHARS}+)${TOKEN_ENDS_HERE}`,
  'g',
)

/**
 * The first skill a draft names without invoking it — what the composer asks
 * about before sending prose that reads like a command.
 *
 * This is the failure the notice exists for: a reader wrote "/sb:audit the
 * goal setting scenario", it sent as prose, no skill loaded, and NOTHING said
 * so — so the agent improvised, and one real session spent four rounds
 * re-reading the same scenario before the turn died. Silence is the defect;
 * the token is not.
 *
 * A draft that already invokes returns null, because it runs. A token that
 * matches only an alias returns the canonical skill to OFFER — an alias
 * resolves nothing, and a mid-sentence mention that resolved itself would be
 * the silent skill run the naming rule exists to prevent.
 */
export function findUnrunSkillToken(draft: string): UnrunSkillToken | null {
  if (parseSkillDraft(draft)) return null
  for (const match of draft.matchAll(SKILL_TOKEN_ANYWHERE)) {
    const token = match[1]
    const command = findSkillByToken(token) ?? findSkillByAlias(token)
    if (!command?.content) continue
    // The match opens on the whitespace that qualified the slash, except at
    // the head of the draft where there is none.
    const start = match.index + match[0].length - token.length - 1
    return {
      token,
      command,
      matched: findSkillByToken(token) ? 'name' : 'alias',
      start,
      end: start + token.length + 1,
    }
  }
  return null
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
