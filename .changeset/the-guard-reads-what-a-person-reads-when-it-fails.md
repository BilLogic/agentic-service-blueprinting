---
'agentic-service-blueprinting': patch
---

**The citation guard now reads test names and failure messages, which is where
a reader meets a dead pointer at the worst possible moment.** `proseLines`
returned comments and whole documents and stopped at the quote mark, so two
dangling `docs/adr/0011-…` paths sat inside a session pin's own assertion text
through a sweep that had just been measured and closed, and were found by hand
afterwards. A guard that skips the text a reader has when the gate is red is
missing the case that matters most.

What it reads is a test's name and a failure's message, not every quoted
string. Position is what separates the message from the data beside it:
`expect(value, message)` hands the first argument to a comparison and the rest
to a reader, a test's name is its first argument and the body after it is
addressed to the compiler again, and `it.each(table)(name, fn)` puts the table
where the name usually goes — so a swatch stays out without an exemption. The
wider reading was measured too, and on this tree it finds five strings, every
one of them a hex colour or a product label the module already documents as not
a citation, and not one citation the narrow reading misses. A guard that flags
five colours to catch nothing gets turned off.

The new surface is 2,643 prose lines across 282 files, and none of them cites a
number: the widening is a fence around the two that #645 fixed by hand rather
than a sweep with findings of its own. Replayed against the tree as it stood
before that fix, it reads exactly the three it was filed for — the pin's test
name and its two assertion messages — and nothing else.

The three files that define what a citation is stay exempt, and the exemption
matters more now: a guard whose subject is a citation writes most of its
examples in test names and assertion messages, and a test named for the thing
it refuses is the clearest name it can have.
