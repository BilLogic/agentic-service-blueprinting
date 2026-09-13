import { z } from 'zod'
import { arg, defineTool, defineWriteTool } from '@/lib/agent/tools/definition'
import { getCell, listCellDependencies } from '@/lib/agent/tools/read'
import { sampleGetCell, sampleListCellDependencies } from '@/lib/agent/tools/sampleRead'
import { setCellDependency } from '@/lib/authoringRpc'
import { getCellContentLengthGuidance } from '@/lib/cellContentLimits'
import {
  createCell,
  laneBudgetKind,
  readCellBeforeEdit,
  updateCellContent,
} from '@/lib/cellContentMutations'
import { updateCellSpec } from '@/lib/cellSpecMutations'

/**
 * The tools that act on a cell, grouped by the noun they act on the same
 * way the mutation modules are, so a tool and the write it performs sit one
 * import apart.
 */

export const getCellTool = defineTool({
  name: 'get_cell',
  description:
    'One cell in full: content, summary, owners, function/form/value, position.',
  surface: 'read',
  args: z.object({
    cell_id: arg.text('Cell id'),
  }),
  availability: { sample: true, mobile: true },
  run: async ({ cell_id }, ctx) =>
    ctx.client ? getCell(ctx.client, cell_id) : sampleGetCell(cell_id),
})

export const listCellDependenciesTool = defineTool({
  name: 'list_cell_dependencies',
  description:
    'The dependencies: which cell sets off, or depends on, which other cell. `leads_to` means this cell makes the other one happen (drawn as an arrow); `enables` means the other must already be true (recorded, never drawn). Pass cell_id to get just the edges touching one cell — the whole graph is large. These are the same arrows the user sees on the canvas, and the read half of create_cell_dependency.',
  surface: 'read',
  args: z.object({
    cell_id: arg.optionalText(
      'Restrict to edges into or out of this cell; omit for the whole graph (capped at 200)',
    ),
  }),
  availability: { sample: true, mobile: true },
  run: async ({ cell_id }, ctx) =>
    ctx.client
      ? listCellDependencies(ctx.client, cell_id)
      : sampleListCellDependencies(cell_id),
})

export const upsertCellTool = defineWriteTool({
  name: 'upsert_cell',
  description:
    'Create the cell at (path, lane, step). Creation ONLY — the call refuses if a cell already exists there (edit with update_cell instead). content is REQUIRED and must be real journey text — an empty or placeholder cell is invisible in the grid.',
  args: z.object({
    path_id: arg.text('Path id'),
    lane_id: arg.text('Lane id from get_blueprint'),
    step_id: arg.text('Step id (from get_blueprint)'),
    content: arg.text(
      'The cell text — a journey moment, not a system capability. Aim for the canvas budget: the canvas reads at a glance and shows what fits, so put detail in the summary. Longer text is written in full and comes back with a note naming the thresholds. Good: "Dispatcher confirms the address and books a crew". Bad: "Scheduling module".',
    ),
  }),
  run: async ({ path_id, lane_id, step_id, content }, { client }) => {
    const written = await createCell(client, {
      pathId: path_id,
      laneId: lane_id,
      stepId: step_id,
      content,
    })
    // Advice, not a gate. The budget is a judgement about how much copy
    // looks right in a card, and the canvas clamps its preview to a fixed
    // face either way, so long text is written and reported rather than
    // thrown away — see `cellContentLimits`. Same function, same thresholds
    // as the note under the person's field.
    const lengthGuidance = getCellContentLengthGuidance(
      content,
      await laneBudgetKind(client, lane_id),
    )
    // Which half the upsert took is said out loud. The occupancy guard means
    // an update should be unreachable; if the race that guard cannot close
    // happens anyway, a model told "created" goes on believing it made a
    // cell it in fact wrote over.
    const outcome = written.inserted
      ? `Created cell (${written.id}).`
      : `That slot was already filled; the existing cell (${written.id}) was updated in place.`
    return `${outcome}${lengthGuidance.message ? ` ${lengthGuidance.message}` : ''}`
  },
})

