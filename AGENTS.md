# sb — service blueprinting skills (agent router)

This repo is the `sb` plugin. In Claude Code it installs as a plugin
(`claude plugin marketplace add <this repo>` → `claude plugin install
sb@sb-marketplace`) and the skills load themselves. **Any other agent
(Cursor, Codex, etc.): this file is the router — the skills are plain
markdown and work anywhere; read the SKILL.md and follow it.**

## Skill routing

| Invocation / intent | Read and follow |
| --- | --- |
| `sb:map` — create, import, translate, present, or evolve a service blueprint; a directory contains `blueprint-workspace.json` or `blueprint/` | `skills/map/SKILL.md` |
| `sb:slice` — cut a stakeholder view (actor journey, moment, lane, cell brief) out of an existing blueprint | `skills/slice/SKILL.md` |
| `sb:audit` — run the consistency-check roster; record/triage findings | `skills/audit/SKILL.md` |
| `sb:whatif` — trace a hypothetical change; promote only on acceptance | `skills/whatif/SKILL.md` |

Rules that hold for every skill:

- SKILL.md is the contract. Its ⚠ hard rules are not advisory; entry-state
  detection runs FIRST, always.
- `references/`, `agents/`, `scripts/` paths in the skills resolve against
  this repo root (or the workspace clone's own copies).
- Sub-agent dispatch (auditor, impact-tracer, document-reader,
  blueprint-reviewer, render-checker): if your runtime has no sub-agent
  primitive, run the agent's `agents/<name>.md` prompt in a fresh context
  yourself and return only its structured output. Never skip the
  fresh-context requirement — it is what keeps reviews and audits blind.
- Validation is deterministic: `scripts/validate_ir.py` exit 0 gates every
  import; never hand-judge IR validity.
- Secrets: never write service-role keys into tracked files. The
  `hooks/secret_guard.py` check runs automatically only in Claude Code —
  elsewhere, enforce it yourself.

## Template app & vendored skills

This repo also ships the blueprint template app (`src/`) and its eval
harness (`scripts/agent-harness/`, `evals/`). The skills are dual-homed:
`skills/` + `references/` are canonical; `src/lib/agent/skill/` is a
vendored copy the app bundles. After editing skills or references, run
`node scripts/sync-canvas-skills.mjs` — otherwise `npm test` fails on its
`--check` drift guard.

## Workspaces

A scaffolded blueprint workspace carries its own copies of `skills/`,
`references/`, `agents/`, `scripts/` — the same routing applies there,
resolved against the workspace root. Workspace version = template version;
upgrade via the recipe in `references/customization.md`.
