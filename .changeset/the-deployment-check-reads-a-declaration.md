---
'agentic-service-blueprinting': patch
---

**The deployment types check asks what a deployment's own `database.ts`
actually is: the declaration of its database, not what its application
compiles.** Since a deployment reads the application out of this package,
`@/types/database` resolves into the package and the application is
typechecked against the copy that ships beside it. The check had been written
before that flip and still said the deployment's file was the compile subject,
so it failed on facts rather than defects — at the deployment that reported
this, two tables its database legitimately lacks because it never ran those
migrations, and three unions (`LaneRole`, `EntityStatus`, `StakeholderKind`)
that only this template's generator narrows, where the Supabase CLI its own
docs send it to emits `string`. It was never wired into that CI.

It now asks, for every table BOTH files describe, whether every column this
package's application reads is described there too. A table this package has
and the deployment does not is printed as information and does not fail: a
deployment is entitled to carry the part of this core its service uses. A
column absent from a table it DID build still fails, because the application
will read that column out of that database. Column types are compared for
contradiction rather than width — `string` and a narrowed vocabulary are one
text column at two precisions, `Json` and `NonNullable<Json>` one jsonb column
disagreeing about null, `string` against `number` two files that cannot both
be right. The unions in the tail are not compared at all: they are this
package's aliases, read by this package's code out of this package's copy, no
`Row` column is typed as one on either side, and the vocabulary they close is
a CHECK constraint, which a file is not the place to read from.

It passes on the reporting deployment's file now, naming the two tables it has
not migrated and exiting 0. `docs/connectors/supabase/database.md`,
`docs/engineering/checks.md` and `references/customization.md` say all of this;
the parser that reads a column's declared type beside its name is
`check-schema-inventory.mjs`'s, so there is still one answer to what that
generated file means.
