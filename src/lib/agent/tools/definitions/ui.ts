import { z } from 'zod'
import { defineTool } from '@/lib/agent/tools/definition'

/**
 * The interface, read. Two reads that report what the canvas is doing and
 * which controls exist right now; they touch neither the canvas nor a row.
 * The calls that DRIVE the canvas are `interface.ts`.
 */

/**
 * What `get_ui_state` says when no shell is reporting. Exported because the
 * eval harness, which has no shell at all, answers the same tool and must
 * answer it in these words rather than in a copy of them.
 */
export const NO_UI_STATE = 'No UI state is being reported right now.'

export const getUiStateTool = defineTool({
  name: 'get_ui_state',
  description:
    'What the user is looking at RIGHT NOW: view level, selected phase/scenario, active tab, open cell panel, Design-mode selection. Call after navigating, or whenever "this/here/what I selected" needs grounding. When the user asks what they are looking at, relay EVERY line — view level included, not just the selection.',
  surface: 'read',
  args: z.object({}),
  availability: { sample: true, mobile: true },
  run: async (_args, ctx) => ctx.ui.uiState() || NO_UI_STATE,
})

export const listUiCommandsTool = defineTool({
  name: 'list_ui_commands',
  description:
    'The LIVE list of UI controls you can drive right now (panel tabs, zoom, compare toggle, presentation, undo, …). Commands appear/disappear with the surfaces that own them — list before ui_command when unsure what exists.',
  surface: 'read',
  args: z.object({}),
  // Not offered on mobile, whose shell owns none of the desktop surfaces
  // these commands drive, and not in the trial's roster either.
  availability: { sample: false, mobile: false },
  run: async (_args, ctx) => ctx.ui.listCommands(),
})
