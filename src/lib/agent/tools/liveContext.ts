import { setSharedCanvasMode } from '@/contexts/canvasModeContext'
import { invalidateQueries } from '@/hooks/useSupabaseQuery'
import { attributedTo } from '@/lib/authoringSession'
import {
  agentUiCommandMutates,
  listAgentUiCommands,
  runAgentUiCommand,
} from '@/lib/agent/uiCommands'
import {
  agentAnnotateCells,
  agentFocusCell,
  agentOpenCellPanel,
  agentOpenPhase,
  agentOpenScenario,
  agentSetSidebar,
  collectAgentUiContext,
} from '@/lib/agent/uiBridge'
import type { ToolSession, ToolUi } from '@/lib/agent/tools/definition'

/**
 * The live half of a tool's context: the canvas the shells registered, and
 * the session's place on the authoring ledger. This is the ONE module that
 * knows the bridge, the command registry, the canvas-mode store and the
 * ledger's attribution by name; a tool sees them only as `ctx.ui` and
 * `ctx.session`, and a test hands it something else.
 */

export const liveUi: ToolUi = {
  openPhase: agentOpenPhase,
  openScenario: agentOpenScenario,
  focusCell: agentFocusCell,
  openCellPanel: agentOpenCellPanel,
  setSidebar: agentSetSidebar,
  setCanvasMode: setSharedCanvasMode,
  annotateCells: agentAnnotateCells,
  uiState: collectAgentUiContext,
  listCommands: listAgentUiCommands,
  commandMutates: agentUiCommandMutates,
  runCommand: runAgentUiCommand,
}

export function liveSession(id: string): ToolSession {
  return {
    id,
    async attributed(work) {
      try {
        return await attributedTo(id, work)
      } finally {
        // The canvas reads through the shared query cache; the empty prefix
        // matches every key, so the grids refetch and repaint after a write.
        invalidateQueries('')
      }
    },
  }
}
