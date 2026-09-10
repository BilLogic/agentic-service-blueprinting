---
'agentic-service-blueprinting': minor
---

A check reports where the kit's own content is still what a deployment serves.

Two guards already sweep for content leaking the wrong way — `check:standalone`
for the NAMES of the deployment this kit was generalised from, and
`check:content-coupling` for that deployment's CONTENT with the name filed off.
Both protect the kit from the deployment it came out of. Neither faces an
adopter, and nothing else did either: of the checks that shipped, none answered
*is what this deployment serves still the kit's blueprint rather than its own?*

`npm run check:sample-content` is the mirror. It knows the meta-blueprint's
markers — the service name `Keeping a blueprint true`, the `f0000000-…` id
namespace `fid()` mints, and the six scenario titles — and reports where a
deployment still carries them, naming the file, the line and the value the way
the content guard does. The id marker is the one with the name filed off: it is
thirty-two hex digits that say nothing, so content can read as entirely an
adopter's and still be keyed on the kit's rows. Its prefix is imported from
`check-content-coupling.mjs` rather than copied, because the two guards are one
claim read from two sides — the value that guard trusts as proof of origin is
the value this one reports.

**Subject is only the two places a deployment's content lives**: the seed
`[db.seed]` names, and `src/data/`, the board the app renders with no database.
The generator, this repository's docs and its README are out. Each of them
names the sample and always will, and a sweep that included them could never
reach zero on any deployment — which is how a report becomes wallpaper.

**Advisory: it reports and exits 0**, says so in its own output and in its
header, and is not in CI. Both states it reports are legitimate. A fresh clone
is full of sample content because SETUP.md § 2 asks a new reader to run the app
against it; a half-migrated deployment — seed replaced, `src/data/` not yet
re-registered — is a supported place to stand for a while. Failing either would
fail a supported path, and a check whose readers have learned to scroll past it
is worse than none.

Documented where an adopter meets it — SETUP.md § Before you push — as well as
in the guard set.
