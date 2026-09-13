import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { KEY_PREFIXES, STRUCTURE_KEYS, queryKeys } from '@/lib/queryKeys'

/*
 * One builder for every key. A read that built its key by hand and a write
 * that invalidated one by hand could spell the same cache two ways, and did:
 * the guard here is what keeps a third spelling from coming back.
 */

const SRC = new URL('..', import.meta.url).pathname

function* sourceFiles(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) yield* sourceFiles(path)
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) yield path
  }
}

/**
 * The files that read or invalidate the cache — the ones that could spell a
 * key: through the hook, through the cache module, or through TanStack
 * directly. A table that shares a key's name (`stakeholders`) or a view-state
 * namespace that shares a family's (`slice:` tab keys) is not a cache key,
 * so a file that touches none of the three is not scanned.
 */
const CACHE_MODULES =
  /from '(?:@\/lib\/queryClient|@\/hooks\/useSupabaseQuery|@tanstack\/react-query)'/

/** Source with its comments and table names removed — either may name a key in prose. */
function code(path: string): string {
  return readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/\.from\(['"][a-z_]+['"]\)/g, '.from()')
}

describe('the query key builder', () => {
  it('is the only place a key prefix is spelled', () => {
    const prefixes = KEY_PREFIXES.map((prefix) => prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    const literal = new RegExp(`['"\`](?:${prefixes.join('|')})`)
    const offenders: string[] = []
    for (const path of sourceFiles(SRC)) {
      if (path.endsWith('/lib/queryKeys.ts')) continue
      const source = code(path)
      if (!CACHE_MODULES.test(source)) continue
      const match = source.match(literal)
      if (match) offenders.push(`${path.slice(SRC.length)}: ${match[0]}`)
    }
    expect(offenders).toEqual([])
  })

  it('gives every family a prefix its members start with', () => {
    for (const entry of Object.values(queryKeys)) {
      if (typeof entry === 'string') continue
      const sample =
        entry === queryKeys.serviceSpec
          ? entry.of('x', true)
          : entry === queryKeys.sliceScenario
            ? entry.of(['b', 'a'])
            : (entry.of as (id: string) => string)('x')
      expect(sample.startsWith(entry.prefix)).toBe(true)
    }
  })

  it('has no two prefixes where one is a prefix of another', () => {
    // `slice:` and `slices:` are distinct because the colon ends the name;
    // a bare prefix that another starts with would make every invalidation
    // of the short one sweep the long one too.
    for (const a of KEY_PREFIXES)
      for (const b of KEY_PREFIXES) if (a !== b) expect(b.startsWith(a)).toBe(false)
  })

  it('derives the structural set from the builder', () => {
    for (const key of STRUCTURE_KEYS) expect(KEY_PREFIXES).toContain(key)
    expect(STRUCTURE_KEYS).toContain(queryKeys.servicePhases.prefix)
    expect(STRUCTURE_KEYS).toContain(queryKeys.canvasBlueprints.prefix)
    expect(STRUCTURE_KEYS).toContain(queryKeys.slice.prefix)
  })
})
