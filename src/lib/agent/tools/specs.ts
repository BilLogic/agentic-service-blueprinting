import type { ToolSpec } from '@/lib/agent/providers/provider'
import { toolSpec } from '@/lib/agent/tools/definition'
import { TOOL_DEFINITIONS } from '@/lib/agent/tools/definitions'

/**
 * The static allow-list — the agent's entire reach. Each write dispatches
 * onto the SAME wrapper the UI calls, so RLS, validation, session logging
 * and revert capture come free; there is no dynamic dispatch, no table
 * name as an argument, no free SQL. A request for anything else is a
 * refusal, not an attempt. Deliberately absent: every delete.
 */

const str = (description: string) => ({ type: 'string', description })

/**
 * NAMING — the rule a tool here is named by.
 *
 * A tool name is `<verb>_<noun>`. The verb states the CONTRACT (what the
 * caller may assume about the result); the noun states the entity family.
 *
 *   search_  ranked matches for a query — truncated at k, snippets only
 *   list_    the COMPLETE set at a level — no query, always projected
 *   get_     named ids — full bodies, bounded BY the ids being required
 *   compare_ / measure_   derived, not stored
 *   create_ / update_ / upsert_ / duplicate_ / replace_   data writes
 *   set_     UI STATE ONLY — never a data write
 *   open_ / focus_   move the user's canvas
 *
 * `list_` and `search_` stay apart because their success criteria are
 * opposite: enumeration must be COMPLETE, ranking must be RELEVANT. A model
 * that reaches for a ranked door on an enumeration question gets a silent
 * top-k truncation and reports a partial set as the whole one. Nothing here
 * ranks yet; the verb is kept for the first read that does.
 *
 * `list_` and `get_` stay apart because `get_` REQUIRES ids, and that
 * requirement is the payload guardrail — it makes "every cell at full body"
 * impossible by construction rather than by a conditional check.
 *
 * NAME vs PARAMETER. A narrowing of the same records rides in a parameter
 * (`service`, `status`, `cell_id`); a different record type earns a name.
 * Evidence hangs off a cell but is not part of one, so it is `list_evidence`
 * rather than an option on `get_cell`. What a row owns outright — a cell's
 * resources — rides in that row's own read.
 *
 * A tool name is NOT a table name and NOT an RPC name. The agent tool
 * `create_step` dispatches to the Postgres RPC `add_step`; renaming one must
 * never rename the other.
 */

/**
 * The mobile reading roster — the ONLY tools offered while the mobile shell
 * is up, for every tier including service accounts. Mobile is view-only by
 * decision (2026-08-08 plan): navigation, reading, and Q&A; no writes, no
 * canvas-mode switch, no annotation marks, no desktop-surface ui_commands.
 * A whitelist rather than a write-filter so a future tool defaults to
 * ABSENT on mobile until someone deliberately adds it here.
 *
 * This is a UX gate, not the security boundary — the server-side RPC tier
 * enforcement stays the real wall.
 */
export const MOBILE_READ_TOOL_NAMES = new Set([
  'get_reference',
  'list_references',
  'list_blueprint',
  // A phone asking "where do we chase a missing document" is the Q&A this
  // shell exists for, and ranked search is the read that answers it. Offered
  // here on the same terms as anywhere else: `searchPlan.ts` still decides
  // whether this session has it at all.
  'search_blueprint',
  'get_blueprint',
  'compare_blueprint',
  'get_cell',
  'list_lanes',
  'list_cell_dependencies',
  'list_slices',
  'get_slice',
  'list_owner_tags',
  'list_stakeholders',
  'list_evidence',
  'get_evidence',
  'get_business_model',
  'list_sessions',
  'get_session',
  'get_ui_state',
  'get_change_history',
  'open_phase',
  'open_scenario',
  'focus_cell',
  'open_cell_panel',
  'measure_deletion_impact',
  'list_findings',
])

/**
 * The no-database TRIAL roster — the only tools registered when the template runs
 * with no Supabase configured and the user has supplied a provider key. Every
 * entry resolves from the bundled sample blueprint (`tools/sampleRead.ts`) or
 * from the browser itself; nothing here touches a database, and no write tool
 * is present — absent, not refused.
 *
 * A whitelist rather than a write-filter, for the same reason the mobile
 * roster is one: a tool added later defaults to ABSENT in the trial until
 * someone deliberately puts it here and gives it a sample-data answer.
 */
