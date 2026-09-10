import { describe, expect, it } from 'vitest'
import {
  listAgentUiCommands,
  registerAgentUiCommand,
  runAgentUiCommand,
} from '@/lib/agent/uiCommands'

describe('agent UI command lifecycle', () => {
  it('does not let stale cleanup delete a replacement owner', async () => {
    const removeOld = registerAgentUiCommand({
      name: 'test_camera_owner',
      summary: 'old',
      run: () => 'old',
    })
    const removeCurrent = registerAgentUiCommand({
      name: 'test_camera_owner',
      summary: 'current',
      run: () => 'current',
    })

    removeOld()
    await expect(runAgentUiCommand('test_camera_owner')).resolves.toBe('current')
    expect(listAgentUiCommands()).toContain('test_camera_owner — current')

    removeCurrent()
    expect(listAgentUiCommands()).not.toContain('test_camera_owner')
  })
})
