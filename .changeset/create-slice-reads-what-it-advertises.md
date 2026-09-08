---
'agentic-service-blueprinting': patch
---

`create_slice` and `update_slice` now advertise the argument they read.

Both declared `description` and read `summary`. Nothing connected the two:
`specs.ts` builds a JSON schema out of string literals and `registry.ts` reads
`args['summary']` out of a `Record<string, unknown>`, so both files typecheck
no matter what they say. A model that filled in the field the schema offered
created a slice with an empty summary and was told it had been created.
`update_slice` failed worse — it kept the old summary and reported success, so
an edit meant to change the text changed nothing.

The schema now offers `summary`, which is the column it writes. The handler
still reads `description` as well, so a model taught the old wire keeps the
word that used to be dropped rather than losing it a second time.

The general form is now checked. `scripts/tool-arguments.mjs` reads both files
and compares argument names per tool, in both directions: an argument declared
and never read is the silent drop, and one read and never declared is an
argument a model can only send by accident. Aliases are listed with a reason
and only ever excuse the second direction — a name the schema knows and the
handler does not is the defect itself, so there is no way to excuse one.
