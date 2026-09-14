---
'agentic-service-blueprinting': patch
---

**An agent session now runs end to end on every pull request, from the panel a
person types into down to the row in the database.** #694 drove the loop from a
fake provider through a tool to its result in a node test. What no test had
seen is the PANEL: whether a person who opens the agent surface, starts a
session and sends a sentence gets the turn, the tool row and the result on
screen; whether the write the agent makes is attributed where a reviewer reads
attribution; whether the conversation survives closing the session.

`npm run slice:agent-session` (`src/slices/agentSession.slice.test.tsx`) asks
all three. It renders the real `AgentPanel`, clicks ＋ for a new session, types
into the composer and presses Send. The loop is the real `sendToAgent`; the
model is the scripted provider adapter #694 introduced, so there is no network
and no key beyond the string that unlocks the send. The script calls one read
tool and then one write tool — `get_cell`, then `update_cell` — over the real
definitions, the real one save, and the real content and spec mutations.

Then it reads everything back. The transcript renders the person's message,
the narration between the calls and the answer; each tool row discloses the
arguments the agent sent and the tool's own sentence back. The row holds both
halves of the edit and nothing else moved. The ledger holds one entry per write
path, each wearing that session's agent attribution, and the real
`SessionChangesSheet` shows a ✦ per row. Both reverts from that sheet put the
row back column for column. And the transcript READS BACK from the persisted
rows after the panel is closed and reopened: the slice checks the close really
emptied the screen, forgets the in-process run, and lets the reopen hydrate
`agent_messages` the way a session reopened in another browser does — then
asserts what those rows carry (the message, the narrations, the answer, the
tool names) and what they do not (the tool row's arguments and result, which
are stripped before persisting).

**It has been watched go red, twice, and both reds are cases in the file.** One
drops a written column the way a forgotten grant does: the tool still reports
success, the panel still shows the row green, and the read-back no longer
holds. The other mocks the one module that hands a tool its session into
running the write unattributed: the write still lands and the panel still says
so, and the ledger's author, its session id and the sheet's ✦ all go. What the
in-memory table cannot see — a grant, a policy — `check:seed-load` asks the
real database for every column this flow writes, and the cell-edit slice's
PostgREST form asks of the same two writes.

`src/test/inMemoryDatabase.ts` grew `upsert`, `delete` and a numeric-aware
`order` to answer it, generically: the agent panel's transcript write-through
is real here, so one `agent_messages` row per event — ordered by its numeric
`seq` — is what the reopen reads back.

This is the per-flow exit condition ADR 0017 names for
`src/components/editor/AgentPanel.tsx`, and it unblocks that file's split.
