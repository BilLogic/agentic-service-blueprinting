/**
 * The app says what a phase, a scenario, a path, a step, a lane and a
 * service IS, and it says it somewhere a phone can reach.
 *
 * The ticket asked for a guard that an entity kind without a definition fails.
 * That is the first of the two here, and it is the smaller one. The second is
 * the one worth having: **a definition is never on a `Tooltip`.**
 *
 * Base UI's tooltip opens on hover and on focus and on nothing else — its
 * hover interaction is `mouseOnly` and it has no press to fall back on — so
 * every definition this app owned was invisible on the phone posture it
 * actually ships (`useMobileShell`, a full-width bottom sheet). Six
 * `PanelTermLabel` sites, every `PanelKindBadge description=`, the owner hint,
 * and all three path/scenario/phase descriptions were dead there, and nothing
 * said so. Six fixes are worth less than the test that catches the seventh.
 *
 * Neither guard is a snapshot of today's tree. The first reads the kind union
 * from `EntityDetailContext` rather than a list written here, so a seventh
 * entity kind fails until it defines itself. The second reads every
 * `<Tooltip>` element in `src`, so the next one is in the subject whatever
 * file it is written in.
 *
 * Both are proved to go red: a check that is green against this tree could
 * equally be a check that examines nothing.
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const ROOT = resolve(new URL('../..', import.meta.url).pathname)
const SRC = resolve(ROOT, 'src')

/* --------------------------------------------------------------- the tree */

/** Comments removed, verbatim from `scripts/tests/badge-and-tag.test.mjs`. */
export function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    // A vanished entry is skipped — see `appSources` for whose file it is and
    // why it vanishes mid-walk.
    let directory
    try {
      directory = statSync(path).isDirectory()
    } catch {
      return []
    }
    if (directory) return walk(path)
    if (!/\.tsx?$/.test(entry)) return []
    return [path]
  })
}

/**
 * Every TypeScript source under `src`, comments stripped.
 *
 * A file listed by the walk and gone by the time it is read is SKIPPED, not
 * thrown on. A test that writes a probe component under `src/` and deletes it
 * again, to prove its own check goes red, runs in parallel with this one — so
 * the walk can see a path that no longer exists. The subject is every file
 * that IS there.
 */
export function appSources() {
  return walk(SRC)
    .map((path) => {
      try {
        return {
          file: relative(ROOT, path).split('\\').join('/'),
          code: stripComments(readFileSync(path, 'utf8')),
        }
      } catch {
        return null
      }
    })
    .filter((one) => one !== null)
    .sort((a, b) => a.file.localeCompare(b.file))
}

const read = (path) => stripComments(readFileSync(resolve(ROOT, path), 'utf8'))

/* ------------------------------------- 1. every kind defines itself */

/**
 * The entity kinds a panel can be opened on, read from the union itself.
 *
 * Not a list retyped here. A seventh kind added to `EntityDetailKind` is a
 * seventh thing a reader can open and not understand, and it should fail this
 * file on the commit that adds it rather than on the day somebody notices.
 */
export function entityDetailKinds(source) {
  const union = /export type EntityDetailKind =([\s\S]*?)\n\n/.exec(source)
  if (!union) return []
  return [...union[1].matchAll(/'([a-z_]+)'/g)].map((match) => match[1])
}

/** `ENTITY_KIND_DEFINITIONS`, as `{ kind: definition }`. */
export function entityKindDefinitions(source) {
  const block = /export const ENTITY_KIND_DEFINITIONS = \{([\s\S]*?)\n\} as const/.exec(
    source,
  )
  if (!block) return {}
  const out = {}
  for (const entry of block[1].split(/\n  (?=[a-z_]+: \{)/)) {
    const kind = /^\s*([a-z_]+): \{/.exec(entry)
    if (!kind) continue
    const definition = /definition:\s*\n?\s*'((?:[^'\\]|\\.)*)'/.exec(entry)
    out[kind[1]] = definition ? definition[1] : ''
  }
  return out
}

