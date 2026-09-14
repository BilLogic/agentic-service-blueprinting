import type { ToolDefinition } from '@/lib/agent/tools/definition'
import {
  compareBlueprintTool,
  getBlueprintTool,
  listBlueprintTool,
  listLanesTool,
  listOwnerTagsTool,
  measureDeletionImpactTool,
  searchBlueprintTool,
} from '@/lib/agent/tools/definitions/blueprint'
import { getCellTool, listCellDependenciesTool } from '@/lib/agent/tools/definitions/cells'
import { getEvidenceTool, listEvidenceTool } from '@/lib/agent/tools/definitions/evidence'
import { listFindingsTool } from '@/lib/agent/tools/definitions/findings'
import {
  annotateCellsTool,
  focusCellTool,
  openCellPanelTool,
  openPhaseTool,
  openScenarioTool,
  setCanvasModeTool,
  setSidebarTool,
  uiCommandTool,
} from '@/lib/agent/tools/definitions/interface'
import { getReferenceTool, listReferencesTool } from '@/lib/agent/tools/definitions/references'
import { getBusinessModelTool } from '@/lib/agent/tools/definitions/service'
import {
  getChangeHistoryTool,
  getSessionTool,
  listSessionsTool,
} from '@/lib/agent/tools/definitions/sessions'
import { getSliceTool, listSlicesTool } from '@/lib/agent/tools/definitions/slices'
import { listStakeholdersTool } from '@/lib/agent/tools/definitions/stakeholders'
import { getUiStateTool, listUiCommandsTool } from '@/lib/agent/tools/definitions/ui'

/**
 * Every tool that is a definition, in the order the model is offered them.
 * The list grows as the dispatcher's switch cases move here; a name present
 * in this list is run from it, and the switch never sees it.
 *
 * The check scripts that read tool names from source (`check:manifest`,
 * `check:read-surface`) read this folder alongside the spec table, so a
 * tool that moves here stays a tool they can see.
 */
export const TOOL_DEFINITIONS: readonly ToolDefinition[] = [
  getReferenceTool,
  listBlueprintTool,
  searchBlueprintTool,
  getBlueprintTool,
  compareBlueprintTool,
  getCellTool,
  listSlicesTool,
  getSliceTool,
  listOwnerTagsTool,
  listStakeholdersTool,
  listLanesTool,
  listReferencesTool,
  listCellDependenciesTool,
  listEvidenceTool,
  getEvidenceTool,
  getBusinessModelTool,
  listSessionsTool,
  getSessionTool,
  getUiStateTool,
  getChangeHistoryTool,
  listUiCommandsTool,
  measureDeletionImpactTool,
  listFindingsTool,
  // The interface: the calls that drive the canvas, in the order the model
  // was always offered them.
  openPhaseTool,
  openScenarioTool,
  focusCellTool,
  uiCommandTool,
  openCellPanelTool,
  setCanvasModeTool,
  setSidebarTool,
  annotateCellsTool,
]

const byName = new Map(TOOL_DEFINITIONS.map((tool) => [tool.name, tool]))

export function findToolDefinition(name: string): ToolDefinition | undefined {
  return byName.get(name)
}
