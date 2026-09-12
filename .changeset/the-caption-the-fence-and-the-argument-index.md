---
'agentic-service-blueprinting': patch
---

**A screen-reader user was read a caption the drawing no longer carries.** The
two anatomy figures were reworded to "Inside one path" and "Inside one cell"; the
alt text, the cover headings, the README and the guide page still said "Inside a
single …". Since the figures became module imports, the alt text is this
package's words for the drawing, so a deployment inherited the mismatch too.

**The published generator named a document only one repository has.**
`scripts/agent-account.mjs` is every line of logic `generate-agent-account.mjs`
runs, and it spelled this package's agent-account document in its header and in
the failure a missing marker throws. `splice` now takes the path to quote and
`evaluate` hands it the one the caller was configured with, so a deployment
whose `repoConfig.agentAccount` differs gets a message naming its own document.
The commands those failures prescribe are named by path, not by an npm alias
each repository spells for itself.

**The fence over shared scripts is now closed under relative import.** It named
six files and not the modules those six are built out of, which is how the
generator's logic kept a dangling reference behind a green guard for a release.
The list stays named — each entry carries the reason it is shared, which no walk
can judge — and a new test refuses a relative import that is on neither the
shared list nor the one declared exception, `repo-config.mjs`. Five more modules
were found travelling with the six and are listed.

**Two walks were reporting clean over a subject they had not read.**
`check-database-names.mjs` computed an empty-subject guard and never called it,
and swallowed every stat failure as an empty directory; both are wired up, and
the application half of the subject is counted separately because it can vanish
on its own. `every-sweep-knows-what-it-measures.test.mjs` skipped every directory
named `tests` whole, so no suite that sweeps the application was ever held to the
rule — the three whose application paths are fixtures are named instead, and the
sixth repository-only script is recorded on `repository-only.mjs` rather than in
a pull-request body.

**The citation extractor counts arguments again.** Frames were pushed by `(`
alone, so a comma inside an object or array literal bumped the enclosing call's
argument index and could turn a fixture into a citation; a brace or a bracket now
holds its own commas. And the assertion pattern matched a bare `assert`, so every
`assert.deepEqual(a, b, message)` in the script suites read as data — the forms
are named separately now, because a comparison puts an expected value where
`assert.ok` puts the message.

**ESLint reads the checks.** It was scoped to `.ts`/`.tsx`, so nothing could see
a computed-and-unused local in the tree the checks live in. One rule, the same
options the TypeScript block uses; it found four more left behind by the walks
moving to `app-source.mjs`.