export const SAMPLE_TRIAL_TOOL_NAMES = new Set([
  'get_reference',
  'list_references',
  'list_blueprint',
  'get_blueprint',
  'compare_blueprint',
  'get_cell',
  'list_lanes',
  'list_cell_dependencies',
  'list_slices',
  'get_slice',
  'list_owner_tags',
  'list_sessions',
  'get_session',
  'get_ui_state',
  'open_phase',
  'open_scenario',
  'focus_cell',
  'open_cell_panel',
])

/**
 * The tools that only READ — no row changes, and no effect on what the human
 * is looking at. `references/canvas-adapter.md` states this list as the FULL
 * read surface, and the agent reads that sentence as permission: a tool
 * missing from it is a tool it believes it cannot call. Both directions are
 * checked (scripts/check-read-surface.mjs), which is why this exists as a
 * named set rather than as "whatever is left over".
 */
export const READ_TOOL_NAMES = new Set([
  // A READ, not an interface call: it reports which controls exist right now
  // and touches neither the canvas nor a row. `ui_command`, which fires one,
  // is the interface call.
  'list_ui_commands',
  'get_reference',
  'list_references',
  'list_blueprint',
  // Classified as a read here even though it is OFTEN NOT OFFERED: this set
  // partitions `TOOL_SPECS`, and the spec exists in every build. Whether a
  // session may call it is `searchPlan.ts`'s question, not this set's.
  'search_blueprint',
  'get_blueprint',
  'compare_blueprint',
  'get_cell',
  'list_lanes',
  'list_cell_dependencies',
  'list_slices',
  'get_slice',
  'list_owner_tags',
  'list_stakeholders',
  'list_evidence',
  'get_evidence',
  'get_business_model',
  'list_sessions',
  'get_session',
  'get_ui_state',
  'get_change_history',
  'measure_deletion_impact',
  'list_findings',
])

/**
 * The tools that drive the interface. They change what the human SEES and
 * nothing else — except `ui_command`, whose "[changes data]" commands are a
 * write path but not a write tool (the loop counts those against the write
 * batch separately).
 *
 * Declared so the three sets partition TOOL_SPECS exactly (specs.test.ts). A
 * tool added to the roster and left unclassified fails that test, which is
 * what keeps READ_TOOL_NAMES from quietly becoming the next stale list.
 */
export const INTERFACE_TOOL_NAMES = new Set([
  'open_phase',
  'open_scenario',
  'focus_cell',
  'open_cell_panel',
  'set_canvas_mode',
  'set_sidebar',
  'annotate_cells',
  'ui_command',
])

/**
 * Which specs one session may see.
 *
 * Four gates, and they are NOT independent conditions on one list — they are
 * ordered, because each subsumes the ones below it. The no-database trial and
 * the mobile shell are whitelists that already exclude every write, so a write
 * filter applied after either would be dead code, and a reader who reorders
 * them gets a roster that is wrong in a way tests of individual gates would
 * miss. Ranked search sits OUTSIDE that order: it is removed from whatever the
 * other gates produced, because whether the deployment has a search function
 * and whether this person's key can reach its index are questions none of the
 * other three ask.
 *
 * A function rather than an expression inside the loop, so the ordering above
 * is stated once and tested directly.
 */
export function sessionRoster(
  specs: readonly ToolSpec[],
  session: {
    /** No Supabase configured: reads answer from the bundled sample. */
    sampleTrial: boolean
    /** The mobile shell is up — view-only for every tier. */
    mobileReading: boolean
    /** A service account. Viewers get no write tools at all. */
    allowWrites: boolean
    /** Does ranked search exist for this session? `searchPlan.ts` decides. */
    searchOffered: boolean
  },
): ToolSpec[] {
  return specs.filter((spec) => {
    if (spec.name === 'search_blueprint' && !session.searchOffered) return false
    if (session.sampleTrial) return SAMPLE_TRIAL_TOOL_NAMES.has(spec.name)
    if (session.mobileReading) return MOBILE_READ_TOOL_NAMES.has(spec.name)
    return session.allowWrites || !WRITE_TOOL_NAMES.has(spec.name)
  })
}

/** The tools that mutate data — the loop enforces batch etiquette on these. */
export const WRITE_TOOL_NAMES = new Set([
  'create_step',
  'create_lane',
  'upsert_cell',
  'update_cell',
  'create_cell_dependency',
  'update_path',
  'create_phase',
  'create_scenario',
  'create_path',
  'duplicate_path',
  'duplicate_scenario',
  'create_slice',
  'update_slice',
  'replace_slides',
  'create_evidence',
  'update_evidence',
  'create_finding',
  'update_finding',
  'create_stakeholder',
  'update_stakeholder',
])