/**
 * A kind whose definition is missing, empty, or too short to be one.
 *
 * The length floor is the whole point of the check. `label: 'Lane'` with
 * `definition: 'A lane.'` would satisfy a presence test and answer nothing,
 * which is the failure this guards against — the app had the WORD everywhere and the
 * meaning nowhere.
 */
export function kindsWithoutDefinition(kinds, definitions) {
  return kinds.flatMap((kind) => {
    const definition = definitions[kind]
    if (definition === undefined) return [`${kind} — no ENTITY_KIND_DEFINITIONS entry`]
    if (definition.trim().length < 40) {
      return [`${kind} — definition is ${definition.trim().length} characters, which is a label, not a definition`]
    }
    return []
  })
}

/**
 * The labels on the board, and the component that carries each one's definition.
 *
 * The canvas title is NOT one of them. It was until a kind badge went beside
 * it, and the rule is that a definition hangs off a badge and never
 * off a label — so the anchor for service, phase and scenario is the badge in
 * the identity bar, and the title is a name and nothing else.
 */
const ANCHORS = {
  'src/components/blueprint/EntityHeader.tsx': "service, phase and scenario — the identity bar's kind badge",
  'src/components/blueprint/ScenarioTitleBadge.tsx': 'phase and scenario — the frame and panel labels',
  'src/components/blueprint/PathLabelBadge.tsx': 'path — the band, column and cell label',
  'src/components/blueprint/LaneHeaderAffordance.tsx': 'lane — the row header',
  'src/components/blueprint/StepHeaderAffordance.tsx': 'step — the column header',
}

/** An anchor that renders no definition popover — a label back to saying nothing. */
export function anchorsWithoutPopover(sources) {
  return Object.entries(ANCHORS).flatMap(([file, what]) => {
    const source = sources.find((one) => one.file === file)
    if (!source) return [`${file} is gone — ${what} has nowhere to hang its definition`]
    if (!/<EntityDefinitionPopover\b/.test(source.code)) {
      return [`${file} renders no <EntityDefinitionPopover> — ${what}`]
    }
    return []
  })
}

/** Every `<EntityDefinitionPopover>` that was not told which kind it explains. */
export function popoversWithoutKind(sources) {
  const out = []
  for (const { file, code } of sources) {
    for (const match of code.matchAll(/<EntityDefinitionPopover\b([^>]*)>/g)) {
      if (!/\bkind[=\s]/.test(match[1])) {
        out.push(`${file} — <EntityDefinitionPopover> with no kind=`)
      }
    }
  }
  return out
}

test('every entity kind a panel opens on defines itself', () => {
  const kinds = entityDetailKinds(read('src/contexts/EntityDetailContext.tsx'))
  // The extraction, asserted before its result is trusted: a regex that found
  // nothing would pass this test as loudly as a tree that is complete.
  assert.deepEqual(
    kinds.sort(),
    ['lane', 'phase', 'scenario', 'service', 'step'],
    'EntityDetailKind was not read — the union changed shape, so this guard is reading nothing',
  )
  const definitions = entityKindDefinitions(read('src/lib/panelTerms.ts'))
  assert.ok(
    Object.keys(definitions).length >= 6,
    `ENTITY_KIND_DEFINITIONS was not read — found ${Object.keys(definitions).length} entries`,
  )
  // `path` is the sixth anchor and the one that is not a panel: it is a label
  // on the board with no `EntityDetailKind` of its own, so it is named here.
  const found = kindsWithoutDefinition([...kinds, 'path'], definitions)
  assert.deepEqual(
    found,
    [],
    'An entity kind names itself on the board and says nothing about what it is. ' +
      'A reader who does not know what a lane is has the question ' +
      'while looking at the board, and every panel answers "what is in this one" ' +
      `instead:\n${found.join('\n')}`,
  )
})

