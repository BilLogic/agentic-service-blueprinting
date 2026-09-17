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
 * the half-open span of the `/token` itself, so accepting can rewrite that
 * span and leave the prose around it exactly where it was.
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
 * Accepting from the menu COMPLETES the token where it sits, the way a shell
 * completion does: `Hey can u /sb:aud` becomes `Hey can u /sb:audit `, and the
 * prose either side of the span is not read, moved or trimmed.
 *
 * It does not remove the token, and that is the reversal. Accepting used to
 * lift the span out of the prose and render the skill as a badge in a row
 * above the field, which moved the reader's word to the front of the message
 * and lost the position they had typed it in — `asdasd /sb:audit` became
 * `[/sb:audit] asdasd`. The token IS the invocation now, so it stays in the
 * sentence and takes a colour instead.
 *
 * The trailing space earns its place twice: it closes the lookup, because a
 * token has to run to the end of the draft to be one and a space is outside
 * the token grammar, and it leaves the reader mid-sentence rather than
 * mid-word. Without it the menu reopens on the completed token and the next
 * Enter picks the same skill again instead of sending.
 *
 * No caret write goes with this. Setting a textarea's value leaves the caret
 * at the end of the text, and a lookup's span reaches the end of the draft,
 * so the end is where the reader was already typing.
 */
export function completeSkillToken(
  draft: string,
  span: { start: number; end: number },
  command: AgentSkillCommand,
): string {
  return `${draft.slice(0, span.start)}${command.label} ${draft.slice(span.end)}`
}

/** A token that resolves to a skill: which skill, and where in the draft. */
export type SkillTokenSpan = {
  command: AgentSkillCommand
  /** Half-open, over the `/token` including its slash. */
  start: number
  end: number
}

/**
 * Every word-start slash token in the draft, wherever it sits. The lookup
 * above gets its path safety free from the `$` anchor — a token that has to be
 * the last thing in the draft cannot have `/notes.md` behind it — and this
 * walk, which reads the whole draft, has to say so itself: without the
 * lookahead, "check /sb:audit/notes.md" stops the token at the slash,
 * resolves it, and colours a path segment as a skill that will run.
 *
 * The lookahead forbids a token character as well as a slash, and that is
 * load-bearing rather than belt-and-braces: forbidding only the slash lets
 * the match BACKTRACK to a shorter token — "sb:audi" — which satisfies it and
 * leaves the walk reading tokens the reader never typed.
 */
const TOKEN_ENDS_HERE = `(?![/${SKILL_TOKEN_INNER}])`
const SKILL_TOKEN_ANYWHERE = new RegExp(
  `(?:^|[\\s。、？！])/(${SKILL_TOKEN_CHARS}+)${TOKEN_ENDS_HERE}`,
  'g',
)

function* wordStartTokens(
  draft: string,
): Generator<{ token: string; start: number; end: number }> {
  for (const match of draft.matchAll(SKILL_TOKEN_ANYWHERE)) {
    const token = match[1]
    // The match opens on the whitespace that qualified the slash, except at
    // the head of the draft where there is none.
    const start = match.index + match[0].length - token.length - 1
    yield { token, start, end: start + token.length + 1 }
  }
}

/**
 * Every token in the draft that names a skill, in the order they appear.
 *
 * THE TEXT IS THE ONLY RECORD of the skills a message carries — no badge, no
 * draft field and no component state holds a pick any more — so this one walk
 * answers both questions the composer asks of a draft: which spans to colour,
 * and which skills the send runs. One source cannot disagree with itself, and
 * the pair that preceded it did: a badge could outlive the token that made it
 * and a token could sit in the prose with no badge beside it.
 */
export function findSkillTokens(draft: string): SkillTokenSpan[] {
  const spans: SkillTokenSpan[] = []
  for (const { token, start, end } of wordStartTokens(draft)) {
    const command = findSkillByToken(token)
    if (command?.content) spans.push({ command, start, end })
  }
  return spans
}

/**
 * What the message says BESIDES the skills it names — the draft with every
 * resolved token taken out. Not what sends: the token stays in the text that
 * goes to the model, because that is what the reader wrote. This answers the
 * narrower question of whether a draft is a sentence at all, so that a draft
 * which is nothing but a skill name can be sent as a plain instruction
 * instead of as the bare token.
 *
 * Backwards through the spans, so each slice is taken at an offset the
 * earlier ones have not moved yet.
 */
export function draftWithoutSkillTokens(draft: string): string {
  return findSkillTokens(draft)
    .reduceRight(
      (text, span) => text.slice(0, span.start) + text.slice(span.end),
      draft,
    )
    .trim()
}
