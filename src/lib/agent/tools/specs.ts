import type { ToolSpec } from '@/lib/agent/providers/provider'
import { REFERENCE_NAMES } from '@/lib/agent/tools/referenceNames'

/**
 * The static allow-list — the agent's entire reach. Each write dispatches
 * onto the SAME wrapper the UI calls, so RLS, validation, session logging
 * and revert capture come free; there is no dynamic dispatch, no table
 * name as an argument, no free SQL. A request for anything else is a
 * refusal, not an attempt. Deliberately absent: every delete.
 */

const str = (description: string) => ({ type: 'string', description })

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
  'read_reference',
  'list_scenarios',
  'get_blueprint',
  'get_compare_diff',
  'get_cell',
  'list_slices',
  'get_slice',
  'list_owner_tags',
  'get_ui_state',
  'get_change_history',
  'open_phase',
  'open_scenario',
  'focus_cell',
  'open_cell_panel',
  'get_deletion_impact',
  'list_findings',
])

/**
 * The no-database TRIAL roster — the only tools registered when the kit runs
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
  'read_reference',
  'list_scenarios',
  'get_blueprint',
  'get_compare_diff',
  'get_cell',
  'list_slices',
  'get_slice',
  'list_owner_tags',
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
  'read_reference',
  'list_scenarios',
  'get_blueprint',
  'get_compare_diff',
  'get_cell',
  'list_slices',
  'get_slice',
  'list_owner_tags',
  'get_ui_state',
  'get_change_history',
  'get_deletion_impact',
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
  'list_ui_commands',
  'ui_command',
])

/** The tools that mutate data — the loop enforces batch etiquette on these. */
export const WRITE_TOOL_NAMES = new Set([
  'add_step',
  'add_lane',
  'upsert_cell',
  'update_cell_content',
  'update_cell_spec',
  'set_cell_dependency',
  'rename_path',
  'create_phase',
  'create_scenario',
  'create_path',
  'duplicate_path',
  'duplicate_scenario',
  'create_slice',
  'update_slice',
  'replace_slice_frames',
  'record_finding',
  'set_finding_status',
])

