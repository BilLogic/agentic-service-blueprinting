// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  resolvePathIdToOpen,
  resolvePathIdToShow,
  writeLastViewedPath,
} from '@/lib/pathMemory'
import { storageKey } from '@/lib/storageNamespace'
import type { PathKind } from '@/types/database'

/**
 * THE PATH MEMORY'S OWN COVERAGE — the rule, at the seam both surfaces call.
 *
 * These cases go through storage rather than around it, because the storage
 * read is half of what the callers stopped doing for themselves: a resolve
 * handed a pre-read value can be correct while a shell reads the wrong key
 * and neither test knows. What a reader sees for each of these answers is
 * pinned on the real shell in
 * `src/components/mobile/mobileShellPathMemory.test.tsx`; this file pins the
 * arithmetic, including the cases a phone is awkward to drive into — a
 * scenario with no paths, and storage that has been corrupted.
 *
 * THE FIXTURE PUTS THE VARIANT FIRST, ON PURPOSE. "Nothing remembered opens
 * on the happy path" is only a claim about the happy path if the happy path
 * is not also the first path in the list. With a happy-first list — which is
 * what the sample content the shell pins run on gives — the same case passes
 * for a resolve that returns `paths[0]`, and a fallback swapped to `paths[0]`
 * was watched leave every one of those green. Here the happy path is second,
 * so that swap reddens this file.
 *
 * Storage is cleared per case, not trusted in order: the keys are namespaced
 * and read straight off `localStorage` every time, so one case's remembered
 * path is the next case's starting state unless it is taken away.
 */

const path = (id: string, name: string, kind: PathKind = 'happy') => ({
  id,
  name,
  kind,
})

const PATHS = [
  path('p-variant', 'From someone else’s diagram', 'variant'),
  path('p-happy', 'From your documents', 'happy'),
]

beforeEach(() => window.localStorage.clear())
afterEach(() => window.localStorage.clear())

describe('the path a scenario opens on', () => {
  it('opens on the remembered path when that path still exists', () => {
    writeLastViewedPath('sc-1', 'p-variant')

    expect(resolvePathIdToOpen('sc-1', PATHS)).toBe('p-variant')
  })

  it('opens on the happy path when nothing is remembered', () => {
    expect(resolvePathIdToOpen('sc-1', PATHS)).toBe('p-happy')
  })

  it('falls back to the happy path when the remembered one is gone', () => {
    writeLastViewedPath('sc-1', 'p-deleted')

    expect(resolvePathIdToOpen('sc-1', PATHS)).toBe('p-happy')
  })

  it('remembers one path per scenario, not one for the phone', () => {
    writeLastViewedPath('sc-1', 'p-variant')
    writeLastViewedPath('sc-2', 'p-happy')

    expect(resolvePathIdToOpen('sc-1', PATHS)).toBe('p-variant')
    expect(resolvePathIdToOpen('sc-2', PATHS)).toBe('p-happy')
  })

  it('resolves to null for a scenario with no paths at all', () => {
    // The answer `openScenario` leans on: a scenario whose paths have not
    // arrived yet must resolve to nothing, so the caller holds the request
    // rather than selecting a path that does not exist.
    writeLastViewedPath('sc-1', 'p-variant')

    expect(resolvePathIdToOpen('sc-1', [])).toBeNull()
  })

  it('degrades to the happy path when storage holds something unreadable', () => {
    // Not a hypothetical: the key is shared with whatever else writes under
    // this namespace, and a half-written value has to read as "nothing
    // remembered" rather than take the selector down with it.
    window.localStorage.setItem(storageKey('mobile-paths'), '{not json')

    expect(resolvePathIdToOpen('sc-1', PATHS)).toBe('p-happy')
  })
})

describe('the path a surface shows', () => {
  it('an explicit selection beats the remembered path', () => {
    // The ordering the selector depends on: without it, a tap would be
    // overruled on the next render by the path remembered before the tap.
    writeLastViewedPath('sc-1', 'p-variant')

    expect(resolvePathIdToShow('sc-1', 'p-happy', PATHS)).toBe('p-happy')
  })

  it('falls through to the remembered path when nothing is selected yet', () => {
    writeLastViewedPath('sc-1', 'p-variant')

    expect(resolvePathIdToShow('sc-1', null, PATHS)).toBe('p-variant')
  })

  it('shows no path on the overview, where there is no scenario to show one for', () => {
    writeLastViewedPath('sc-1', 'p-variant')

    expect(resolvePathIdToShow(null, null, PATHS)).toBeNull()
  })
})
