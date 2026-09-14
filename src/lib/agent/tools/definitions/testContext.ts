import type { ToolContext, ToolUi } from '@/lib/agent/tools/definition'
import { SCOPE_ALL } from '@/lib/agent/tools/serviceScope'

/**
 * A context a test builds by hand. Every field has an inert default, so a
 * test names only what its tool touches — a client for a read — and nothing
 * else exists to be mocked.
 *
 * Test support, not application code: the app builds its context in the
 * dispatcher from the live shells, and nothing in the app imports this.
 */

/** A canvas that does nothing and says so, for tools that never reach it. */
const inertUi: ToolUi = {
  openPhase: async (id) => `openPhase ${id}`,
  openScenario: async (id) => `openScenario ${id}`,
  focusCell: async (id) => `focusCell ${id}`,
  openCellPanel: async (id) => `openCellPanel ${id}`,
  setSidebar: (collapsed) => `setSidebar ${collapsed}`,
  annotateCells: (ids) => `annotateCells ${ids.join(',')}`,
  uiState: () => '',
}

export function fakeToolContext(overrides: Partial<ToolContext> = {}): ToolContext {
  return {
    client: null,
    scope: SCOPE_ALL,
    session: { id: 'test-session' },
    ui: inertUi,
    meaning: null,
    ...overrides,
  }
}
