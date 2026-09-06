---
"agentic-service-blueprinting": patch
---

A registry row's id is the deployment's, and its identity is its name.

`scripts/generate_seed_sql.py` derived a registry row's id from
`entity_uuid(locale, "registry-touchpoint", f"{service_key}#{name}")`. The
service key was part of the input, so **two services minted two ids for one
tool**. That was consistent while `unique (service_id, name)` gave each service
its own row, and wrong the moment `21000131000000` made the catalog one
deployment-level pool under `unique (name)`: seeding a second service into a
target that already held the first was refused by `touchpoints_name_key`, in as
many words (#201).

**Two changes, and the second is the one that matters.** The derivation drops
the service key, so a registry id is deployment-stable — the same identity the
constraint asserts. And the seed stops treating that id as a lookup key: the
registry upsert reconciles `on conflict (name)`, and a placement resolves its
`touchpoint_id` by reading the row back rather than writing a derived id at it.
A derived id is now only what a row that does not yet exist is **born** with.

That is what makes two things true at once, and only the second needed working
out. A second service's seed lands on the row that is already there instead of
being refused — the model ADR 0003 states, which the seeder could not express.
And a target seeded **before** the derivation changed stays idempotent: its
rows keep the ids they were born with, and a re-import updates them in place.

**No migration, and the reason is worth recording.** The issue proposed a
migration to remap every existing registry id. It cannot be written. The old
id is `uuid5(ns, f"{locale}:registry-touchpoint:{service_key}#{name}")`, and
the database holds neither input: there is no `locale` column anywhere — the
adapter contract says so under Per-locale artifacts — and the seed writes
`services (id, name, summary)`, never the IR key the derivation used. A
template migration could compute neither the id it must find nor the id it must
write. Resolving by name needs neither, which is why it is the fix rather than
a way around one.

**What an import may overwrite.** It wins where it SAYS something and says
nothing where it was merely minted: an entry the IR never listed arrives as
kind `other` with no summary and no home — "nobody has judged this yet" rather
than a judgement — so it does not erase what a curator, or another service's
IR, already recorded under that name. The merge is `21000131000000`'s own, the
one it used when it folded each service's rows into the shared pool.

What moved with it:

  `scripts/generate_seed_sql.py`    the derivation, the name-keyed upsert,
                                    `registry_lookup` and the `Sql` escape
                                    that lets one column be a subquery
  `references/adapter-contract.md`  § 4 states the registry's identity rule
                                    and the merge, where a reader looking for
                                    idempotence will find it

Proven against a local Postgres 17 on this template's own portable core. Two
services whose IRs name the same tool now seed into one target and share one
registry row, where the second used to be refused. A target seeded with the
PRE-change generator then takes the post-change seed twice: one registry row,
still carrying the id it was born with, one placement resolving to it, and an
app-curated `kind` and `summary` intact across both runs.
`scripts/tests/run_tests.sh` adds `seed-registry-id` — two services differing
only in their key mint one registry id, and the locale is still in the
derivation, so two locales in one target would not collide — and asserts on the
emitted SQL that the registry upserts on the name and that no placement writes
a derived id.
