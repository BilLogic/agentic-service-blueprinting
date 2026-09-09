---
'agentic-service-blueprinting': patch
---

The changelog and the changesets leave the content scan, and prose that spells
a theme key now fails a rule instead of quietly shipping one.

Tailwind v4 settles which theme keys reach the built stylesheet by scanning the
repository: a key whose name the scan finds anywhere is emitted at the root,
and a key it never finds is dropped. In markdown, any name of that shape is
found — bare or backticked, prose and asides alike. The entry sheet already
spends three exclusions on that hazard, for the documentation tree, the scripts
and the test files. The changelog was not among them and neither were the
changesets waiting to be folded into it, both sitting at the repository root
squarely inside the scan.

Measured, not argued. A probe changeset naming a registered-but-unemitted
radius key, and a probe line in the changelog naming another, each put exactly
its own key into the built stylesheet and moved nothing else. Removing them
again is what the two new exclusions do.

WHAT LEAVES THE ARTIFACT is one theme key and eight utility classes, 0.51 kB
of 294.73 kB, and nothing renders any of them. The key is the Tailwind-
namespaced alias for the inverted-ink colour, and it stood in the shipped
stylesheet for one reason: a release note describing its removal from the
compatibility layer spelled it in backticks. Its three other occurrences are
its own registration, a paragraph of stylesheet prose, and a test — none of
them a read, because a stylesheet offers a name only inside a `var()` and the
test files are already outside the scan. The semantic token underneath it is
untouched and still emitted, and the registration is an inline one, so a
utility written against that name tomorrow compiles to the value and never
wanted the custom property. The eight classes are each named in exactly one
release note and in no file a browser reaches; every occurrence of all nine was
enumerated before the departure was called correct, rather than inferred from
the size drop.

WHY IT COMPOUNDS, and the half worth fixing more than the exclusion. Cutting a
release folds each changeset into the changelog permanently, so a sentence
written today holds a key in the build for the life of the repository, long
after whatever it was written about is gone — and nothing fails, which is why
this stood for two releases. It reached back into the release process, too: a
note explaining why a token arrived or left had to avoid spelling the token,
which is not something anyone should have to remember at the moment they are
writing down what they changed.

A RULE, NOT A LONGER LIST. The exclusions say which files are prose; nothing
said the set was complete, and the kind of prose nobody thought of failed
nothing at all. The new rule states the property instead: no theme key may be
spelled in any markdown the scan still reaches. It takes the key names and the
exclusion patterns from the token model and the entry sheet rather than
restating either, asks git for the file list so the answer moves with
`.gitignore` instead of with a skip list, and needs no exemptions — the subject
is a kind of file, several dozen of them today, not an enumeration. It fails on
the sentence and names its author, so it survives a document being moved or
renamed, and it went red on all three of the changelog's spellings when the
exclusions were taken back out.

Its limit is stated where it lives: class names get no equivalent and cannot
have one, because any English word can be a utility and there is no finite set
to intersect against. For those the exclusions remain the whole of the defence.
The companion rule guarding the other direction — that the token model samples
nothing the scan is told to skip — pins the exclusion patterns, so it went red
on the two additions and was updated with them, which is the review it was
built to force.

`src/styles/tailwind.config.css` is enrolled in the deployment's
reconciled-files list, so that gate stays red there until the next pin bump.
