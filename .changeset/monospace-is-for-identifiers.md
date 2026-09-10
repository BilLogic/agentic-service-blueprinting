---
'agentic-service-blueprinting': patch
---

Monospace is for identifiers, and two settings rows are prose.

Read the ⚙ settings popover's agent rows top to bottom and the face used to
alternate for no reason a reader could recover: Provider, Model, API key and
Scope were all monospace, and two of the four render English.

`typography.md` gives mono one job — code, identifiers, and the time-marker
register. A model id (`claude-opus-5`) and an API key are identifiers and keep
it. `Anthropic Claude` is an `AGENT_PROVIDERS` label and `Active service` is
one of two phrases naming a search default; both are ordinary words, and they
now set in the body face beside the labels and prose they sit among. Trigger
and open menu move together — the menu shows the same values, so it takes the
same face.

**The column agrees on one label width.** The agent rows label at `w-14` and
the developer rows labelled at `w-20`, and both render into the same
`flex flex-col gap-2.5` column inside one `w-72` popover, so the control edge
jogged 64px to 88px partway down the panel. The developer rows take the agent
rows' width, and their section spaces itself at the column's `gap-2.5` rather
than a `gap-2` of its own.

**What is pinned.** `settingsColumnRows.test.tsx` asserts the rule rather than
today's classes: a table says what kind of thing each row's VALUE is — an
identifier or prose — and the face is derived from that, in the row and in the
open menu. A row added to the column without an entry fails the roster, so the
next row cannot quietly pick a face nobody chose. The alignment test never
names a width; it asserts there is exactly one.

**Why it shipped here.** `AgentProviderFields.tsx` and `AgentScopeField.tsx`
are on a deployment's reconciled allowlist, which promises byte-identity with
this kit's copy, so the fix comes upstream and returns with a pin bump.