test('every label on the board that names a kind carries its definition', () => {
  const sources = appSources()
  const missing = [...anchorsWithoutPopover(sources), ...popoversWithoutKind(sources)]
  assert.deepEqual(
    missing,
    [],
    'Six placements, no exemptions — a definition hangs off the entity\'s own ' +
      `label on the board:\n${missing.join('\n')}`,
  )
})

test('the definition check goes red on a kind that only names itself', () => {
  const definitions = {
    lane: 'One row of the board: a kind of participant, or a place the work happens.',
    step: 'A step.',
  }
  assert.deepEqual(kindsWithoutDefinition(['lane', 'step', 'phase'], definitions), [
    'step — definition is 7 characters, which is a label, not a definition',
    'phase — no ENTITY_KIND_DEFINITIONS entry',
  ])
})

test('the anchor check goes red on a label that stops explaining itself', () => {
  const planted = [
    {
      file: 'src/components/blueprint/EntityHeader.tsx',
      code: '<Badge>{term.label}</Badge>',
    },
    {
      file: 'src/components/blueprint/PathLabelBadge.tsx',
      code: '<EntityDefinitionPopover description={d}>{badge}</EntityDefinitionPopover>',
    },
  ]
  assert.deepEqual(anchorsWithoutPopover(planted), [
    'src/components/blueprint/EntityHeader.tsx renders no <EntityDefinitionPopover> — service, phase and scenario — the identity bar\'s kind badge',
    'src/components/blueprint/ScenarioTitleBadge.tsx is gone — phase and scenario — the frame and panel labels has nowhere to hang its definition',
    'src/components/blueprint/LaneHeaderAffordance.tsx is gone — lane — the row header has nowhere to hang its definition',
    'src/components/blueprint/StepHeaderAffordance.tsx is gone — step — the column header has nowhere to hang its definition',
  ])
  assert.deepEqual(popoversWithoutKind(planted), [
    'src/components/blueprint/PathLabelBadge.tsx — <EntityDefinitionPopover> with no kind=',
  ])
})

/* --------------------------------- 2. a definition is never on a tooltip */

/**
 * Every `<Tooltip>…</Tooltip>` in the app, with its trigger and its content.
 *
 * Element-shaped rather than a list of files, because the rule is about what a
 * tooltip may carry and the next one will be written somewhere this list has
 * never heard of.
 */
export function tooltipBlocks(sources) {
  const out = []
  for (const { file, code } of sources) {
    for (const match of code.matchAll(/<Tooltip(?:\s[^>]*)?>([\s\S]*?)<\/Tooltip>/g)) {
      const body = match[1]
      const content = /<TooltipContent(?:\s[^>]*)?>([\s\S]*?)<\/TooltipContent>/.exec(body)
      out.push({
        file,
        line: code.slice(0, match.index).split('\n').length,
        trigger: body.slice(0, body.indexOf('<TooltipContent') + 1 || body.length),
        content: content ? content[1] : '',
      })
    }
  }
  return out
}

/**
 * What a definition looks like when it is being handed to a tooltip.
 *
 * Named identifiers, not prose: `PANEL_TERMS` and `ENTITY_KIND_DEFINITIONS`
 * are where this app's definitions live, and `definition`/`hint` are what the
 * props carrying them are called.
 */
const READS_AS_DEFINITION =
  /\b(PANEL_TERMS|ENTITY_KIND_DEFINITIONS|definition|describeLaneRole)\b|\{\s*hint\s*\}/

/**
 * A trigger that already has a job of its own, where a tooltip IS the label.
 *
 * The doctrine's one correct tooltip case, and the exemption has to be narrow
 * or it swallows the rule: an icon-only button, a tab, a menu item. Their
 * press already means something — switch to this tab, run this tool — so a
 * press cannot also mean "explain", and the tooltip is an elaboration of the
 * control's own label rather than the app's answer to what a word means. A
 * bare `<span>` has no such excuse, and that is where every definition this
 * ticket found was hiding.
 */
const TRIGGER_IS_A_CONTROL =
  /<(?:TabsTrigger|Button|MenubarTrigger|DropdownMenuTrigger|ToggleGroupItem|button)\b/

