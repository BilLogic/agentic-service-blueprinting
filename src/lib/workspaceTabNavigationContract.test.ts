import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const editorShell = readFileSync(
  resolve(__dirname, '../components/editor/EditorShell.tsx'),
  'utf-8',
)

describe('workspace tab navigation contract', () => {
  it('enters from the cover and returns an active canvas to overview', () => {
    expect(editorShell).toMatch(
      /const goWorkspace = \(\) => \{[\s\S]*?if \(isLanding\) enterCanvas\(\)[\s\S]*?else goHome\(\)[\s\S]*?\n\s{2}\}/,
    )
  })

  it('gives the visible tab and agent command the same navigation action', () => {
    expect(editorShell).toContain('activateBase: goWorkspace,')
  })
})
