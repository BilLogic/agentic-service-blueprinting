---
'agentic-service-blueprinting': patch
---

The caret case that could not fail is gone, and the gap it hid is written
where a reader meets it.

`agentComposerSkills.test.tsx` carried a case asserting that accepting a skill
completion leaves the caret at the end of the draft. It passed whatever the
composer did. Two facts, both established by running the probe rather than
reading it: in jsdom, assigning a textarea's `value` moves `selectionStart` to
the end of the new text on its own, with no React in the loop; and the comment
above the case — that focusing the field and setting its caret first is "the
path React's own selection restoration runs on" — was false, because
react-dom's `restoreSelection` acts only when the focused element changed
between commits, which it does not there.

**No better version of that case exists.** `findSkillLookup` is tail-anchored
by design — its span ends at `draft.length` on both branches — so the offset a
completion should produce and the offset the value setter produces by itself
are the same offset for every input. There is no distinguishing case to write.
This is not a test that is hard to write; it is one that cannot exist while
the lookup is tail-anchored.

The case is deleted rather than reworded, the false comment with it, and the
file's header now states the gap in its place: why no jsdom assertion can
separate the two offsets, and what covers the behaviour instead — a browser
check made by hand, typing `/sb:map notes then /sb:au` and pressing Tab to get
`/sb:map notes then /sb:audit ` with the caret at offset 29, focus kept and
the menu closed. That is the evidence; a green assertion was not.

Nothing else in the tree asserts a caret offset after a raw `value`
assignment. The field module's own test states the same gap already and keeps
no assertion for it, and the composer's decision record was corrected when the
field and its mirror became one module, so neither needed touching here.
