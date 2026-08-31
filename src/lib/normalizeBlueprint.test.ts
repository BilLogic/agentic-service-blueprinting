import { describe, expect, it } from 'vitest'
import { normalizeBlueprint } from '@/lib/normalizeBlueprint'

describe('normalizeBlueprint', () => {
  it('does not put the retired links field back onto database cells', () => {
    const normalized = normalizeBlueprint({
      id: 'path-1',
      name: 'Happy path',
      path_type: 'happy',
      lanes: [{ id: 'lane-1', name: 'Customer', position: 0 }],
      path_steps: [{ position: 0, steps: { id: 'step-1', name: 'Arrive' } }],
      cells: [
        {
          id: 'cell-1',
          lane_id: 'lane-1',
          step_id: 'step-1',
          content: 'Ask for help',
        },
      ],
    })

    expect(normalized.cells[0]).not.toHaveProperty('links')
  })
})
