import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { classLists, type ClassListSite } from '@/lib/classList'
import { sourceFiles } from '@/lib/tokenModel'

/**
 * #545: the cover, the mobile shell, the error boundary, and the shared
 * style helpers land on the new ladder. ADR 0012.
 *
 * The reader is `classLists` — a quoted-string search misses a token split
 * across `cn()` arguments. #537 retired the panel role layer, so these
 * surfaces name no rung below `xs`.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const SRC = resolve(HERE, '..')

const SUB_XS = /(?:^|:)text-(?:2xs|3xs|4xs|5xs)$/
const BELOW_SM = /(?:^|:)text-(?:xs|2xs|3xs|4xs|5xs)$/
const ARBITRARY_SIZE = /(?:^|:)text-\[[^\]]+\]$/
const TYPE_RUNG =
  /(?:^|:)text-(?:xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|2xs|3xs|4xs|5xs)$/
const MUTED = /(?:^|:)text-muted-foreground(?:\/|$)/
const FOREGROUND = /(?:^|:)text-foreground(?:\/|$)/
const ICON_BOX = /(?:^|:)size-/

/**
 * Whether `file` is in this migration batch.
 *
 * @param file - path relative to `src`
 */
function inScope(file: string): boolean {
  return (
    file.startsWith('components/cover/') ||
    file.startsWith('components/mobile/') ||
    file === 'components/EditorErrorBoundary.tsx' ||
    file === 'lib/filterToolbarButton.ts'
  )
}

/**
 * Whether `file` is cover source — the display surface whose floor is `sm`.
 *
 * @param file - path relative to `src`
 */
function isCover(file: string): boolean {
  return file.startsWith('components/cover/')
}

/**
 * Class-list sites in this batch.
 *
 * @param sites - the tree-wide census
 */
function scopedSites(sites: readonly ClassListSite[]): ClassListSite[] {
  return sites.filter((site) => inScope(site.file))
}

/**
 * Format a site so a failure names the file, the line, and the classes.
 *
 * @param site - one class list
 */
function describeSite(site: ClassListSite): string {
  return `${site.file}:${site.line}: ${site.classes.join(' ')}`
}

/**
 * True when the site is an icon box (a `size-*`) with no type rung — not
 * cover text, so muted ink on the glyph is not muted-only stage copy.
 *
 * @param classes - utilities on the site
 */
function isIconOnly(classes: readonly string[]): boolean {
  return (
    classes.some((token) => ICON_BOX.test(token)) &&
    !classes.some((token) => TYPE_RUNG.test(token))
  )
}

/**
 * Raw source of a file under `src`, comments kept — surviving `leading-*`
 * has to be judged against the comment that names its geometry.
 *
 * @param file - path relative to `src`
 */
function rawSource(file: string): string {
  return readFileSync(resolve(SRC, file), 'utf8')
}

/**
 * Every `leading-*` in `file` whose line (or the comment immediately
 * above it) does not name the geometry that needs the override.
 *
 * @param file - path relative to `src`
 */
function uncommentedLeading(file: string): string[] {
  const lines = rawSource(file).split('\n')
  const offenders: string[] = []
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? ''
    // Authored classes, not a comment that names a leading the code no longer writes.
    if (/^\s*(?:\/\/|\*|\/\*)/.test(line)) continue
    if (
      !/['"`][^'"`]*\bleading-(?:none|tight|snug|normal|relaxed|loose|\d|\[)/.test(
        line,
      )
    ) {
      continue
    }
    const window = [lines[index - 2] ?? '', lines[index - 1] ?? '', line].join(
      '\n',
    )
    if (/\/[/*][\s\S]*geometry/i.test(window)) continue
    offenders.push(`${file}:${index + 1}: ${line.trim()}`)
  }
  return offenders
}

describe('authored classes on these surfaces', () => {
  it('name no rung below xs', { timeout: 20_000 }, () => {
    const offenders = scopedSites(classLists()).filter((site) =>
      site.classes.some(
        (token) => SUB_XS.test(token) || ARBITRARY_SIZE.test(token),
      ),
    )
    expect(offenders.map(describeSite), offenders.map(describeSite).join('\n')).toEqual(
      [],
    )
  })

  it('puts no cover text below sm, and none of it is muted-only', {
    timeout: 20_000,
  }, () => {
    const cover = scopedSites(classLists()).filter((site) => isCover(site.file))
    const belowSm = cover.filter((site) =>
      site.classes.some(
        (token) => BELOW_SM.test(token) || ARBITRARY_SIZE.test(token),
      ),
    )
    expect(belowSm.map(describeSite), belowSm.map(describeSite).join('\n')).toEqual(
      [],
    )

    const mutedOnly = cover.filter((site) => {
      if (isIconOnly(site.classes)) return false
      const muted = site.classes.some((token) => MUTED.test(token))
      const ink = site.classes.some((token) => FOREGROUND.test(token))
      return muted && !ink
    })
    expect(
      mutedOnly.map(describeSite),
      mutedOnly.map(describeSite).join('\n'),
    ).toEqual([])
  })

  it('comments every surviving leading-* with the geometry that needs it', () => {
    const files = sourceFiles()
      .map((file) => file.file)
      .filter(inScope)
    const offenders = files.flatMap(uncommentedLeading)
    expect(offenders, offenders.join('\n')).toEqual([])
  })
})
