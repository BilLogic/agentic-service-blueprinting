---
'agentic-service-blueprinting': patch
---

The agent's cell-content budget advises instead of refusing: a cell longer
than the budget is written in full, and the reply says so.

An agent that composed 130 characters of cell text used to lose all of them.
The write path measured the content against a 120-character cap and threw, so
the sentence the model had already worked out never reached the database and
the model was left to guess a shorter one. Nothing in the schema asks for 120.
It is a judgement about how much copy looks right in a card, backed out of the
canvas geometry — and a judgement should advise rather than discard work
already done. `upsert_cell` and `update_cell` now write whatever they are
given and append a note naming the budget, the length they read, and where
supporting detail belongs. The two tool descriptions say the same thing, so a
model reads the budget as an aim rather than a wall.

The `maxLength` on the Content field in the cell editor stays. A box someone
is typing into can stop them at the budget before anything is lost, which
prevents; discarding a finished paragraph after the fact does not.

Nothing about the board moves, because the render never depended on the
refusal: a narrative cell already draws at a fixed height and clamps its
preview to the lines that fit, with an ellipsis, while the whole string stays
in the cell's own text node for the detail panel and for a screen reader. That
the height is fixed is an existing assertion about the layout estimate — a
long cell and a short one size their lane identically — rather than a claim
about any number of characters, and it is what makes the softer write path
safe to ship.
