---
'agentic-service-blueprinting': patch
---

A throw above the editor is a message a reader can act on, not a white page.
The app's only error boundary sat below eleven providers, so anything that
failed outside it — the deployment seam, the database client, the active
service, the components that reach the address bar, the notice strip — took the
document to blank with the error somewhere only a developer with the console
open would find it. `App` now opens with the same boundary in an `app` scope,
above everything it renders.

One of those throws is deliberate and is the one this closes. A blueprint
registry supplied as a lazy loader is a second chunk boundary that resolves at
boot, and a loader that rejects is rethrown rather than falling back to the
package's own board — a deployment's chrome around a canvas its identifiers
cannot fill is the silent version of the failure. That throw now lands on a
card naming the failure and offering a reload, with the error still logged.

It is one class and one design, not a second surface: `EditorErrorBoundary`
takes a `scope`, and the two placements differ only in the sentence they show a
reader, because a view inside a working app can be navigated away from and a
start-up failure cannot. A deployment gets this by upgrading its pin; nothing
in a host's entry file has to change, and a host that had been told to install
a boundary of its own above `App` no longer needs one.
