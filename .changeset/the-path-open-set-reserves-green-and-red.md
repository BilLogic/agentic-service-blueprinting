---
'agentic-service-blueprinting': minor
---

The path open set reserves green and red.

**Four families, not seven.** A path with a name rather than a type used to be
drawn from seven families — indigo, tomato, purple, gold, crimson, yellow, red
— which meant a variant could come out crimson, tomato or outright red while
not being an exception at all. Red is the one colour on a service blueprint a
reader should never have to decode, and spending it on a route that is merely
different is what makes it need decoding. The open set is now `indigo, purple,
gold, yellow`; green belongs to the happy path and red to exceptions, always.

**A reserved type never consults the name.** `getPathColor` short-circuits
`happy` and `exception` to their type colour before it looks at anything else,
so renaming an exception cannot make it stop being red. Two exceptions in one
scenario are therefore the same fill by design — which is why the dash is now
read from the path instead of from its type, since inside that scenario the
dash is the only channel left. Seven patterns against four families, kept
coprime on purpose: a repeated hue lands on a different pattern, so the pair is
unique for 28 paths where the old arrangement — seven against seven, both off
one hash — repeated after 7.

**One lane overlap instead of two.** `variant` was blue against the blue
`evidence` lane, and a 2px path line could land in exactly the hue of a lane it
crossed. Its fallback moved onto the open set's first family. The remaining
overlap is `happy` against the green `actor` lane, which cannot be reallocated
— nine lane families plus seven touchpoint tones is the whole palette — so it
is named in `palette.test.ts` and held to a heavier step than the lane fill.

**The hash carries more, so it is a real one.** Slots came off a sum of
character codes, which is order-invariant: two names built from the same
letters took the same colour AND the same dash. That was survivable while seven
families were open and pinned paths skipped the hash; it is not, now that every
unpinned path goes through it. FNV-1a.

**The palette tests measure the mechanism.** The brand assertion read
`expect(THEME_DIALS.light.C).toBe(0)` and conceded in its own comment that a
fork would have to edit it. It now asserts what the number stood for — that
chroma does not change between themes, true of a neutral template and a branded
deployment alike — plus that every chroma dial is declared in both theme files
rather than leaking across. The path assertions read the open set off the
module rather than naming the template's hues.
