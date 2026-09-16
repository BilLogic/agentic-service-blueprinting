---
'agentic-service-blueprinting': patch
---

A hashed chunk the deploy no longer ships answers 404, and the ones it does
ship are cached for a year.

`netlify.toml` held one redirect, the single-page catch-all, and a host takes
the first rule that matches — so a name under `/assets/` this deploy does not
have was answered with `index.html`: a 200, and `text/html`, where a script was
asked for. What the browser reports for that is a module it could not import,
naming the import site and not the missing file, which is why it reads as a
bundling problem for as long as anyone believes it. A `/assets/*` rule with a
404 sits above the catch-all now. An asset that IS there is still served
because a host does not shadow existing content with a non-forced rule — the
file wins, and the rule is consulted only where there is no file. `:splat` is
not what does that; it keeps the target honest, and `force` must never be added,
because a forced rule answers 404 for every asset the site has.

`public/_headers` gains `Cache-Control: public, max-age=31536000, immutable`
for `/assets/*`, and for nothing else. The content hash in the name is what
makes a year safe, and the shell is what delivers the new hashes — a shell
served from an old cache asks for chunks the site no longer has, which is the
same failure from the other side. The CSP block is untouched.

`npm run check:hosting` holds all of it: that the 404 precedes the catch-all, an
order a diff reads as correct either way; that neither rule is forced; that the
long cache covers the hashed output alone, in whichever of the two header
sources it was written and under whichever `*-Cache-Control` name; and that a
`public/_redirects` a repository started from this template adds — a file a host
reads BEFORE the configuration file — carries the same order.

A deployment that already added these two rules to its own copy of the host's
configuration needs no change — this is the template catching up with it.
