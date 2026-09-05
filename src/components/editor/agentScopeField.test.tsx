// @vitest-environment jsdom
/*
 * The default-scope control on the creator's agent-settings surface. It shows
 * the saved default and reflects a change to it — the creator's choice of which
 * services the agent holds in scope by default.
 */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AgentScopeField } from '@/components/editor/AgentScopeField'
import { saveAgentSettings } from '@/lib/agent/settings'

beforeEach(() => {
  window.localStorage.clear()
  saveAgentSettings({ serviceScope: 'active' })
})
afterEach(cleanup)

describe('AgentScopeField', () => {
  it('shows the active-service default out of the box', () => {
    render(<AgentScopeField />)
    expect(screen.getByText('Scope')).toBeDefined()
    expect(screen.getByText('Active service')).toBeDefined()
  })

  it('reflects the creator widening the default to all services', () => {
    saveAgentSettings({ serviceScope: 'all' })
    render(<AgentScopeField />)
    expect(screen.getByText('All services')).toBeDefined()
    expect(screen.queryByText('Active service')).toBeNull()
  })
})
