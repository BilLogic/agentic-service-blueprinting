---
'agentic-service-blueprinting': patch
---

The render walk chooses a port nothing holds, and refuses one you named that is held

The walk previewed on a fixed 4173, so the port was a thing only one tree on a
machine could use. A second checkout walking at the same moment, or a preview
somebody left running, held it — and the run that found it held aborted, a red
that reads like a regression in the application and is a fact about somebody
else's shell.

`render-walk/run.mjs` now decides the port before Playwright starts: 4173 if
nothing is listening there and no other walk has claimed it, otherwise the next
free port above it, up to 4204. Two walks started together take 4173 and 4174
and each walks its own `dist`. The choice is passed on as `RENDER_WALK_PORT`,
which is the config's own override, so nothing new crosses that seam; the
constant in `playwright.config.ts` is now the fallback for the one path the
runner is not on, Playwright pointed at the config by hand.

A port is claimed as well as tested, because free is not yet taken: between the
test and the moment Vite binds there are a couple of seconds of Playwright
starting up, and two runs launched together would otherwise both believe the
same port is theirs. The claim is one atomic file create under the temporary
directory, removed on the way out, and one left by a killed run is taken over
rather than believed.

`RENDER_WALK_PORT` still names a port outright and is the one fixed port left
in the arrangement: if something is already listening there the runner refuses
by name, says how to find out whose it is, and starts nothing. Nothing is ever
reused — what is already on a port is another build, and a green walk over it
would be a statement about code that is not in the working tree.

A deployment needs no free port of its own and no change to enrol.
