import { mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import {
  pathsOn,
  readingIn,
  sourceOf,
  sourcesOn,
  surfaceOf,
} from '@/lib/sourceTree'

/**
 * The reading answers for the tree; a guard's own path does not.
 *
 * Every case here is about the seam rather than about a rule: what the
 * reading lists, how it narrows, and — the one this module exists for — what
 * a file that moved does to a guard that named its old path.
 */
describe('the reading of the application', () => {
  it('lists the tree relative to src, sorted, with nothing above it', () => {
    const paths = pathsOn()
    expect(paths.length).toBeGreaterThan(300)
    expect(paths.some((path) => path.startsWith('../'))).toBe(false)
    expect(paths.some((path) => path.startsWith('src/'))).toBe(false)
    expect([...paths].sort((a, b) => a.localeCompare(b))).toEqual([...paths])
    expect(paths).toContain('lib/sourceTree.ts')
  })

  it('narrows to a surface without narrowing what it can read', () => {
    const lib = pathsOn('lib')
    expect(lib.length).toBeGreaterThan(0)
    expect(lib.every((path) => path.startsWith('lib/'))).toBe(true)
    expect(lib).not.toContain('App.tsx')
    // Narrowed by surface, and still able to read any file the tree has.
    expect(sourceOf('App.tsx')).toContain('export')
  })

  it('answers which surface a path belongs to, most specific first', () => {
    expect(surfaceOf('components/editor/EditorShell.tsx')).toBe('editor')
    expect(surfaceOf('components/ui/input.tsx')).toBe('ui')
    expect(surfaceOf('components/EditorErrorBoundary.tsx')).toBe('components')
    expect(surfaceOf('lib/agent/tools/index.ts')).toBe('agent')
    expect(surfaceOf('lib/queryKeys.ts')).toBe('lib')
    expect(surfaceOf('App.tsx')).toBe('app')
  })

  it('hands back the text of a file it listed', () => {
    expect(sourceOf('lib/sourceTree.ts')).toContain('the reading')
    expect(sourcesOn('styles')).toEqual([])
    const sources = sourcesOn('lib')
    expect(sources.every((file) => !file.file.includes('.test.'))).toBe(true)
    expect(sources.some((file) => file.file === 'lib/queryKeys.ts')).toBe(true)
  })

  describe('a file that moved', () => {
    const root = mkdtempSync(join(tmpdir(), 'asb-reading-'))
    afterAll(() => rmSync(root, { recursive: true, force: true }))

    const write = (path: string, text: string) => {
      mkdirSync(join(root, 'src', path, '..'), { recursive: true })
      writeFileSync(join(root, 'src', path), text)
    }

    it('is caught by the reading, not by a guard naming its old path', () => {
      write('components/editor/Moved.tsx', 'export const moved = 1\n')
      write('App.tsx', 'export const app = 1\n')
      expect(readingIn(root).paths('editor')).toEqual([
        'components/editor/Moved.tsx',
      ])

      mkdirSync(join(root, 'src', 'lib'), { recursive: true })
      renameSync(
        join(root, 'src', 'components', 'editor', 'Moved.tsx'),
        join(root, 'src', 'lib', 'Moved.tsx'),
      )

      const moved = readingIn(root)
      expect(moved.paths('lib')).toEqual(['lib/Moved.tsx'])
      expect(moved.textOf('lib/Moved.tsx')).toBe('export const moved = 1\n')
      // The reading answers the move: it names where the file went, rather
      // than the bare ENOENT a hand-built relative path would raise.
      expect(() => moved.textOf('components/editor/Moved.tsx')).toThrow(
        /lib\/Moved\.tsx/,
      )
    })

    it('names the surface it swept when nothing stands for the path', () => {
      expect(() => readingIn(root).textOf('lib/NeverExisted.tsx')).toThrow(
        /lib surface/,
      )
    })
  })
})
