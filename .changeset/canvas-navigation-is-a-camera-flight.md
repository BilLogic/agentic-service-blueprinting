---
'agentic-service-blueprinting': minor
---

Canvas navigation is one continuous camera flight

Selecting a phase or a scenario used to cut to a fitted view. It is now a
flight: one timing family whose duration is read from what the reader can
see moving — the arrival centre's screen distance and the zoom ratio — and a
path that keeps the destination's screen-space approach monotonic, so a large
zoom-in never sends its target further away before arriving.

Flights interrupt and redirect rather than restart. A newer intent projects
whatever momentum is still compatible onto the new journey and drops the rest,
retargets when layout geometry moves underneath it, and carries visual focus
with the camera. Each canvas tab restores the view it was left at, and the
mobile shell replaces one scenario with another through a fade that waits for
the incoming board to fit.

The agent's `open_phase` and `open_scenario` no longer infer arrival by
polling for an idle camera — idle is also what a cancelled flight looks like.
The viewport publishes its exact outcome and the bridge reports that.