export const updateCellTool = defineWriteTool({
  name: 'update_cell',
  description:
    'Edit a cell. Text side: content, summary (the tl;dr — never a copy of the text), owner and perceived_owner (existing tags — see list_owner_tags). Spec side: function (what it does), form (how it appears), value_props (audience/value pairs). Reads the current values first, so pass only the fields you mean to change. Fields cannot be CLEARED here — an empty string means keep; ask the human to clear one in the panel.',
  args: z.object({
    cell_id: arg.text('Cell id'),
    content: arg.optionalText(
      'New cell text; aim for the canvas budget, and longer text is written in full with a note back naming the thresholds (detail belongs in summary); omit to keep',
    ),
    summary: arg.optionalText('New summary; omit to keep'),
    owner: arg.optionalText('Owner tag; omit to keep'),
    perceived_owner: arg.optionalText('Perceived-owner tag; omit to keep'),
    function: arg.optionalText('Function text — what the cell does; omit to keep'),
    form: arg.optionalText('Form text — how it appears; omit to keep'),
    value_props: z
      .array(
        z.object({
          for: z.string().describe('Audience'),
          value: z.string().describe('The value delivered'),
        }),
      )
      .describe('Full replacement list of {for, value}; omit to keep')
      .optional(),
  }),
  // ONE tool over two writers, because a cell is one thing to the person
  // editing it. The split exists for the mutation layer's benefit —
  // `updateCellContent` and `updateCellSpec` capture separate inverses, and
  // the ledger wants them separate — but an agent asked to "say what this
  // step does and who it is for" should not have to know that `function`
  // lives behind a different tool from `content`.
  run: async (args, { client }) => {
    const touchesText =
      args.content !== undefined ||
      args.summary !== undefined ||
      args.owner !== undefined ||
      args.perceived_owner !== undefined
    const touchesSpec =
      args.function !== undefined || args.form !== undefined || args.value_props !== undefined
    // Refused rather than treated as a no-op: a call naming no field is a
    // call whose author believed they were changing something.
    if (!touchesText && !touchesSpec)
      throw new Error(
        'Name at least one field to change: content, summary, owner, perceived_owner, function, form or value_props.',
      )

    const before = await readCellBeforeEdit(client, args.cell_id)
    const done: string[] = []
    const notes: string[] = []

    if (touchesText) {
      const lengthGuidance =
        args.content === undefined
          ? null
          : getCellContentLengthGuidance(args.content, await laneBudgetKind(client, before.laneId))
      await updateCellContent(
        client,
        args.cell_id,
        {
          content: args.content ?? before.content.content,
          summary: args.summary ?? before.content.summary,
          owner: args.owner ?? before.content.owner,
          perceivedOwner: args.perceived_owner ?? before.content.perceivedOwner,
          // The tool takes no `status` argument, so this write must not move
          // one: an edit to a cell's wording that quietly marked a proposed
          // surface live would be the sentence the agent never said out loud.
          status: before.content.status,
        },
        before.content,
      )
      done.push('text')
      if (lengthGuidance?.message) notes.push(lengthGuidance.message)
    }

    if (touchesSpec) {
      await updateCellSpec(
        client,
        args.cell_id,
        {
          function: args.function ?? before.spec.function,
          form: args.form ?? before.spec.form,
          valueProps: args.value_props ?? before.spec.valueProps,
        },
        before.spec,
      )
      done.push('spec')
    }

    // Two ledger entries when both halves moved, and the reply says so —
    // the change sheet will show two rows, and a reply claiming one write
    // would leave the reader counting.
    const reply =
      done.length === 2
        ? 'Cell updated (text and spec — two entries in the change list).'
        : `Cell ${done[0]} updated.`
    return notes.length ? `${reply} ${notes.join(' ')}` : reply
  },
})

export const createCellDependencyTool = defineWriteTool({
  name: 'create_cell_dependency',
  description:
    'Connect two cells on the SAME path. BOTH kinds read source-first. kind "leads_to" = the source makes the target happen (drawn as an arrow); "enables" = the source makes the target possible without causing it (panel-only, never drawn) — "B only makes sense once A is true" is A enables B, so the PRECONDITION is the source. They are NOT inverses: a precondition causes nothing, so do not record one as leads_to. State which kind you chose and why in your reply. Arrows only where they add information.',
  args: z.object({
    source_cell_id: arg.text('Source cell id'),
    target_cell_id: arg.text('Target cell id'),
    kind: z.enum(['leads_to', 'enables']).describe('Default leads_to').optional(),
    label: arg.optionalText(
      'Anything worth knowing about this dependency, in a sentence. Saved as the edge NOTE and shown on its row in the cell panel — it is not a badge on the arrow. The argument keeps its published spelling; what it writes is the note. Omit for none',
    ),
  }),
  run: async ({ source_cell_id, target_cell_id, kind, label }, { client }) => {
    const written = await setCellDependency(client, {
      sourceCellId: source_cell_id,
      targetCellId: target_cell_id,
      kind: kind ?? 'leads_to',
      // The tool says `label` and the column says `note`. The word a model
      // is asked for is not the schema's — renaming it would move a
      // published surface for a spelling — so the mapping happens here.
      note: label ?? null,
    })
    // Which half the upsert took is said out loud. The tool is named for
    // creating, and a model told "set" after landing on an edge that
    // already existed goes on believing it made one — which is how the
    // same pair gets connected again on the next pass.
    return written.inserted
      ? `Dependency created (${written.id}).`
      : `That pair was already connected; the existing dependency (${written.id}) was updated in place.`
  },
})
