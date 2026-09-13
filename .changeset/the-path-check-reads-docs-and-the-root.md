---
'agentic-service-blueprinting': patch
---

**`check:doc-paths` resolves the paths `docs/` and the root documents name.**
It was fenced to `skills/`, `references/`, `agents/` and `hooks/` — thirty-six
documents — and `docs/` is the largest prose tree in this repository. Nothing
resolved a path named there, and nothing resolved one named in `README.md`,
`CONTEXT.md` or `AGENTS.md` either: planted dangling paths in `CONTEXT.md` and
`docs/engineering/checks.md` passed `check:doc-paths`, `check:pointers` and the
full suite. The fence's own argument does not stop where the fence did — `docs/`
is packed with this package and read out of it, so a path named there resolves
for every reader who will ever follow it, exactly as one named in
`references/` does.

Measured before widening: three failures under `docs/engineering/`, none under
`docs/guidelines/`, eleven under the rest of `docs/`, one in `README.md`, and
thirty-four in `CHANGELOG.md`. The subject is now fifty-eight documents.

The fifteen were resolved one at a time, and only one was a defect: the
Supabase connector document sent a reader to `src/hooks/useScenarioBlueprint.ts`,
which has never existed — the hook that loads paths and blueprints per scenario
is `src/hooks/useCanvasBlueprints.ts`. Three were the workspace artifact
`blueprint/*.json`, which was listed as a glob and looked up by exact key, so
the exemption excused nothing while the three documents it was written for
failed; the lookup honours `*` now, as the rest of the check already did. Four
were decision records, which keep the words of the day they were written — the
same ground `swept-docs.mjs` states, read from `repoConfig.datedRecords` rather
than spelled here. The remaining seven are six sentences that are right about a
file this tree is right not to have, and they are a new list,
`ABSENT_BY_DESIGN`, keyed by the document AND the token: `src/styles/tokens.css`
is excused in the document that explains why it is gone and stays a failure in
the document that sends a reader to it, which is where this check caught it in
the first place. Like every list of its kind here it fails closed and an entry
that matches nothing any more is itself a failure.

`CHANGELOG.md` is out for the reason its thirty-four say out loud: a changelog
records what shipped on the day it shipped, and every path in it was true then.

**The require/forbid boundary is unmoved, and both sides now state it the same
way.** `check:doc-paths` REQUIRES a path this package's own prose names to
resolve here; the citation guard in `src/citations.ts` FORBIDS a shared file
naming a path its reader lacks. The line is which reader the document is
written for, and widening the subject did not cross it: everything added is
packed with this package and read out of it, the citation guard's subject is
`src/` and the named shared scripts, and the two do not overlap.

**If you hold a deployment of this template, this check is not one you run over
your own tree** — it holds this package's documents to this package's files.
What reaches you is `docs/engineering/checks.md`, which now describes the wider
subject, and `src/citations.ts`, whose boundary paragraph names the same line.
