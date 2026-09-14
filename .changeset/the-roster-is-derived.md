---
'agentic-service-blueprinting': patch
---

**The roster is derived, and `agent.enabledTools` is read.** A session's
tool roster is the definition list filtered by the deployment's allowlist and
by each tool's own availability for the session's mode — `sessionRoster` in
`src/lib/agent/tools/roster.ts`. The five hand-kept name sets
(`READ_TOOL_NAMES`, `INTERFACE_TOOL_NAMES`, `WRITE_TOOL_NAMES`,
`SAMPLE_TRIAL_TOOL_NAMES`, `MOBILE_READ_TOOL_NAMES`) are gone: a tool's
surface and where it may run are fields of its definition, and nothing
restates them. The loop's per-call gates read the same definition the roster
did. The trial's refusal lists the definitions that run without a database.

`agent.enabledTools` on the deployment config now has its reader: name a
subset of tools and the roster is exactly that subset (in definition order),
under every mode gate; absent means every tool; a name no definition declares
is simply not there. The config provider hands it to the roster module at
boot the way it hands the search plan.

The switch-era scaffolding is deleted: the argument-name regex check
(`scripts/tool-arguments.mjs`) and its test. `check:read-surface` and
`check:write-surface` read each tool's surface out of its definition through
`toolSurfaces` in `scripts/tool-sources.mjs`. The eval harness derives its
write and mobile rosters from the definitions inside its one-sourcing entry.
CONTEXT.md defines *Tool* and *Roster*.

**Upgrading a deployment:** a copy of `specs.ts` that narrowed the roster by
editing a name set is replaced by `agent.enabledTools` in the deployment
config, listing the tools to keep. A test or script that imported one of the
five sets reads `sessionRoster(mode)` or a definition's `surface` /
`availability` instead.
