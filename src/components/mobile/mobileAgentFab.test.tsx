// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MobileAgentFab } from '@/components/mobile/MobileAgentFab'

// Pins the read-only-tier rule from the canvas contract on its home: the
// FAB is the phone's ONLY agent entry, and viewers get none at all.

afterEach(cleanup)

describe('MobileAgentFab', () => {
  it('renders nothing when the session cannot run the agent', () => {
    render(<MobileAgentFab canAgent={false} onOpen={() => {}} />)
    expect(screen.queryByLabelText('Ask the agent')).toBeNull()
  })

  it('shows for agent-capable sessions and opens on tap', () => {
    const onOpen = vi.fn()
    render(<MobileAgentFab canAgent onOpen={onOpen} />)
    screen.getByLabelText('Ask the agent').click()
    expect(onOpen).toHaveBeenCalledTimes(1)
  })
})
