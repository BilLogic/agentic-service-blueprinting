---
'agentic-service-blueprinting': patch
---

The vendored sidebar no longer writes an un-namespaced cookie that nothing
reads, and `npm run check:storage-keys` now covers cookie names as a third
store beside `localStorage` and `sessionStorage`.

The sidebar primitive set `sidebar_state` on every toggle, which is how
upstream tells a SERVER rendering the next request what to pass `defaultOpen`.
Nothing in this package is that server: it renders in the browser, no module
reads the cookie, and the sidebar's collapse is the editor shell's own state.
So the write left a bare name in a cookie jar every installation on an origin
shares, for no reader — and it was the one name in the app that the namespace
seam did not build. It is deleted rather than namespaced, and the guard now
sweeps the generated primitives directory for cookie names, so a re-vendor that
restores the write goes red.

Nothing an installation can see changes: no state was remembered before this
release, so none resets, and a deployment needs no change.
