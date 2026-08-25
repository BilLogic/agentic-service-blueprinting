---
"agentic-service-blueprinting": minor
---

The plugin contract's identifier lane is written down in `identifiers.json`,
generated from the tree and diffed in test, so renaming a skill, reference,
schema, agent, hook or tool shows up in review instead of at a consumer's
runtime. One version number is pinned across `package.json`, `plugin.json` and
the CHANGELOG.

The two v1 adapters now project one shared field list, and
`scripts/adapter_parity.py` checks that they agree — closing a drift that had
the no-DB adapter silently dropping `cell_key`, `position`, every cell
spec field and the edge `kind`. No-DB is stated as the first run, and as
read-only.

CI runs all of it, plus the IR round-trip suite that previously ran nowhere.
