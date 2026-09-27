---
'uno-blueprint': patch
---

Every shared file cites only what a deployment holds

Four scripts a deployment holds byte-identical still pointed at files only
this template has. `check-target-schema.mjs` named the IR validator and the
application's schema-version module by path, `agent-account.mjs` the
panel-terms module and the database types, and `authoring-archivers.mjs` the
authoring-log module, and `check-harness-claims.mjs`'s adoption message
sent the reader to the package's customization reference by a path their
tree lacks; each now names the thing rather than its path.
`always-loaded.mjs` spoke as if only the template read it — "here that is
`AGENTS.md`", a census of near misses only one side had — and now says what
holds on both sides, naming the plugin manifest as the package's alone.

The shared-file guard grows to match. A `scripts/…` file cited from a shared
file must be one `SHARED_SCRIPTS` or `REPO_LOCAL_IMPORTS` accounts for, so a
template-only script can no longer be cited by path. A new `SHARED_CONFIGS`
list names the build configuration a deployment holds byte-identical —
`vite.config.ts`, the three tsconfigs, `eslint.config.js`, `components.json`
— and holds it to both rules. `src/…` stays outside the rule: it is the
application's own spelling, resolved through the overlay on either side.

Comments and tests only; no behaviour changes. A deployment that holds these
files takes the new bytes with the pin bump. `SHARED_SCRIPTS` keeps its shape,
so the deployment-side reader of that list is unaffected.
