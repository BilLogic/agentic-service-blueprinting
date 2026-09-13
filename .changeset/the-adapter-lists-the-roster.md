---
'agentic-service-blueprinting': patch
---

**The canvas-adapter document lists the session's roster, and a deployment's
references and doctrine are config.** The adapter keeps its prose as a static
file; its two surface rows are the placeholders `{{read_tools}}` and
`{{write_tools}}`, filled from the roster the document is served with — in
the system prompt and through `get_reference` alike. A deployment that
narrows its roster narrows what its agent is told it can call, a viewer's
adapter lists no write, and a session without ranked search finds no
`search_blueprint` in its read row. The two checks that held the document's lists to the
tools (`check:read-surface`, `check:write-surface`) are deleted with the
lists; the whole-document sweep for invented tool names moves into the
references test.

`registerReferenceDocs`, the pre-import registry, is gone, and with it the
import-order rule in a deployment's entry file and the `REFERENCE_NAMES_EXTRA`
copy seam. A deployment supplies its documents as `agent.references` on its
`DeploymentConfig` — bare name to document text — read when a document is
served: a name the template already serves replaces that document, a new
name is listed to the agent right after the canvas adapter, and the
`get_reference` description names it (a live session derives the description
when it assembles its roster; the spec table's own import-time projection
carries the template's names). `agent.doctrine` has its
reader: the text joins every system prompt after the canvas adapter, as an
overlay on the template's role. `bootstrap` now exports the storage namespace
seam alone.

`ToolContext` carries `roster`, the definitions the session was offered;
`buildSystem` takes the roster it renders against. The eval harness renders
the adapter the same way against the roster each case offers, and its
bundler now stubs Vite asset imports beside `?raw` ones — the cell-budget
module reaches the deployment config, which names the cover's figures.

**Upgrading a deployment:** move `registerReferenceDocs({ blueprint })` from
your bootstrap module to `agent: { references: { blueprint } }` on your
deployment config, and a role document of your own to `agent.doctrine`. A
quarantined copy of `canvas-adapter.md` kept only to list a narrower roster
is no longer needed — `agent.enabledTools` narrows the served document.
