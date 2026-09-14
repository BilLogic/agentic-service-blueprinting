---
'agentic-service-blueprinting': patch
---

**The agent panel is a state machine and eight modules, and the slice says
nothing moved.** `src/components/editor/AgentPanel.tsx` held the sessions list,
the chat view with its transcript rows, tool rows and folded step blocks, two
dialogs and the ⚙ rail button around one session state machine — 1462 lines and
13 `useState` calls. It is 60 lines now, with none: what is left is which
session is open, the persistence the panel attaches, and the choice between the
two views. Everything else is a module under `src/components/editor/agent/` —
`AgentSessionsView`, `SessionRow`, `ChangeCount` with the hook behind it,
`AgentChatView`, `TranscriptRow`, `TranscriptStepsBlock`, the React-free
`transcriptBlocks` that decides which rows fold, `SessionDialogs`, and
`AgentSettingsRailButton`.

A person sees nothing: opening the panel, starting a session, sending a
message, reading a tool row, renaming and deleting sessions are the same
components in the same order, with the same classes, labels and test ids. What
crosses each new seam is the session, the events and the callbacks — no prop
was invented, and no persisted row shape changed.

**The instrument is the reason this was a safe change to make.** `npm run
slice:agent-session` was run before the first move and after every one of them,
and it passes with no assertion edited, including the transcript read back out
of `agent_messages` after the panel is closed and reopened. The agent harness
smoke is unchanged. Three guards that read the panel BY PATH were re-pointed at
the modules the code moved into — the monospace register roster and the
editor-shell type ladder, whose batch also learned to read the panel's own
folder one level down, so the surface it used to assert about is still
asserted about.

ADR 0017 records the outcome under its hold-lift amendment: this is the first
of the three held components to be split, and it is the one whose slice landed
first.
