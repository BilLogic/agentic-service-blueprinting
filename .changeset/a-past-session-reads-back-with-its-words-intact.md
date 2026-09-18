---
'agentic-service-blueprinting': patch
---

A past session reads back with its words intact

`get_session` renders one line per transcript event for an agent catching up on
an earlier conversation. `user`, `assistant`, `tool` and `declined` spelled
themselves out; everything else fell through to a final `return
`${event.kind}:``. A `status` event therefore reached the model as the single
word "status:" with its text dropped — a record saying something happened and
not what it said, which is the grievance the declined row was added to close.

`status` now shows its text. The if-chain is a switch with no default: every
kind the transcript has carries words, so every kind is written out and there
is nothing left for a fallback to be right about. The bare-kind line is still
the right answer for a kind that genuinely says nothing, but it would be
written as a case of its own — a stated choice rather than a catch-all standing
in for one.

A sixth event kind can no longer lose its text quietly. The renderer declares a
`string` return and has no default, so an unhandled kind leaves a path that
returns nothing and the build says so; the new suite's fixtures are total maps
over the kinds, which fail to compile for the same reason.
