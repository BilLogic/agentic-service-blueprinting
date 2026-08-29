---
status: approved
date: 2026-08-23
summary: Become the ratified canonical home for the sb skills, and adopt the shared harness IA without inheriting any uno coupling.
---

# Agent harness IA rebuild — agentic-service-blueprinting

Full audit and rationale: the harness-audit artifact (2026-08-23).
This repo is the open-source package and the canonical home for the four `sb`
skills. Nothing in it may reference uno, PLUS, or the Slack bot.

## Stage 1 — canonical home

- Resolve the 5 files currently drifted against uno-blueprint's vendored copy; skills are authored HERE, never there.
- uno-blueprint's sync points at this repo's git remote (`BilLogic/agentic-service-blueprinting`), not a local path.
- Keep `skills/`, `references/`, `agents/`, `hooks/`, `scripts/` names unchanged — plugin consumers resolve `${CLAUDE_PLUGIN_ROOT}/references/…`. This is a deliberate exception to the shared vocabulary; record it as an ADR.

## Stage 2 — IA

```
CONTEXT.md · README.md · SETUP.md · INDEX.md · AGENTS.md
skills/ · references/ · agents/ · hooks/ · scripts/       plugin contract, unchanged
docs/
  adr/ · connectors/supabase · guidelines/ · engineering/ · guide/ (01–04 narrative)
src/
```

- `CONTEXT.md`: the blueprint glossary minus PLUS specifics — scenario · path · phase · step · cell · lane · line of visibility · trigger vs need · slice · finding.
- `docs/guide/` (01–04) stays as human narrative and links into the protocol rather than restating it.
- Plans stay in-repo *and* mirror to public issues — contributors need a visible queue.

## Boundary check

Part of this work: grep the tree for uno / PLUS / uno-bot references and remove
any that survive. The package must stand alone for someone who has never heard
of PLUS.