export const TOOL_SPECS: ToolSpec[] = [
  {
    name: 'read_reference',
    description: `Read a rulebook reference before acting on its topic. Available: ${REFERENCE_NAMES.filter((n) => n !== 'canvas-adapter').join(', ')}. Read lane-roles and lane-vocabulary before any lane/role work; cocreate-playbook and elicitation-protocol before co-creating a scenario from conversation or notes.`,
    parameters: {
      type: 'object',
      properties: { name: str('Reference name, e.g. "lane-roles"') },
      required: ['name'],
    },
  },
  {
    name: 'list_scenarios',
    description: 'List every phase and its scenarios, with ids.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_blueprint',
    description:
      'Full grid of one scenario: every path with its steps, lanes, and cells (ids included). Read before writing into a scenario. ("Blueprint" unqualified means the whole workspace; this tool returns one scenario\'s grid.)',
    parameters: {
      type: 'object',
      properties: { scenario_id: str('Scenario id from list_scenarios') },
      required: ['scenario_id'],
    },
  },
  {
    name: 'get_compare_diff',
    description:
      "Structured comparison of a scenario's paths: canonical columns with verdicts, one group per divergent STEP (the same \"Step N\" the ledger groups by and jump_divergence takes) tagged with its divergence zone ①②③ (drawn as the strip in Stacked), every differing slot with per-path quotes and cell ids, and the detail-only (summary, resources, touchpoints) group. Read before driving the compare UI or answering \"what differs\". Dependency edges (leads_to, enables) are not compared.",
    parameters: {
      type: 'object',
      properties: {
        scenario_id: str('Scenario id from list_scenarios'),
        path_ids: {
          type: 'array',
          description:
            'Optional subset (2+) of the scenario\'s path ids, in comparison order; omit to compare every path',
          items: { type: 'string' },
        },
      },
      required: ['scenario_id'],
    },
  },
  {
    name: 'get_cell',
    description: 'One cell in full: content, summary, owners, function/form/value, position.',
    parameters: {
      type: 'object',
      properties: { cell_id: str('Cell id') },
      required: ['cell_id'],
    },
  },
  {
    name: 'list_slices',
    description: 'List existing slices (stakeholder views) with ids and types.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_slice',
    description:
      'One slice in full: fields plus every frame with its cells, caption, narrative. Read before update_slice or replace_slice_frames.',
    parameters: {
      type: 'object',
      properties: { slice_id: str('Slice id from list_slices') },
      required: ['slice_id'],
    },
  },
  {
    name: 'list_owner_tags',
    description:
      'The owner tag vocabulary in use. ALWAYS read before writing owner or perceived_owner — reuse an existing tag unless creating one deliberately.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_ui_state',
    description:
      'What the user is looking at RIGHT NOW: view level, selected phase/scenario, active tab, open cell panel, Design-mode selection. Call after navigating, or whenever "this/here/what I selected" needs grounding. When the user asks what they are looking at, relay EVERY line — view level included, not just the selection.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_change_history',
    description:
      "This session's edit history — every change made in this browser session (human and agent), newest first. When reporting it, distinguish user edits from agent edits and remind the user rows are revertible from the change sheet.",
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max entries (default 30)' },
      },
    },
  },
  {
    name: 'open_phase',
    description:
      'Navigate the user\'s canvas to a phase. Use when asked to go to / show / open something, or to show your work after writing into it.',
    parameters: {
      type: 'object',
      properties: { phase_id: str('Phase id from list_scenarios') },
      required: ['phase_id'],
    },
  },
  {
    name: 'open_scenario',
    description:
      'Navigate the user\'s canvas to a scenario. Open the scenario before focus_cell.',
    parameters: {
      type: 'object',
      properties: { scenario_id: str('Scenario id from list_scenarios') },
      required: ['scenario_id'],
    },
  },
  {
    name: 'focus_cell',
    description:
      'Scroll the open scenario\'s canvas to a specific cell — use to point at evidence when answering questions. The cell\'s scenario must be open first (open_scenario).',
    parameters: {
      type: 'object',
      properties: { cell_id: str('Cell id') },
      required: ['cell_id'],
    },
  },
  {
    name: 'list_ui_commands',
    description:
      'The LIVE list of UI controls you can drive right now (panel tabs, zoom, compare toggle, presentation, undo, …). Commands appear/disappear with the surfaces that own them — list before ui_command when unsure what exists.',
    parameters: { type: 'object', properties: {} },
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
        phase_id: str('Phase id from list_scenarios'),
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
      'Add a path to a scenario — alternative/unhappy/exception. lane_source_path_id copies the sibling\'s lane stack (preferred).',
    parameters: {
      type: 'object',
      properties: {
        scenario_id: str('Scenario id'),
        name: str('Path name'),
        path_type: {
          type: 'string',
          enum: ['happy', 'unhappy', 'exception', 'alternative', 'named'],
          description: 'Default alternative',
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
        path_type: { type: 'string', enum: ['happy', 'unhappy', 'exception', 'alternative', 'named'], description: 'Default alternative' },
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
        source_scenario_id: str('Scenario id from list_scenarios'),
        name: str('Name for the copy; the UI convention is "<source name> (copy)"'),
      },
      required: ['source_scenario_id', 'name'],
    },
  },
  {
    name: 'get_deletion_impact',
    description:
      'What deleting something would destroy — cell and arrow counts, which slices lose frames, which of those undo cannot put back, and what survives. A pure read: it deletes nothing, and no delete tool exists for you. Use it to answer "what happens if I remove this?" BEFORE the human opens the confirm dialog. Relay the warning and reassurance sentences VERBATIM; they are worded to not overstate what comes back.',
    parameters: {
      type: 'object',
      properties: {
        kind: {
          type: 'string',
          enum: ['scenario', 'path', 'slice'],
          description: 'What is being deleted. Only these three kinds are supported.',
        },
        target_id: str('Id of the scenario, path, or slice'),
      },
      required: ['kind', 'target_id'],
    },
  },
  {
    name: 'create_slice',
    description:
      'Create a slice (stakeholder view) that REFERENCES existing cells — never copies. cell_ids in journey order, one frame per cell by default. Propose members by name and get a nod first.',
    parameters: {
      type: 'object',
      properties: {
        title: str('Slice title'),
        description: str('One-line description; omit for none'),
        slice_type: {
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
      required: ['title', 'slice_type', 'cell_ids'],
    },
  },
  {
    name: 'update_slice',
    description: "Edit a slice's own fields: title, description, actor, type.",
    parameters: {
      type: 'object',
      properties: {
        slice_id: str('Slice id from list_slices'),
        title: str('omit to keep'),
        description: str('omit to keep'),
        actor: str('omit to keep'),
        slice_type: { type: 'string', enum: ['journey', 'lane', 'step', 'custom'], description: 'omit to keep' },
      },
      required: ['slice_id'],
    },
  },
  {
    name: 'replace_slice_frames',
    description:
      "Replace a slice's frames wholesale — THE tool for reordering, resequencing, merging cells into one screen, or splitting them apart. Read the slice first; pass the complete new frame list (each frame: cells in order + optional caption/narrative). When a reorder instruction is positionally ambiguous (e.g. \"move the last one up, then merge 2 and 3\" — original numbering or after the move?), confirm which you mean before writing. Re-read the slice afterwards to confirm the frame count matches what you intended.",
    parameters: {
      type: 'object',
      properties: {
        slice_id: str('Slice id'),
        frames: {
          type: 'array',
          description: 'Full replacement, in order',
          items: {
            type: 'object',
            properties: {
              cells: { type: 'array', description: 'Cell ids in this frame', items: { type: 'string' } },
              caption: str('Frame caption; omit for none'),
              narrative: str('Frame narrative; omit for none'),
            },
            required: ['cells'],
          },
        },
      },
      required: ['slice_id', 'frames'],
    },
  },
  {
    name: 'add_step',
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
    name: 'add_lane',
    description:
      'Add a lane to EVERY path of a scenario. Read lane-roles and lane-vocabulary first; lane labels are byte-identical for the same actor group across scenarios.',
    parameters: {
      type: 'object',
      properties: {
        scenario_id: str('Scenario id'),
        name: str('Lane label'),
        lane_role: str(
          'Semantic role (e.g. frontstage_actions, backstage_tech); omit if none fits',
        ),
        at_position: { type: 'number', description: 'Insert row (1-based); omit to append' },
      },
      required: ['scenario_id', 'name'],
    },
  },
  {
    name: 'upsert_cell',
    description:
      'Create the cell at (path, lane, step). Creation ONLY — the call refuses if a cell already exists there (edit with update_cell_content instead). content is REQUIRED and must be real journey text — an empty or placeholder cell is invisible in the grid.',
    parameters: {
      type: 'object',
      properties: {
        path_id: str('Path id'),
        lane_id: str('Lane id from get_blueprint'),
        step_id: str('Step id (from get_blueprint)'),
        content: str('The cell text — a journey moment, not a system capability, max 120 characters (the canvas reads at a glance; put detail in the summary). Good: "Dispatcher confirms the address and books a crew". Bad: "Scheduling module".'),
      },
      required: ['path_id', 'lane_id', 'step_id', 'content'],
    },
  },
  {
    name: 'update_cell_content',
    description:
      'Edit a cell: text, summary (the tl;dr — never a copy of the text), owner and perceived_owner (existing tags — see list_owner_tags). Reads the current values first internally, so only pass fields you mean to change. Fields cannot be CLEARED through this tool — an empty string means keep; ask the human to clear a field in the panel.',
    parameters: {
      type: 'object',
      properties: {
        cell_id: str('Cell id'),
        content: str('New cell text, max 120 characters (detail belongs in summary); omit to keep'),
        summary: str('New summary; omit to keep'),
        owner: str('Owner tag; omit to keep'),
        perceived_owner: str('Perceived-owner tag; omit to keep'),
      },
      required: ['cell_id'],
    },
  },
  {
    name: 'update_cell_spec',
    description:
      'Edit a cell’s spec: function (what it does), form (how it appears), value_props (audience/value pairs).',
    parameters: {
      type: 'object',
      properties: {
        cell_id: str('Cell id'),
        function: str('Function text; omit to keep'),
        form: str('Form text; omit to keep'),
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
    name: 'set_cell_dependency',
    description:
      'Connect two cells on the SAME path. kind "leads_to" = source makes target happen (drawn as an arrow); "enables" = source makes target possible without causing it (panel-only) — "X only makes sense once Y is true" reads as Y enables X, source-first. State which kind you chose and why in your reply. Arrows only where they add information.',
    parameters: {
      type: 'object',
      properties: {
        source_cell_id: str('Source cell id'),
        target_cell_id: str('Target cell id'),
        kind: { type: 'string', enum: ['leads_to', 'enables'], description: 'Default leads_to' },
        label: str('Short arrow label; omit for none'),
      },
      required: ['source_cell_id', 'target_cell_id'],
    },
  },
  {
    name: 'rename_path',
    description: 'Rename a path.',
    parameters: {
      type: 'object',
      properties: { path_id: str('Path id'), name: str('New name') },
      required: ['path_id', 'name'],
    },
  },
  {
    name: 'list_findings',
    description:
      'The findings ledger: audit/whatif findings with status. Read before recording (see what is already open) and when the human asks to triage.',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['open', 'resolved', 'dismissed', 'all'],
          description: 'Filter; default open',
        },
      },
    },
  },
  {
    name: 'record_finding',
    description:
      'Record one sb:audit / sb:whatif finding as a triageable row. Dedupe is built in: an open finding with the same fingerprint (check_name + cited cells) is updated in place, a dismissed one stays dismissed (the call reports it and writes nothing), a resolved one reopens as a new row. Omit run_id on the first finding of a run and reuse the returned run_id for the rest of that run. Cite cells by id; for a zero-cell finding pass scope instead (e.g. "scenario:Intake Call").',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', enum: ['audit', 'whatif'], description: 'Which skill produced it' },
        check_name: str('Roster check name, e.g. "gap-sweep"'),
        severity: { type: 'string', enum: ['info', 'warn', 'critical'], description: 'Per the check doc default unless evidence says otherwise' },
        note: str('The finding itself — what is wrong, where, and why it matters. No raw ids in this text.'),
        cell_ids: {
          type: 'array',
          description: 'Cells the finding is about; omit only for zero-cell findings',
          items: { type: 'string' },
        },
        scope: str('Zero-cell fingerprint scope, required when cell_ids is empty. Include a short reason slug so two zero-cell findings from one check cannot collide, e.g. "scenario:Intake Call:orphan-step-cooldown"'),
        run_id: str('The run identity returned by the first record_finding of this run'),
      },
      required: ['source', 'check_name', 'severity', 'note'],
    },
  },
  {
    name: 'set_finding_status',
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
