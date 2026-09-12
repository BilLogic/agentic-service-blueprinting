#!/usr/bin/env node
/**
 * A definition hangs off a BADGE, never off a label.
 *
 * Six panel labels carried one — `Status`, `Summary`, `Position`, `Paths`,
 * `Dependencies`, `Resources` — and every one of them is ordinary English in
 * a form. A reader who cannot guess what a field called Summary holds is not
 * helped by a sentence saying it holds a summary, and a definition on every
 * label teaches that hovering is worth doing about eleven times before it
 * teaches anything at all. What earns a definition is a word this app made up.
 *
 * A badge is the shape that word wears. It is one fact about the thing it
 * sits on, drawn from a vocabulary rather than typed by an author, and the
 * app already renders every such word that way — a path's kind, a cell's
 * status, a lane's stakeholder. So the rule is checkable rather than tasteful:
 * not "is this word jargon", which drifts on the next term somebody adds, but
 * "is the thing this definition is attached to a badge".
 *
 * THE SUBJECT IS THE RAW CARD, `DefinitionPopover`, AND NOT THE PAGE. A sweep
 * of `src/` for the classes a definition used to wear would need an exemption
 * for every legitimate underline in the app, and the classes are gone anyway.
 * `EntityDefinitionPopover` is deliberately NOT swept: its `kind` is
 * typed to `EntityKindTerm`, so its vocabulary is already finite and already
 * checked by the compiler, and it is the one surface allowed to hang off bare
 * text — the step and lane column headers on the board, which teach the words
 * before anything is opened.
 *
 * A PASS-THROUGH IS NOT A CALL SITE. A component whose popover wraps its own
 * `children` is building a definition surface for somebody else to use; it
 * cannot know what it will be handed and is not the place to decide. That
 * test is what keeps this check free of an exemption list: nothing is pardoned
 * by name, and a new wrapper is covered by the same sentence.
 *
 * WHAT IT CANNOT SEE: which WORD a definition is about. That a badge reading
 * `Social Media` gets no definition while `Live` keeps one is a fact about the
 * term maps, and it is the type system that holds it — `ENTITY_STATUS_MEANING`
 * is keyed by `EntityStatus` and `ENTITY_KIND_DEFINITIONS` by `EntityKindTerm`.
 * This guard checks the shape a definition hangs from, and trusts those keys
 * for what it says.
 *
 * Run: npm test
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { appFiles, readAppFile } from '../app-source.mjs'

const REPO_ROOT = process.cwd()
/** The card itself. Its own module declares the surface rather than using it. */
const CARD_MODULE = 'src/components/blueprint/DefinitionCard.tsx'

/**
 * Every `.tsx` of the application, wherever this tree keeps it, as `src/…`.
 *
 * A deployment reads the application out of
 * `node_modules/agentic-service-blueprinting` and has no `src` beside its
 * `scripts/`, so the walk that started at `resolve(REPO_ROOT, 'src')` swept
 * nothing there and reported it in green — a check that has stopped looking
 * prints the same line as one that looked and agreed. `appFiles` sweeps
 * whichever root holds the application and REFUSES an empty result, and the
 * paths it hands back stay `src/…` so `CARD_MODULE` is one string rather than
 * one per deployment.
 */
const applicationSources = () =>
  appFiles(
    REPO_ROOT,
    (path) => /\.tsx$/.test(path) && !/\.test\.tsx$/.test(path),
    '.tsx outside a test',
  )

/**
 * The `<Name …>` element starting at `index`, and everything it contains.
 *
 * Brace depth decides where the opening tag ends; tag depth decides where the
 * element does. A `>` inside `{a > b}` closes nothing, and a nested
 * `<DefinitionPopover>` would otherwise be closed by its child's tag.
 */
function elementAt(source, index, name) {
  let depth = 0
  let open = index + name.length + 1
  for (; open < source.length; open++) {
    const char = source[open]
    if (char === '{') depth += 1
    else if (char === '}') depth -= 1
    else if (char === '>' && depth === 0) break
  }
  if (source[open - 1] === '/') return { tag: source.slice(index, open + 1), body: '' }
  const closing = `</${name}>`
  const end = source.indexOf(closing, open)
  return {
    tag: source.slice(index, open + 1),
    body: end === -1 ? source.slice(open + 1) : source.slice(open + 1, end),
  }
}

/** Where each component in `source` is declared, in order. */
function components(source) {
  return [...source.matchAll(/^(?:export )?function (\w+)/gm)].map((match) => ({
    name: match[1],
    at: match.index,
  }))
}

/**
 * The component `index` falls inside, and its whole body.
 *
 * A COMPONENT and not the nearest binding. Three of the four sites build
 * their trigger into a local `const` first — `caption`, `labelText`,
 * `explain` — so a scan for the nearest declaration names the variable and
 * then looks for a badge inside it, which is the one place a badge could
 * never be. The question is what the component around it renders.
 */
function enclosing(source, index) {
  const all = components(source)
  const owner = all.filter((one) => one.at <= index).at(-1)
  if (!owner) return { name: '(top level)', body: source }
  const next = all.find((one) => one.at > owner.at)
  return {
    name: owner.name,
    body: source.slice(owner.at, next ? next.at : source.length),
  }
}

