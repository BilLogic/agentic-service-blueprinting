import { afterEach, describe, expect, it } from 'vitest'
import { agentFocusCell } from '@/lib/agent/uiBridge'
import { registerActiveFocusCells } from '@/lib/canvasFocusCells'

let cleanup: (() => void) | null = null

afterEach(() => {
  cleanup?.()
  cleanup = null
})

describe('agent camera bridge', () => {
  it('reports a real completed focus', async () => {
    cleanup = registerActiveFocusCells(async () => ({
      kind: 'flown',
      completion: 'completed',
    }))
    await expect(agentFocusCell('cell-1')).resolves.toContain('Focused')
  })

  it('does not claim a miss or cancellation landed', async () => {
    cleanup = registerActiveFocusCells(async () => ({
      kind: 'miss',
      missing: ['cell-1'],
    }))
    await expect(agentFocusCell('cell-1')).resolves.toContain('not on the active canvas')

    cleanup()
    cleanup = registerActiveFocusCells(async () => ({
      kind: 'flown',
      completion: 'cancelled',
    }))
    await expect(agentFocusCell('cell-1')).resolves.toContain('cancelled')
  })

  it('resolves the current registration at invocation time', async () => {
    const removeOld = registerActiveFocusCells(async () => ({
      kind: 'miss',
      missing: ['cell-1'],
    }))
    cleanup = registerActiveFocusCells(async () => ({
      kind: 'flown',
      completion: 'completed',
    }))
    removeOld()
    await expect(agentFocusCell('cell-1')).resolves.toContain('Focused')
  })
})
