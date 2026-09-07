---
'agentic-service-blueprinting': patch
---

A detoured same-column arrow stops pointing its head backward along the time axis.

Two cells in one step column but different lanes are joined by a vertical
connector. When another card sits between them the straight run would strike
through that card's text, so the route brackets out through a column gutter
instead: out of one card's side, along the gutter, and back into the other
card's matching side.

Which gutter it took was decided by reach — the nearer one won. That meant the
head's direction was decided by reach too. A side-on arrival out of the RIGHT
gutter draws its last stub leftward, and the markers are `orient="auto"`, so
the head followed that stub and pointed backward along a grid whose one
ordering claim is that time runs left to right. A same-step connector does not
move in time at all, so that head was a plain lie about the dependency. It was
also inconsistent with the connector's own undetoured form, which ends
vertically with the head pointing down or up. Measured on one board of a
deployment built on this template: eleven arrows ended with a leftward final
segment, on a path containing no backward dependencies whatsoever.

An arriving end now turns back into its card VERTICALLY where there is room —
onto the edge facing the other cell first, so the head reads exactly as the
undetoured connector's does, and onto the far edge as a second chance, where a
head pointing the other way up still says nothing false about a horizontal
ordering. A departing end carries no head and still leaves side-on, which is
what made this route preferable to leaving through an edge another card leans
against.

Where both horizontal edges are walled in, the arrival falls back to the side
entry it always used, and the gutter preference changes to make that fallback
safe: the LEFT gutter now wins outright rather than the nearer one, because its
stub always travels forward. The nearer gutter was at most a fraction of a
column gap closer.

The new legs are swept for clearance as they will actually be drawn.
`isSameColumnSideRouteClear` only ever covered the mid-height stubs and the
stretch of gutter between them, and a vertical arrival leaves the gutter
somewhere else — an arrival on the far edge leaves it beyond the pair
altogether. When that sweep is not clear the pair falls back to the two side
stubs, which the route's own test does cover.

With both ends side-on the path is the one this builder has always drawn, point
for point, and the undetoured vertical connector is untouched.
