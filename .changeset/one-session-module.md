---
'agentic-service-blueprinting': patch
---

The agent session is one module the views ask, not three stores they reach around the panel for

The agent panel's interface said five props, and behind those five props three
module stores were written from below: `panelState.ts` held which session is
open and the per-session composer draft, `sessions.ts` held the list, and
`attachments.ts` held the one pending attachment. The chat view set and took
the attachment itself. The two session dialogs renamed and deleted against the
sessions store. And deleting the open session reached the panel not at all —
it fell through a `?? null` in a component that had no way to know a session
had gone.

They are one module now. `src/lib/agent/sessions.ts` holds the four facts
about one thing — the list, which one is open, what you were typing in it, and
what is waiting to go with the next message — behind one interface, and the
panel, the two views and the two dialogs read it and no other store about a
session. Deleting the open session closes it, inside the module, and takes
that session's draft with it: an id `crypto.randomUUID` minted never comes
back, so a draft kept under one is unreachable by construction. The panel
reads the open **session** rather than an id it would have to resolve against
a list. The dialogs read no store at all — each reports its verb and its
caller performs it, so the store has two writers where it had four.

The four facts stay four variables rather than one state object, which is not
tidiness: every hook here returns one of them and `useSyncExternalStore`
re-renders on a changed *reference*. One object rebuilt per write would hand
the session list a new snapshot on every character typed into the composer,
and it would repaint; four variables mean the list's snapshot is the same
array it was, and the notification costs a comparison.

Nothing a person sees is different. Opening, sending, renaming, deleting and
reopening a session behave as they did; persistence is untouched, and no
persisted row shape moved. The rendered class, `aria-` and `data-` attribute
sets of all four touched views were hashed across seven states before and
after, and match string for string.

What was missing is now there: rename and delete had no test, and the
end-to-end slice that covers this flow never performs either. They have one
at the module's own interface, landed before the stores merged and watched go
red on a delete that writes the list back unchanged — and the rule about the
open session has its own case, which asserts the open **id** rather than the
hook, because a hook that resolves an id against a list reads empty whether
the rule is there or not.
