---
'agentic-service-blueprinting': patch
---

The slice editor calls a slide a slide. The title box asks for a Slide title,
the button at the end of the strip adds a slide, the tooltip on a card deletes
one, and the ✕ on a cell badge takes that cell out of the slide. All four said
"screen" before, which is a word this vocabulary does not use for anything.

Three words are settled and distinct. A **frame** is one image on one cell —
column `cells.frame`. A **slide** is one row of a slice — table `slides`.
**screen** is ordinary English: a display, a viewport, the surface a reader
happens to be looking at. Letting the schema's own prose call a slide a frame
is the exact defect the `slides` rename fixed, and
`scripts/retired-vocabulary.mjs` has recorded it ever since; calling a slide a
screen is that defect wearing a third word.

`CONTEXT.md` now defines all four of `frame`, `slide`, `strip` and
`storyboard`, which it did not before. That is the half of this change that
matters longest: the glossary is what the next sweep checks itself against, and
none of the four had an entry to check.

Behind the strings, the bindings that named a slide are renamed to say so.
`screenIndex` becomes `slideIndex` in the composer, which had been rendering
the label `Slide {screenIndex + 1}` — the right word printed from a variable
named for the wrong one. `mergeSelectionIntoScreens` becomes
`mergeSelectionIntoSlides`. `sequenceByFrame` and `frameProblems` become
`sequenceBySlide` and `slideProblems`; `FrameNavButton` and `frameCellIds`
become `SlideNavButton` and `slideCellIds`; the type `FrameLoss` becomes
`SlideLoss`, and its own doc comment already said it holds slices that lose
slides.

The correction runs in both directions, which is the part worth reading twice.
Three comments in the presentation view had a *frame* called a *slide* — the
strip described as "the slide's own cell slides", several frames on one slide
as "cell slides in one slide", the empty state as "no card slide". Those are
the same defect mirrored, and a sweep that only pushed one word toward the
other would have deepened them.

Nothing was pushed further than that. `screen` keeps every legitimate sense it
has: the Testing Library binding, `screenshot`, and prose about viewports and
surfaces — including the two comments that say a slice and its presentation are
one object rather than "two unrelated screens", and that presenting is a mode
of the slice and "not a separate screen". Both are the ordinary word used
correctly, and rewriting true sentences to satisfy a vocabulary rule is how the
sibling `layer`/`lane` sweep mangled forty of them. The layout contracts the
two spellings already agree on — `slideLayout.ts`, and the `data-slide-canvas`,
`data-slide-id` and `data-slide-sticky-header` attributes — are untouched.

The reference documents that describe the `slides` **table** stop calling its
rows frames: the data model listed the table as "One frame of a slice", the
adapter contract warned about a "frameless slice" and stranded "orphan frames",
and the guide said a slice's frames point at live cells. The slice authoring
**file format** is a separate question and is deliberately left alone — its
`frames` array is a schema key that existing slice files and the skill's own
tooling read, so it is a compatibility decision rather than a spelling one.

The assertion that holds this is an invariant, not a census of today's four
strings: nothing on the slice surface — no identifier, no string a reader
sees — is named a screen. It says nothing about how many strings there are, and
it deliberately makes no claim about `frame`, because a frame is a real thing
on that surface and any rule about the word would be a list of today's
identifiers. Comments are outside its subject for the same reason the
sentences above survive: prose may use an English word, a name may not misuse
one.
