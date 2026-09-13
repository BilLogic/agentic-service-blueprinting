---
'agentic-service-blueprinting': patch
---

**`check:deployment-seed-load` no longer reads one file of a many-file seed and
blames the shortfall on grants.** Run against a real deployment it reported four
findings — two tables empty as `anon`, and both render reads returning nothing —
and prescribed a migration granting a permission the recipe already grants.
What had actually happened is that it loaded **1 of that deployment's 23 seed
files**, so the tables really were empty, and it read that emptiness as a
permissions failure.

The cause is one line resolving three situations as though they were two. A
deployment states its seed in `config.toml` under `[db.seed]`; when that section
was absent, disabled, OR empty, the check fell back to the single file it had
been pointed at. Absent is a genuine fallback — one seed file and the CLI's own
default. Disabled-or-empty is not: it is a deployment that has deliberately
taken its seed list out of the CLI's reach, because four `supabase` subcommands
read that table and only one of them has the word "reset" in its name, so
`db push --include-seed` — whose `--linked` is the default — would load the
whole seed into a live project. The list then lives in a loader of the
deployment's own, under a name this package has no business knowing.

So the safety measure a deployment takes to protect its production database was
the thing that made this check read a twenty-third of its content.

It refuses now, and the refusal names what to pass instead. `--seed` takes
several paths — repeated, or comma-separated — and when files are named they
are the seed, in that order, with nothing else consulted. The case that worked
is untouched: no `[db.seed]` section still means the named file is the whole
seed. Every refusal prints its message and exits 1 rather than throwing a stack
trace over the sentence that says what to do.

The script already held the doctrine that names this failure —
`RESOLVES_TO_NOTHING`, on why one unresolved entry must stop the check, because
a seed loads in dependency order and the file that never ran is the one line
that explains the pile. The same thing was happening at the scale of
twenty-two files, in the branch that had no such guard.

**Upgrading a deployment:** if your `[db.seed]` is disabled or empty and you run
this check, it will now refuse where it used to answer. The answer it used to
give was wrong. Pass your loader's list — `--seed` accepts
`a.sql,b.sql` — in load order.
