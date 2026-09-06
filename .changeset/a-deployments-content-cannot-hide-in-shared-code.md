---
'agentic-service-blueprinting': patch
---

A deployment's content cannot hide in shared code without its name.

`check:standalone` is a word-grep. It sweeps every file a commit would carry
for the handful of words that NAME the deployment this template was
generalised from, and it caught eighteen sentences nobody had read in months.
The other half of the same leak walked straight past it: content with the name
filed off. A cell id copied out of that database is thirty-two hex digits and
names nothing. `Regular Tutor` is its cast, not its title. `Standard
Scheduling` is one of its scenarios. Each is as unusable to an adopter as its
repository name in a comment, and none of them is a name.

**`npm run check:content-coupling`**, beside `check:standalone` in CI, in
SETUP.md § Before you push and in `docs/engineering/checks.md` § 4. Four
patterns, every one a SHAPE rather than a copy of somebody's catalogue, each
carrying the `why` the failure report prints:

- **An opaque id.** A UUID literal that is neither the sample's own nor a
  placeholder somebody typed — and both allowances are checkable rather than
  listed. Every id in the sample blueprint and its seed comes out of `fid()`
  in `scripts/generate_sample_blueprint.mjs`, so the `f0000000-…` prefix is a
  proof of origin; and a UUID a person types is a few digits repeated, so
  three or fewer distinct hex digits — once the version and variant nibbles a
  v4 is required to carry are dropped — is the line. The gap either side of it
  is enormous: the deployment's own ids run five and up.
- **The cast**, word-bounded and case-insensitive, so `tutorial` is untouched.
- **Its scheduling vocabulary** — the words for a dropped shift, the cover for
  one, and the scenario holding both.
- **A `/touchpoint-logos/` asset path**, which is a file only that deployment
  has; the template's own fixture passes by shape.

Subject is `src/`, `skills/`, `agents/`, `references/`, `evals/`, `scripts/`
and `docs/`, tracked plus untracked the way the sibling sweep reads it since
#181. Tests are out, because a fixture has to be able to write the value down
— the rule `check-database-names.mjs` already states for a dead relation.
`src/data/sampleBlueprint.ts` stays IN: the id rule passes it for a reason
worth asserting, and the day one of its thousand ids is outside the sample
namespace, something was pasted in.

**Twenty lines fixed across fourteen files, none allowlisted.** Seventeen
were comments and reference-doc sentences illustrating a mechanism with
somebody else's staff; three were LIVE strings the canvas agent reads as its
tool contract, where the example its model is shown was another company's job
title (`list_stakeholders`, `create_stakeholder` and `create_evidence`). Each now uses the sample blueprint's own vocabulary —
`Blueprint owner`, `Read the sources` → `Draft the structure`,
`A critical finding reopens`. `ALLOWED` therefore ships **empty**, with its
shape held by fixtures rather than by a live entry: a site that cannot move
without a design decision is named by file and value — never by line, which
churns — and an entry nothing matches any more is itself a failure.

**The inline annotation sweep found nothing to delete.** The tree carries no
ad-hoc "do not use the deployment's examples" comment for the check to
replace; what it carries instead is prose explaining design decisions
(`LEGACY_NAME_TO_ROLE`'s shim, `TOUCHPOINT_COLORS`' empty alias map,
`VISUAL_WALKTHROUGH_LANE_NAMES`), and those stay.

One boundary is stated rather than swept: a role noun that is also ordinary
English. `Supervisor` was one deployment's actor, quoted as "the live example"
in an audit-check document; no bounded pattern separates it from the word a
template may honestly write, so it was fixed by hand and the class is named in
the script's § What is NOT matched, deliberately.

No identifier in `identifiers.json` moves and no path in
`check-reference-paths.mjs` does.
