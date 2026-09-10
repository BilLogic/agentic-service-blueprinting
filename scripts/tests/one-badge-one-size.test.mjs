#!/usr/bin/env node
/**
 * A badge's size is decided in `ui/badge.tsx`, or at every call site at once.
 *
 * Every deviation this check was written against was a call-site override, and
 * several carried an `!` prefix. That prefix is the tell: it exists only to
 * beat the base variant's specificity, so each was written in isolation
 * against a shape someone else had already chosen. The result was three badge
 * sizes on one panel with no rule a reader could infer.
 *
 * `ui/badge.tsx` offers a `size` variant with four closed values. That does not
 * soften this check, it sharpens it: the sizes have a NAME to ask for, so a
 * class string written at a call site is no longer even the short way to a
 * shape. What is forbidden is a size CHOSEN where a badge is used rather than
 * where badges are defined, and a fifth shape is a decision made in
 * `ui/badge.tsx` beside the other four.
 *
 * THE SUBJECT IS WHAT A CALL SITE PASSES TO A BADGE, NOT A SWEEP FOR SIZE
 * UTILITIES. `text-2xs` is legal on any of the hundred spans that are not
 * badges, so a repository-wide sweep would need an exemption for each one —
 * "dozens of entries, each one a place to hide something real", as
 * `check-retired-identifiers` puts it. A className handed to `<Badge>` is a
 * subject that needs no exemptions.
 *
 * A BADGE IS NOT ONLY `<Badge>`. `PathLabelBadge`, `StatusBadge` and
 * `ScenarioTitleBadge` each take a `className` and hand it to `Badge`, so a
 * size passed to one of them lands on a badge just as surely — and two did.
 * Those wrappers are DISCOVERED rather than listed: a component that renders
 * `<Badge>` with its own `className` in the class expression is a badge call
 * site, and the next wrapper someone writes is covered on the day it is
 * written rather than the day somebody remembers this list.
 *
 * WHAT IT CANNOT SEE: a size that reaches a badge without being written at a
 * call site — through a shared constant, a `style` prop, or a wrapper that
 * renames `className` to something else on the way through. Those are worth
 * knowing about and none exist today; the check is not evidence they never
 * will.
 *
 * Run: npm test
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const REPO_ROOT = process.cwd()
const SOURCE_ROOT = 'src'

/** Where the geometry is allowed to be written down. */
const BADGE_COMPONENT = 'src/components/ui/badge.tsx'

/**
 * Tailwind utilities that set a badge's size: text size, padding, height.
 *
 * Colour is not size — `text-muted-foreground` and `text-primary` are the
 * commonest classes on a badge in this app and none of them is a finding.
 * That is why the text scale is spelled out rather than matched as `text-*`.
 */
const TEXT_SIZES = new Set([
  '3xs', '2xs', 'xs', 'sm', 'base', 'lg',
  'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl', '9xl',
])

/** `md:`, `group-hover:` and friends change WHEN a size applies, not whether. */
function utility(token) {
  return token.split(':').pop().replace(/^!/, '').replace(/!$/, '')
}

function isSizeUtility(token) {
  const name = utility(token)
  const text = /^text-(.+)$/.exec(name)
  if (text) return TEXT_SIZES.has(text[1]) || text[1].startsWith('[')
  return /^(p[xytrbl]?|h|min-h|max-h|size)-\S+$/.test(name)
}

function sourceFiles(dir) {
  const found = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) found.push(...sourceFiles(path))
    else if (/\.tsx$/.test(entry) && !/\.test\.tsx$/.test(entry)) found.push(path)
  }
  return found
}

/**
 * The opening tags of `<Name …>` in `source`, as `{ index, text }`.
 *
 * Brace depth decides where the tag ends, because a `>` inside `{a > b}` or a
 * nested element in a `render={…}` prop is not the end of anything.
 */
export function openingTags(source, name) {
  const found = []
  const re = new RegExp(`<${name}(?=[\\s/>])`, 'g')
  let match
  while ((match = re.exec(source))) {
    let depth = 0
    let i = match.index + name.length + 1
    for (; i < source.length; i++) {
      const char = source[i]
      if (char === '{') depth += 1
      else if (char === '}') depth -= 1
      else if (char === '>' && depth === 0) break
    }
    found.push({ index: match.index, text: source.slice(match.index, i + 1) })
  }
  return found
}

/**
 * The `className` prop's expression, or ''.
 *
 * The quoted form keeps its quotes: `className="text-3xs"` and
 * `className={cn('text-3xs')}` both have to come back as something with a
 * string literal in it, or the first spelling reads as having no classes at
 * all — which is how this check passed over four real overrides once.
 */
export function classExpression(tag) {
  const at = tag.indexOf('className=')
  if (at === -1) return ''
  let i = at + 'className='.length
  const opener = tag[i]
  if (opener === '"' || opener === "'") {
    const close = tag.indexOf(opener, i + 1)
    return close === -1 ? tag.slice(i) : tag.slice(i, close + 1)
  }
  if (opener !== '{') return ''
  let depth = 0
  for (let j = i; j < tag.length; j++) {
    if (tag[j] === '{') depth += 1
    else if (tag[j] === '}') {
      depth -= 1
      if (depth === 0) return tag.slice(i + 1, j)
    }
  }
  return tag.slice(i + 1)
}

/** Every whitespace-separated class named by a literal in `expression`. */
function classTokens(expression) {
  const literals = expression.match(/'[^']*'|"[^"]*"|`[^`$]*`/g) ?? []
  return literals.flatMap((literal) =>
    literal.slice(1, -1).split(/\s+/).filter(Boolean),
  )
}