/**
 * `DefinitionPopover` uses in `source` that hang off something else's shape.
 *
 * A COMPONENT THAT COMPOSES CALLER-SUPPLIED `children` IS NOT JUDGED, and that
 * single test is what keeps this check free of a pardon list. Two shapes pass
 * it, for the same reason: `EntityDefinitionPopover` wraps whatever it is
 * handed, and `Field` wraps a form control and explains the input rather than
 * a word — "an app image path starting with /" is a instruction to an author,
 * not a definition of anything. Neither knows which word it is showing, so
 * neither is where the choice is made. A component that builds its own trigger
 * out of a word it holds has made that choice, and is checked here.
 */
export function definitionsNotOnABadge(source) {
  const findings = []
  const re = /<DefinitionPopover(?=[\s/>])/g
  let match
  while ((match = re.exec(source))) {
    const owner = enclosing(source, match.index)
    if (/\{\s*children\s*\}/.test(owner.body)) continue
    if (/<Badge(?=[\s/>])/.test(owner.body)) continue
    findings.push({
      line: source.slice(0, match.index).split('\n').length,
      owner: owner.name,
    })
  }
  return findings
}

test('every definition in the app hangs off a badge', () => {
  const walked = applicationSources()
  // The walk found FILES; this is what says it found the APPLICATION. A tree
  // with no `DefinitionCard.tsx` in it is not the tree this check is about,
  // however many components it has.
  assert.ok(
    walked.includes(CARD_MODULE),
    `${CARD_MODULE} is not among the ${walked.length} files walked, so this ` +
      `is not the application`,
  )
  const files = walked.filter((path) => path !== CARD_MODULE)

  const found = []
  for (const path of files) {
    const source = readAppFile(REPO_ROOT, path)
    for (const finding of definitionsNotOnABadge(source)) {
      found.push(`${path}:${finding.line}  ${finding.owner} explains a label`)
    }
  }

  assert.deepEqual(
    found,
    [],
    `A definition hangs off a badge naming a term, never off a label. ` +
      `Either the word earns a badge, or it does not need explaining:\n` +
      found.join('\n'),
  )
})

test('a wrapper that hands the surface on is not judged', () => {
  // `EntityDefinitionPopover` cannot know what it will be given, so it is not
  // where the choice is made. This is what keeps the check free of a pardon
  // list — the sentence covers the next wrapper too.
  const source = [
    'export function EntityDefinitionPopover({ kind, children }: Props) {',
    '  return (',
    '    <DefinitionPopover sections={sections}>',
    '      {children}',
    '    </DefinitionPopover>',
    '  )',
    '}',
  ].join('\n')
  assert.deepEqual(definitionsNotOnABadge(source), [])
})

test('a form field explains its input, and is not judged either', () => {
  // `Field` wraps a control and its hint tells an author what to type. That is
  // not a definition of a word, and it reaches the same exemption by the same
  // sentence: the component composes children and does not know what word, if
  // any, is in play.
  const source = [
    'export function Field({ label, hint, children }: Props) {',
    '  return (',
    '    <div>',
    '      <DefinitionPopover sections={[{ eyebrow: label, body: hint }]}>',
    '        {labelText}',
    '      </DefinitionPopover>',
    '      {children}',
    '    </div>',
    '  )',
    '}',
  ].join('\n')
  assert.deepEqual(definitionsNotOnABadge(source), [])
})

test('a label with a definition is named, with the component that drew it', () => {
  const source = [
    'export function PanelTermLabel({ term, definition }: Props) {',
    '  return (',
    '    <DefinitionPopover sections={[{ eyebrow: term, body: definition }]}>',
    '      <span>{term}</span>',
    '    </DefinitionPopover>',
    '  )',
    '}',
  ].join('\n')
  assert.deepEqual(definitionsNotOnABadge(source), [
    { line: 3, owner: 'PanelTermLabel' },
  ])
})

test('the same component with a badge instead is not a finding', () => {
  const source = [
    'export function PanelTermLabel({ term, definition }: Props) {',
    '  return (',
    '    <DefinitionPopover sections={[{ eyebrow: term, body: definition }]}>',
    '      <Badge variant="outline">{term}</Badge>',
    '    </DefinitionPopover>',
    '  )',
    '}',
  ].join('\n')
  assert.deepEqual(definitionsNotOnABadge(source), [])
})

test('one badge in a file does not pardon a label in the next component', () => {
  // `panelShell` holds both: `PanelKindBadge` explains a badge, and `Field`
  // explained its own label. A file-wide check passes that; the subject has to
  // be the component.
  const source = [
    'function Field({ label, hint }: Props) {',
    '  return (',
    '    <DefinitionPopover sections={[{ eyebrow: label, body: hint }]}>',
    '      <span>{label}</span>',
    '    </DefinitionPopover>',
    '  )',
    '}',
    'export function PanelKindBadge({ label }: Props) {',
    '  return (',
    '    <DefinitionPopover sections={sections}>',
    '      <Badge>{label}</Badge>',
    '    </DefinitionPopover>',
    '  )',
    '}',
  ].join('\n')
  assert.deepEqual(definitionsNotOnABadge(source), [{ line: 3, owner: 'Field' }])
})