/** Definitions on a tooltip, which is a definition no phone can reach. */
export function definitionsOnTooltips(blocks) {
  return blocks.flatMap((block) => {
    if (!READS_AS_DEFINITION.test(block.content)) return []
    if (TRIGGER_IS_A_CONTROL.test(block.trigger)) return []
    return [`${block.file}:${block.line} — ${block.content.trim().split('\n')[0]}`]
  })
}

test('no definition is on a tooltip', () => {
  const blocks = tooltipBlocks(appSources())
  /*
    The extraction, asserted before its result is trusted — and asserted as an
    INVARIANT rather than a count.

    It was `blocks.length > 15`, which is a census: it says how many tooltips
    the app happened to have on the day it was written, so retiring one is
    indistinguishable from breaking the regex. One change retired two — `StatusBadge`
    and the divider rail label, both of which carried definitions — and the
    floor failed for exactly the reason the ticket existed. What has to hold is
    that the extraction still FINDS tooltips, in the file whose entire subject
    is one and somewhere outside it.
  */
  const files = new Set(blocks.map((block) => block.file))
  assert.ok(
    files.has('src/components/editor/IconTooltip.tsx'),
    'the extraction found no <Tooltip> in IconTooltip.tsx, which is nothing but one — it is reading the wrong shape',
  )
  assert.ok(
    files.size > 1,
    'every <Tooltip> the extraction found is in one file — it is reading the wrong shape',
  )
  const found = definitionsOnTooltips(blocks)
  assert.deepEqual(
    found,
    [],
    'A definition is behind a tooltip. Base UI tooltips never open on touch — ' +
      'they are hover and focus only — and this app has a phone posture, so a ' +
      'definition put there is invisible to exactly the reader who most needs it. ' +
      "Use a Popover with `openOnHover` (see Field's hint, " +
      `EntityDefinitionPopover):\n${found.join('\n')}`,
  )
})

test('the tooltip check goes red on a definition put back behind one', () => {
  const planted = [
    {
      file: 'src/components/blueprint/Planted.tsx',
      code: [
        '<Tooltip>',
        '  <TooltipTrigger render={<span />} />',
        '  <TooltipContent>{PANEL_TERMS.evidence}</TooltipContent>',
        '</Tooltip>',
        '<Tooltip>',
        '  <TooltipTrigger render={<span />} />',
        '  <TooltipContent>{definition}</TooltipContent>',
        '</Tooltip>',
      ].join('\n'),
    },
  ]
  assert.deepEqual(definitionsOnTooltips(tooltipBlocks(planted)), [
    'src/components/blueprint/Planted.tsx:1 — {PANEL_TERMS.evidence}',
    'src/components/blueprint/Planted.tsx:5 — {definition}',
  ])
})

test('the tooltip check leaves an icon-only control’s label alone', () => {
  // The distinction, stated as a passing case. A tooltip on a button that
  // already does something is that button's LABEL, which is the one case the
  // doctrine keeps tooltips for.
  const quiet = [
    {
      file: 'src/components/editor/Quiet.tsx',
      code: [
        '<Tooltip>',
        '  <TooltipTrigger render={<Button />} />',
        '  <TooltipContent>{definition}</TooltipContent>',
        '</Tooltip>',
        '<Tooltip>',
        '  <TooltipTrigger render={<span />} />',
        '  <TooltipContent>{label}</TooltipContent>',
        '</Tooltip>',
      ].join('\n'),
    },
  ]
  assert.deepEqual(definitionsOnTooltips(tooltipBlocks(quiet)), [])
})

test('the tree the tooltip check reads is the tree, not a handful of files', () => {
  const sources = appSources()
  assert.ok(sources.length > 200, `only ${sources.length} source files found under src`)
  for (const root of ['components/blueprint/', 'components/editor/', 'components/ui/', 'lib/']) {
    assert.ok(
      sources.some((one) => one.file.startsWith(`src/${root}`)),
      `src/${root} is not in the subject`,
    )
  }
})