/**
 * Components in `source` that hand their OWN `className` to a badge.
 *
 * `PathLabelBadge` is a badge for this check's purposes because whatever a
 * caller passes it lands on `Badge`'s class list unaltered.
 */
export function forwardingWrappers(source) {
  const names = []
  for (const tag of openingTags(source, 'Badge')) {
    if (!/(^|[^\w.])className([^\w:]|$)/.test(classExpression(tag.text))) continue
    const declarations = [
      ...source.slice(0, tag.index).matchAll(/export function (\w+)/g),
    ]
    const owner = declarations.at(-1)?.[1]
    if (owner && !names.includes(owner)) names.push(owner)
  }
  return names
}

/** Size utilities passed to `components` in `source`, as `{ line, text }`. */
export function sizeOverrides(source, components) {
  const findings = []
  for (const name of components) {
    for (const tag of openingTags(source, name)) {
      const sizes = classTokens(classExpression(tag.text)).filter(isSizeUtility)
      if (!sizes.length) continue
      findings.push({
        line: source.slice(0, tag.index).split('\n').length,
        text: `<${name}> is passed ${[...new Set(sizes)].join(' ')}`,
      })
    }
  }
  return findings.sort((a, b) => a.line - b.line)
}

test('no call site passes a badge its size', () => {
  const files = sourceFiles(resolve(REPO_ROOT, SOURCE_ROOT))
    .map((path) => path.slice(resolve(REPO_ROOT).length + 1))
    .filter((path) => path !== BADGE_COMPONENT)
  const sources = new Map(
    files.map((path) => [path, readFileSync(resolve(REPO_ROOT, path), 'utf8')]),
  )

  const components = ['Badge']
  for (const source of sources.values()) {
    for (const wrapper of forwardingWrappers(source)) {
      if (!components.includes(wrapper)) components.push(wrapper)
    }
  }

  const found = []
  for (const [path, source] of sources) {
    for (const finding of sizeOverrides(source, components)) {
      found.push(`${path}:${finding.line}  ${finding.text}`)
    }
  }

  assert.deepEqual(
    found,
    [],
    `A badge's size belongs to ${BADGE_COMPONENT} and nowhere else. Remove ` +
      `these, or ask for the shape by name — \`size=\"default\"\`, ` +
      `\`\"fitted\"\`, \`\"roomy\"\`, \`\"comfortable\"\`:\n` +
      found.join('\n'),
  )
})

test('a colour is not a size', () => {
  // The class that would break a careless `text-*` rule, and the reason the
  // text scale is enumerated: it is on more badges than any size ever was.
  const source =
    '<Badge variant="secondary" className="bg-foreground/5 text-muted-foreground" />'
  assert.deepEqual(sizeOverrides(source, ['Badge']), [])
})

test('each rejected utility is named', () => {
  // A failure that says "something is wrong" costs a bisect; one that says
  // `text-2xs px-1.5` is a diff.
  const source = '<Badge className="shrink-0 px-1.5 py-0 text-2xs" />'
  assert.deepEqual(sizeOverrides(source, ['Badge']), [
    { line: 1, text: '<Badge> is passed px-1.5 py-0 text-2xs' },
  ])
})

test('a breakpoint or a bang does not hide a size', () => {
  // Both spellings have existed here: `!text-3xs` to beat the variant, and
  // responsive prefixes elsewhere in the app. Neither changes what it sets.
  const source = '<Badge className="md:px-3 !text-3xs h-auto" />'
  assert.deepEqual(sizeOverrides(source, ['Badge']), [
    { line: 1, text: '<Badge> is passed md:px-3 !text-3xs h-auto' },
  ])
})

test('a size in a conditional branch is still a size', () => {
  // How the sprawl was actually written: a ternary, not a literal className.
  const source = [
    '<Badge',
    '  className={cn(',
    "    'max-w-full font-semibold',",
    "    compact ? 'h-5 px-2 py-0.5 text-xs' : 'h-auto px-2.5 py-1 text-sm',",
    '  )}',
    '/>',
  ].join('\n')
  assert.equal(sizeOverrides(source, ['Badge']).length, 1)
})

test('a wrapper that forwards className is a badge call site', () => {
  // The two overrides no `<Badge>`-only check could see: both were passed to a
  // wrapper, which handed them straight on.
  const wrapper = [
    'export function PathLabelBadge({ className }: Props) {',
    '  return <Badge className={cn(\'gap-1\', className)} />',
    '}',
  ].join('\n')
  assert.deepEqual(forwardingWrappers(wrapper), ['PathLabelBadge'])
  assert.equal(
    sizeOverrides('<PathLabelBadge className="text-base" />', [
      'Badge',
      'PathLabelBadge',
    ]).length,
    1,
  )
})

test('a wrapper that decides its own size forwards nothing', () => {
  // `BlueprintDividerBadge` takes no className, so its callers cannot resize
  // it and it is not a call site. Discovery has to tell the two apart.
  const wrapper = [
    'export function BlueprintDividerBadge({ label }: Props) {',
    "  return <Badge className={cn('uppercase')}>{label}</Badge>",
    '}',
  ].join('\n')
  assert.deepEqual(forwardingWrappers(wrapper), [])
})

test('a nested element in a prop does not end the tag', () => {
  // `StatusBadge` renders its badge inside `render={<Badge … />}`, so the tag
  // scanner has to survive a `>` that belongs to something else.
  const source = '<Tooltip render={<span />}><Badge className="text-sm" /></Tooltip>'
  assert.deepEqual(sizeOverrides(source, ['Badge']), [
    { line: 1, text: '<Badge> is passed text-sm' },
  ])
})
