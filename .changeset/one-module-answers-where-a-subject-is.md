---
'agentic-service-blueprinting': patch
---

**One module answers "give me the files for this subject".** `scripts/sweep.mjs`
names seven subjects — `app` (a deployment's `src` laid over the package's per
path, through the same overlay rule the build applies), `docs`, `scripts`,
`migrations`, `references`, `reference-docs` and `deployment-seed` — each with
its root rule and what "cannot see the subject" means there: a skip said out
loud, or a failure. A file that vanished between the listing and the read is
handled once, in the sweep. The checks that resolved the application's root
themselves now name the `app` subject, receive its files and contain only
their judgement, and their tests hand files in; the older application-source
helper delegates to the sweep until the remaining checks move.
