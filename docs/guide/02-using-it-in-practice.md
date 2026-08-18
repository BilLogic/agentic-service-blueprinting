# Using it in practice

**For** the designer or PM deciding whether, and how, this fits their week.
**Answers** what do I do with it?

## 1. Four situations

**Scoping a change.** Someone proposes removing a step. Before estimating,
you want to know what else touches it. `sb:whatif` walks the dependency
graph from that cell and returns the cells the change would reach and the
assumptions it would break, on a copy. Nothing moves until you accept it.

**Bringing a stakeholder up to speed.** A team needs the part of the
service that concerns them, not all of it. `sb:slice` takes that view —
one lane, one step, one journey — as a document that still points back at
the cells it quotes, so it cannot quietly drift from the blueprint.

**Checking the blueprint still describes reality.** Services change faster
than the artefacts that describe them. `sb:audit` runs its roster and
hands back findings to triage: gaps behind frontstage promises, channels
that disagree, moments nobody owns.

**Comparing designed against actual.** Two paths in one scenario, side by
side, column by column. This is the service-design move of comparing the
intended journey with the observed one, done on shared data rather than in
two documents that were true on different days.

## 2. Ways in

![Ways into the blueprint](../assets/four-ways-in.svg)

| Way in | Who it is for | What it can do |
| --- | --- | --- |
| the app | anyone | read, compare, present |
| the in-app agent | the person already reading | ask, and it drafts the change |
| agentic tools | whoever works in an IDE or CLI | map and audit with the `sb` skills |
| a chat bot on top | everyone else | answers, and links to the exact cell |

The first three read and write. The bot reads what is published. What
enforces that is the account each surface uses, covered in
[guide/04](./04-operations.md).

## 3. Presenting and sharing

A slice enters presentation mode as one frame at a time on a dark surface,
with the filmstrip along the bottom and a locator showing where the frame
sits on the blueprint. Print and PDF come from the same place.

For sharing outside the team, deploy read-only: the app builds to a plain
`dist/` and a published blueprint answers reads without any account at all.
