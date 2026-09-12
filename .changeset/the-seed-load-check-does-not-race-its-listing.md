---
'agentic-service-blueprinting': patch
---

**The deployment seed-load check stops reporting on files it never read.** The
`git ls-files` sweep left two sites in `check:deployment-seed-load` alone,
because neither is the vanishing-index defect the rest of that sweep was about.
Each is wrong for a reason of its own, and in both the answer turned out to be
the same one: absence here is not normal, and passing over it quietly is what
would hurt.

`resolveSeedFiles` asked `existsSync` and then `statSync` about the same path,
and dropped any entry that failed either. The `existsSync` bought nothing — if a
path can go it can go between the two calls, and `statSync` is the one that
answers anyway — but the dropping was the real problem. A `[db.seed]` entry is
the deployment stating what it loads. Passing one over loads the rest out of
dependency order: every row that depended on the missing file then fails, the
check files all of it under knock-on exactly as designed, and the one line that
explains the pile — a file that never ran — is nowhere in the output. So the
entry is resolved once, with `statSync`, and an entry with no file behind it
stops the check with a message naming the config, the entry and the path.

The seed text was read at the far end of the run — after the scratch database
was created, after the core stack went in, after one `psql -f` per seed file.
Every other listing-then-read in this repository closes in microseconds; this
one was held open across a multi-second subprocess. Nothing in it needs the
apply, so it happens beside the listing that produced the paths, where the
window is microseconds and a bad path costs nothing already done. A file that is
gone still throws rather than being skipped, and `ENOENT` stays told apart from
every other reason, which is the rule `scripts/read-listed.mjs` states for the
listings that ARE deliberately stale.

Moving that read forward would have turned one silence back on, so the apply
loop now reads psql's exit status too. The seed is applied with the stop switch
off on purpose, so a file whose every statement fails still exits 0 with the
whole list attached; a non-zero status with nothing to report means psql never
ran the file, and the run stops rather than grading a seed that never arrived.
