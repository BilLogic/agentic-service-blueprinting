---
'agentic-service-blueprinting': patch
---

A lane is a row of the board again, and a layer is everything else. The rename
that moved the table `layers` to `lanes` was carried into the prose by word
replacement, so every sentence using `layer` in one of its ordinary senses came
out saying `lane`. An earlier pass restored eleven of them. Ninety more had
survived.

The cover page was the one a reader met: "All four sit on one shared context
lane" printed two entries above the same file defining `lane` as "One actor
across the whole journey". The README said it twice more, once in a figure's
alt text.

Behind that, the damage ran in families rather than in scattered lines, which
is why counting occurrences under-reported it. The **boot layer** — the opaque
cover the sidebar draws over itself while the canvas stages — was called a
lane in twenty-two places across the shell, the skeletons, four panels and
five test names, in a file whose own paragraph two lines up says "The boot
skeleton is an OPAQUE LAYER over the whole sidebar". The **canvas reveal's**
rungs, which open one after another on `transitionend`, were lanes in fifteen
more; the board's actual lane rows fade in at rung one, so both words were
correct in that comment and only one of them was in the right place. The
**chrome layer**, the **compositing** boundary WebKit will not resolve across,
the agent runtime's **tool layer**, the design system's **token tier**, and
Figma's **layer tree** account for the rest. Outside `src`, the same replacement
turned a note recording a past rename into `` `lane-roles` -> `lane-roles` ``,
a rename to itself.

Two bindings were renamed rather than reworded. `getLaneScale`, `laneRef` and
`laneInteractive` in the annotation layer, and `laneElement`/`laneRect` beside
them, name a handle on one element — which is a layer; a lane is a row of data
drawn by many elements across the whole width of the board and has no single
element to hold. Nothing reaches them by string, so the compiler carried the
rename; the DOM contract `[data-canvas-annotation-layer]`, which IS addressed
by string, already said layer and is untouched. The second was worse hidden:
the arrow overlay's prop was declared `lane: ArrowLayer` and compared against
`'forward'` and `'wrap'` on `z-0` and `z-30`, so one file used `lane=` for a
stacking layer and for a board row seventy lines apart.

Where a sentence is true under either reading it was left alone. Ten comments
in the reveal code say "lanes" about the board and stay that way, including
"phase frames + lane structure" one comment above six that had to change.

## The guard, which is the part that lasts

`scripts/tests/a-lane-is-not-a-layer.test.mjs` asserts that nothing called a
lane is a layer, over every scanned file, **comments included**. That inverts
the sibling check next door, whose header says prose may use an English word
and a name may not misuse one. That rule is right for a word the domain does
not own; `lane` is this vocabulary's own word, so here the damage IS in the
prose, and a guard reading names only would have found three of ninety.

It decides by the company the word keeps. A lane is a row of the board: it is
not composited, it does not stack, it is not a rung of an animation and it is
not a tier of software. So `lane` may not stand in the vocabulary of the
cascade, of paint, of stacking or of an architectural tier. Every pattern names
a concept rather than a site — "boot lane" is forbidden because a row of the
board does not boot, not because twenty-two files said it, and the check has no
idea how many exist.

Four cheaper shapes were tried against the whole tree first and are recorded in
the header so the next person does not re-derive them. Position does not
separate the senses: in one stylesheet, forty of the forty-four correct uses
are in comments and so are all nine wrong ones. A per-file sense declaration
fails one level up, because ninety-one of the hundred and eighty-nine files
that use the word hold no lane identifier at all and still discuss lanes
correctly, and the three worst-hit files carry both senses, one of them inside
a single sentence. The pre-rename tree is not an oracle either, though it
settled a dozen calls: before the rename `layer` was BOTH words, the schema's
name for a row and the stacking sense, so only its negative direction is
sound. And an allowlist of modifiers is unbuildable, because what precedes
"lane" in this tree is overwhelmingly determiners and ordinary adjectives.

What it cannot see is stated in its header rather than hidden. Measured against
the sentences actually repaired, the patterns catch a little under half; the
rest are anaphora — a paragraph naming "the boot layer" once and saying "the
lane" four sentences later. No line-local rule reaches that, and resolving it
needs a parser and a model of the paragraph. What makes the limit tolerable is
that anaphora does not arrive alone: the paragraph almost always names the
thing once, and naming it is what trips the check.

The residue sweep beside it gained the fix for a blind spot it had all along. A
`semantic lane` had been sitting in the customization reference since the
rename, invisible because the phrase WRAPPED — "so the whole semantic" ended
one line and "lane renders greyscale" began the next, and a per-line test
cannot see a phrase no line contains. It now reads each line joined to the one
after it, with the continuation's comment marker stripped, and reports only
matches that genuinely straddle the boundary so a wrapped paragraph is not
blamed twice.

`CONTEXT.md` now defines **layer** — as explicitly *not* a domain word, which
is the entry that was missing. The glossary is what the next sweep checks
itself against, and the word this vocabulary keeps colliding with had no entry
in it.
