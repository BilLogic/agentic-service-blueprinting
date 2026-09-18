---
'agentic-service-blueprinting': patch
---

A status option says what it means once

Picking a status in the entity panel used to offer six one-line options with the
meaning glued onto the name behind a dash — "Proposed — design only". The same
six states were explained a second time, at more length and in different words,
in the hover on the status badge, so the two sentences could disagree and did
not have to be changed together.

The option list now shows the name with that hover's own line beneath it in
caption grey: "Proposed", then "Designed and discussed, with no build card
behind it. It may never happen." One authored sentence per state, shown in both
places. The status names themselves are unchanged, nothing stored changes, and
the closed control still shows the name alone — there is no room on one line for
a sentence, and the list and the badge are where the meaning is read.

The guard that checks a definition never repeats the word above it now reads the
select's option list too, so a meaning edited into "Live is in use today" fails
the suite instead of shipping.
