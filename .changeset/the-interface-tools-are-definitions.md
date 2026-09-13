---
'agentic-service-blueprinting': patch
---

**The eight interface tools are definitions, and reach the canvas only
through their context.** `open_phase`, `open_scenario`, `focus_cell`,
`open_cell_panel`, `set_canvas_mode`, `set_sidebar`, `annotate_cells` and
`ui_command` each live under `src/lib/agent/tools/definitions/interface.ts`.
None of them imports the navigation bridge, the command registry or the
canvas-mode store; they call `ctx.ui`, which the app fills from those and a
test fills by hand. `ui_command` runs a control that changes data through
`ctx.session.attributed(...)`, so the session — not the tool — owns its place
on the authoring ledger. The write cases still in the dispatcher run through the
same `attributed`, so the module-global attribution toggle has one caller — the
module that builds the live context — and goes when the writes become
definitions. The shells provide `ctx.ui` through the registries they already
fill; the one module that reads those registries is the whole of what a tool
knows about them.

With the reads already definitions, the no-database trial's second dispatcher
had four navigation cases left and now has none: it is the trial's refusal,
and nothing else. The dispatcher's switch holds only the writes.

Two schemas are read more strictly than their handlers used to: a
`set_canvas_mode` that is neither `view` nor `design`, or a `set_sidebar`
whose `collapsed` is not a boolean, is refused with the schema's words instead
of being coerced to `view` and `false`. Both schemas already said so; the
handlers did not.

**Upgrading a deployment:** if your tree carries its own copy of `specs.ts`
or `registry.ts`, take the package's. A test of your own that drove a
navigation tool through the dispatcher against a registered bridge can now
build a `ctx.ui` and run the definition without a document.
