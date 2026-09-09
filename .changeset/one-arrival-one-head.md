---
'agentic-service-blueprinting': patch
---

Arrivals that converge on one cell draw one trunk and one head whatever column
each of them left from.

When several dependencies land on the same edge of the same cell, their last
segments merge into a single path-coloured trunk carrying one arrowhead: the
reader is told "these all cause that", which is one fact rather than N. The
merge chose where to gather by asking one of its members — whichever one the
group happened to list first — where the column gap before the shared target
was. That question only has an answer inside that member's own lane, and when
the lane holds no card in the column before the target the answer fell back to
a fixed inset from the target's edge that lands inside the arrowhead. The
clearance test then declined the merge for the whole group, so every member
kept its own head: three arrowheads stacked on one edge where the promise was
one trunk and one head.

Measured on a board that showed it. The target's left edge sits at 992 and the
head's base at 976, the lane of the first-listed member holds no card in the
column before the target, so the gather was placed at 980 — four pixels past
the point the head has to start at — and the merge was declined before the
per-member test ever ran. The two members whose lane does hold a card there
would each have answered 966, which merges.

Two faults on one line. The gather is a property of the shared target's column
and not of any one member's, so asking a member at all makes the picture depend
on which member the group happens to list first. And the per-lane fallback is
not a gap at all; it cannot produce a junction the clearance test will accept.

So the gather is read off the target column instead: the middle of the clear
strip between the widest card edge in the column before the target — over every
lane, because a vertical that crosses lanes needs a strip no card occupies —
and the target's own edge. Where that column holds no cards the board's own
column-gap element bounds it, and where neither is measurable the fixed offset
in front of the entry point remains. That is one answer for the whole group,
and it is the same answer in either listing order.

The two clearance guards are untouched, and so are the cases deliberately left
out: merging still applies only where it reduces overlap, a trunk drawn through
a card is still worse than N heads, and backward loops and same-column
connectors still keep their own heads.

The situation catalog gains the case this was — two arrivals at one cell from
different step columns, with the far one's lane empty in the column before the
target. It fails on the previous geometry, two heads and no trunk, and the test
beside it asserts the trunk is identical when the pair is listed the other way
round. Every existing catalog frame is unchanged; the three added frames are
the new case's.

The four files this touches are enrolled in the deployment's reconciled-files
list, so that gate stays red there until the next pin bump.
