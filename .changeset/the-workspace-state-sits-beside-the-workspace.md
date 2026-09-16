---
'agentic-service-blueprinting': patch
---

The workspace indicator is a badge, and it sits beside the name it qualifies.

"sample data" was a hand-rolled span carrying badge geometry — `rounded-md
px-2 py-1 text-xs text-muted-foreground` — and no badge. Tailwind's `border`
utility was not among those classes, so the element computed to
`border-width: 0` over a transparent fill and the words read as loose text in
the chrome rather than as a piece of state. It is now `Badge` on the `default`
variant, which is written for exactly this job: page-adjacent fill, caption
ink, the control edge. Not `outline` — that variant draws `--border`, the token
every quiet edge in the app shares, and it measures weaker than `--input`
against a card in both themes by construction, so the only way to make it
carry a badge would be to strengthen every quiet edge in the app.

The row also moved. Every badge in it qualifies the workspace — which of the
two worlds this board is, whether writes land, whether they will be refused —
and all of them sat under `ml-auto` at the far end of the tab strip, with every
open tab between a state and its subject. They now sit immediately after the
workspace tab. The workspace is a permanent tab rather than a heading, so a
position inside the tablist is the only place "beside the workspace" exists;
the badges are spans, so the strip's roving-tabindex handler, which walks
`[role="tab"]`, does not see them.

`authoring` keeps its amber and `edit preview` keeps its slate. Amber already
means "careful, this is live" on that row and the bundled sample carries no
risk at all — it is read-only by construction — so the descriptive state gets
the descriptive variant rather than a third alarm.