export const TOOL_SPECS: ToolSpec[] = [
  // Tools that are definitions (`definitions/`) derive their spec from their
  // own zod schema and lead the table; the literals below are the tools that
  // are still a spec beside a switch case, and they leave as they move.
  ...TOOL_DEFINITIONS.map(toolSpec),
  {
    name: 'create_stakeholder',
    description:
      'Add someone to the cast. Rare and deliberate — a new row means a new ACTOR in the service, not a new spelling of one who exists. A different spelling belongs in the existing row\'s aliases via update_stakeholder.',
    parameters: {
      type: 'object',
      properties: {
        name: str('How this actor is written on the canvas, e.g. "Blueprint owner"'),
        kind: str('recipient | staff | partner | provider'),
        summary: str('Who they are, in one line; omit for none'),
        aliases: {
          type: 'array',
          items: { type: 'string' },
          description: 'Other spellings already present in this blueprint',
        },
      },
      required: ['name', 'kind'],
    },
  },
  {
    name: 'update_stakeholder',
    description:
      "Edit one member of the cast. Renaming also rewrites `slices.actor` on every slice linked to them — the registry owns that text. Read list_stakeholders first; the id is in its output.",
    parameters: {
      type: 'object',
      properties: {
        stakeholder_id: str('Stakeholder id'),
        name: str('New name; omit to keep'),
        kind: str('recipient | staff | partner | provider; omit to keep'),
        summary: str('One line; omit to keep'),
        aliases: {
          type: 'array',
          items: { type: 'string' },
          description: 'Replaces the alias list; omit to keep',
        },
      },
      required: ['stakeholder_id'],
    },
  },
  {
    name: 'open_phase',
    description:
      'Navigate the user\'s canvas to a phase. Use when asked to go to / show / open something, or to show your work after writing into it.',
    parameters: {
      type: 'object',
      properties: { phase_id: str('Phase id from list_blueprint') },
      required: ['phase_id'],
    },
  },
  {
    name: 'open_scenario',
    description:
      'Navigate the user\'s canvas to a scenario. Open the scenario before focus_cell.',
    parameters: {
      type: 'object',
      properties: { scenario_id: str('Scenario id from list_blueprint') },
      required: ['scenario_id'],
    },
  },
  {
    name: 'focus_cell',
    description:
      'Focus the active canvas camera on a specific cell and wait for the move to complete — use to point at evidence when answering questions. The cell\'s scenario must be open first (open_scenario).',
    parameters: {
      type: 'object',
      properties: { cell_id: str('Cell id') },
      required: ['cell_id'],
    },
  },
  {
    name: 'ui_command',
    description:
      'Fire a UI control by name (from list_ui_commands), with an optional arg. Interface only, EXCEPT the ones the list marks "[changes data]" — those count against your write batch. Notable [changes data] commands: undo_last_change (reverts whatever is newest, INCLUDING the human\'s own edit if theirs came last — say whose change you are undoing before firing it), revert_my_changes (only your own edits from this session; prefer it whenever the user says "undo what you did"), and keep_all_changes (clears the change sheet and with it every revert in the session — nothing can be taken back afterwards). Reverting the whole session is human-only; revert_all_changes exists to say so.',
    parameters: {
      type: 'object',
      properties: {
        command: str('Command name from list_ui_commands'),
        arg: str('Argument where the command takes one; omit otherwise'),
      },
      required: ['command'],
    },
  },
  {
    name: 'open_cell_panel',
    description:
      "Open the cell detail side panel on the user's screen — the same panel a click opens. The cell's scenario must be open first (open_scenario).",
    parameters: {
      type: 'object',
      properties: { cell_id: str('Cell id') },
      required: ['cell_id'],
    },
  },
  {
    name: 'set_canvas_mode',
    description:
      "Switch the user's canvas between 'view' (reading) and 'design' (authoring) mode — same switch as the toolbar's.",
    parameters: {
      type: 'object',
      properties: {
        mode: { type: 'string', enum: ['view', 'design'], description: 'Target mode' },
      },
      required: ['mode'],
    },
  },
  {
    name: 'set_sidebar',
    description: 'Collapse or expand the sidebar (more canvas vs more navigation).',
    parameters: {
      type: 'object',
      properties: {
        collapsed: { type: 'boolean', description: 'true = collapse' },
      },
      required: ['collapsed'],
    },
  },
  {
    name: 'annotate_cells',
    description:
      'Draw ephemeral annotation boxes around cells on the open canvas (optional short text note above them) — use to point at things visually, like a human with a marker. Marks are scratch-layer only: never saved, cleared on reload.',
    parameters: {
      type: 'object',
      properties: {
        cell_ids: {
          type: 'array',
          description: 'Cells to box (must be on the open scenario)',
          items: { type: 'string' },
        },
        note: str('Optional short label drawn above the boxes; omit for none'),
      },
      required: ['cell_ids'],
    },
  },
  {
    name: 'create_phase',
    description:
      'Create a new phase in the service. Propose the structure as text and get a nod first.',
    parameters: {
      type: 'object',
      properties: {
        name: str('Phase name'),
        summary: str('One-line summary; omit for none'),
      },
      required: ['name'],
    },
  },
  {
    name: 'create_scenario',
    description:
      'Create a new scenario in a phase, with its first path and empty steps. lane_source_path_id copies an existing path\'s lane stack (STRONGLY preferred — lane labels must match across scenarios). Propose as text and get a nod first.',
    parameters: {
      type: 'object',
      properties: {
        phase_id: str('Phase id from list_blueprint'),
        name: str('Scenario name'),
        path_name: str('First path name; defaults to "Happy Path"'),
        step_count: { type: 'number', description: 'Initial step columns (default 5)' },
        lane_source_path_id: str('Path id whose lanes to copy; omit for none'),
      },
      required: ['phase_id', 'name'],
    },
  },
  {
    name: 'create_path',
    description:
      'Add a path to a scenario — a variant or an exception. lane_source_path_id copies the sibling\'s lane stack (preferred).',
    parameters: {
      type: 'object',
      properties: {
        scenario_id: str('Scenario id'),
        name: str('Path name'),
        kind: {
          type: 'string',
          enum: ['happy', 'variant', 'exception'],
          description: 'Default variant',
        },
        lane_source_path_id: str('Sibling path id whose lanes to copy; omit for none'),
      },
      required: ['scenario_id', 'name'],
    },
  },
  {
    name: 'duplicate_path',
    description:
      'Copy a path — lanes, steps, optionally cells and arrows — as a new variant of the same scenario.',
    parameters: {
      type: 'object',
      properties: {
        source_path_id: str('Path to copy'),
        name: str('New path name'),
        kind: { type: 'string', enum: ['happy', 'variant', 'exception'], description: 'Default variant' },
        copy_cells: { type: 'boolean', description: 'Default true' },
      },
      required: ['source_path_id', 'name'],
    },
  },
  {
    name: 'duplicate_scenario',
    description:
      'Copy a WHOLE scenario into the same phase — its columns, every path, every lane, every cell, and every arrow with both ends inside it. One call, two arguments, but it writes far more rows than that suggests: duplicating a 5-path scenario is hundreds of inserts. Say roughly how big the source is and get a nod first. Fully revertible (its inverse deletes the copy). The UI names copies "X (copy)" — use the same form unless the human asks for a different name, so the sidebar reads consistently however the copy was made. Copied cells get no cell_key, so they cannot be bound into a slice until one is authored.',
    parameters: {
      type: 'object',
      properties: {
        source_scenario_id: str('Scenario id from list_blueprint'),
        name: str('Name for the copy; the UI convention is "<source name> (copy)"'),
      },
      required: ['source_scenario_id', 'name'],
    },
  },
  {
    name: 'create_slice',
    description:
      'Create a slice (stakeholder view) that REFERENCES existing cells — never copies. cell_ids in journey order, one slide per cell by default. Propose members by name and get a nod first.',
    parameters: {
      type: 'object',
      properties: {
        title: str('Slice title'),
        summary: str('One-line summary; omit for none'),
        kind: {
          type: 'string',
          enum: ['journey', 'lane', 'step', 'custom'],
          description: 'Kind of cut',
        },
        actor: str('Whose view this is; omit for none'),
        cell_ids: {
          type: 'array',
          description: 'Existing cell ids, in journey order',
          items: { type: 'string' },
        },
      },
      required: ['title', 'kind', 'cell_ids'],
    },
  },
  {
    name: 'update_slice',
    description: "Edit a slice's own fields: title, summary, actor, kind.",
    parameters: {
      type: 'object',
      properties: {
        slice_id: str('Slice id from list_slices'),
        title: str('omit to keep'),
        summary: str('omit to keep'),
        actor: str('omit to keep'),
        kind: { type: 'string', enum: ['journey', 'lane', 'step', 'custom'], description: 'omit to keep' },
      },
      required: ['slice_id'],
    },
  },
  {
    name: 'replace_slides',
    description:
      "Replace a slice's slides wholesale — THE tool for reordering, resequencing, merging cells into one slide, or splitting them apart. Read the slice first; pass the complete new slide list (each slide: cells in order + optional title/caption). When a reorder instruction is positionally ambiguous (e.g. \"move the last one up, then merge 2 and 3\" — original numbering or after the move?), confirm which you mean before writing. Re-read the slice afterwards to confirm the slide count matches what you intended.",
    parameters: {
      type: 'object',
      properties: {
        slice_id: str('Slice id'),
        slides: {
          type: 'array',
          description: 'Full replacement, in order',
          items: {
            type: 'object',
            properties: {
              cells: { type: 'array', description: 'Cell ids on this slide', items: { type: 'string' } },
              title: str('Slide title; omit for none'),
              caption: str('Slide caption; omit for none'),
            },
            required: ['cells'],
          },
        },
      },
      required: ['slice_id', 'slides'],
    },
  },
  {
    name: 'create_step',
    description:
      'Add a step (column) to a path. Read sibling paths first — step names align across paths BY NAME, so reuse the exact name when the step exists elsewhere.',
    parameters: {
      type: 'object',
      properties: {
        path_id: str('Path id'),
        name: str('Step name'),
        at_position: {
          type: 'number',
          description: 'Insert position (1-based); omit to append',
        },
      },
      required: ['path_id', 'name'],
    },
  },
  {
    name: 'create_lane',
    description:
      'Add a lane to EVERY path of a scenario. Read lane-roles and lane-vocabulary first; lane labels are byte-identical for the same actor group across scenarios.',
    parameters: {
      type: 'object',
      properties: {
        scenario_id: str('Scenario id'),
        name: str('Lane label'),
        lane_role: str(
          'Semantic role (e.g. frontstage_actions, backstage_touchpoints); omit if none fits',
        ),
        at_position: { type: 'number', description: 'Insert row (1-based); omit to append' },
      },
      required: ['scenario_id', 'name'],
    },
  },
  {
    name: 'upsert_cell',
    description:
      'Create the cell at (path, lane, step). Creation ONLY — the call refuses if a cell already exists there (edit with update_cell instead). content is REQUIRED and must be real journey text — an empty or placeholder cell is invisible in the grid.',
    parameters: {
      type: 'object',
      properties: {
        path_id: str('Path id'),
        lane_id: str('Lane id from get_blueprint'),
        step_id: str('Step id (from get_blueprint)'),
        content: str('The cell text — a journey moment, not a system capability. Aim for the canvas budget: the canvas reads at a glance and shows what fits, so put detail in the summary. Longer text is written in full and comes back with a note naming the thresholds. Good: "Dispatcher confirms the address and books a crew". Bad: "Scheduling module".'),
      },
      required: ['path_id', 'lane_id', 'step_id', 'content'],
    },
  },
  {
    name: 'update_cell',
    description:
      'Edit a cell. Text side: content, summary (the tl;dr — never a copy of the text), owner and perceived_owner (existing tags — see list_owner_tags). Spec side: function (what it does), form (how it appears), value_props (audience/value pairs). Reads the current values first, so pass only the fields you mean to change. Fields cannot be CLEARED here — an empty string means keep; ask the human to clear one in the panel.',
    parameters: {
      type: 'object',
      properties: {
        cell_id: str('Cell id'),
        content: str('New cell text; aim for the canvas budget, and longer text is written in full with a note back naming the thresholds (detail belongs in summary); omit to keep'),
        summary: str('New summary; omit to keep'),
        owner: str('Owner tag; omit to keep'),
        perceived_owner: str('Perceived-owner tag; omit to keep'),
        function: str('Function text — what the cell does; omit to keep'),
        form: str('Form text — how it appears; omit to keep'),
        value_props: {
          type: 'array',
          description: 'Full replacement list of {for, value}; omit to keep',
          items: {
            type: 'object',
            properties: { for: str('Audience'), value: str('The value delivered') },
            required: ['for', 'value'],
          },
        },
      },
      required: ['cell_id'],
    },
  },
  {
    name: 'create_cell_dependency',
    description:
      'Connect two cells on the SAME path. BOTH kinds read source-first. kind "leads_to" = the source makes the target happen (drawn as an arrow); "enables" = the source makes the target possible without causing it (panel-only, never drawn) — "B only makes sense once A is true" is A enables B, so the PRECONDITION is the source. They are NOT inverses: a precondition causes nothing, so do not record one as leads_to. State which kind you chose and why in your reply. Arrows only where they add information.',
    parameters: {
      type: 'object',
      properties: {
        source_cell_id: str('Source cell id'),
        target_cell_id: str('Target cell id'),
        kind: { type: 'string', enum: ['leads_to', 'enables'], description: 'Default leads_to' },
        label: str('Anything worth knowing about this dependency, in a sentence. Saved as the edge NOTE and shown on its row in the cell panel — it is not a badge on the arrow. The argument keeps its published spelling; what it writes is the note. Omit for none'),
      },
      required: ['source_cell_id', 'target_cell_id'],
    },
  },
  {
    name: 'update_path',
    description: 'Rename a path.',
    parameters: {
      type: 'object',
      properties: { path_id: str('Path id'), name: str('New name') },
      required: ['path_id', 'name'],
    },
  },
  {
    name: 'create_evidence',
    description:
      'Attach a source to a cell — the record of WHY a mapped moment is believed. kind is one of interview, survey, analytics, doc, meeting, decision, observation, other. Write evidence when the user tells you where something came from; never invent a source, and never attach one to a cell you have not read.',
    parameters: {
      type: 'object',
      properties: {
        cell_id: str('Cell the source supports'),
        kind: str('interview | survey | analytics | doc | meeting | decision | observation | other'),
        title: str('What the source IS, e.g. "Onboarding interview #4" — required'),
        note: str('Anything worth keeping about the source — a quotation, an observation, or a URL, which renders as a link; omit if none'),
      },
      required: ['cell_id', 'kind', 'title'],
    },
  },
  {
    name: 'update_evidence',
    description:
      'Edit an evidence row: kind, title, note. Pass only the fields you mean to change — the rest are kept. To move a source to a DIFFERENT cell, add it there and remove it here; this tool does not re-point it.',
    parameters: {
      type: 'object',
      properties: {
        evidence_id: str('Evidence id from list_evidence'),
        kind: str('interview | survey | analytics | doc | meeting | decision | observation | other; omit to keep'),
        title: str('New title; omit to keep'),
        note: str('New note; omit to keep'),
      },
      required: ['evidence_id'],
    },
  },
  {
    name: 'create_finding',
    description:
      'Record one sb:audit / sb:whatif finding as a triageable row. Dedupe is built in: an open finding with the same fingerprint (check_key + cited cells) is updated in place, a dismissed one stays dismissed (the call reports it and writes nothing), a resolved one reopens as a new row. Omit run_id on the first finding of a run and reuse the returned run_id for the rest of that run. Cite cells by id; for a zero-cell finding pass scope instead (e.g. "scenario:Intake Call").',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', enum: ['audit', 'whatif'], description: 'Which skill produced it' },
        check_key: str('Roster check key, e.g. "gap-sweep"'),
        severity: { type: 'string', enum: ['info', 'warn', 'critical'], description: 'Per the check doc default unless evidence says otherwise' },
        summary: str('The finding itself — what is wrong, where, and why it matters. No raw ids in this text.'),
        cell_ids: {
          type: 'array',
          description: 'Cells the finding is about; omit only for zero-cell findings',
          items: { type: 'string' },
        },
        scope: str('Zero-cell fingerprint scope, required when cell_ids is empty. Include a short reason slug so two zero-cell findings from one check cannot collide, e.g. "scenario:Intake Call:orphan-step-cooldown"'),
        run_id: str('The run identity returned by the first create_finding of this run'),
      },
      required: ['source', 'check_key', 'severity', 'summary'],
    },
  },
  {
    name: 'update_finding',
    description:
      'Triage a finding: resolved (fixed / no longer true) or dismissed (accepted as-is; dismissed findings never reopen), or open to reopen. This is the only edit humans or agents make to an existing finding.',
    parameters: {
      type: 'object',
      properties: {
        finding_id: str('Finding id from list_findings'),
        status: { type: 'string', enum: ['open', 'resolved', 'dismissed'], description: 'New status' },
      },
      required: ['finding_id', 'status'],
    },
  },
]
