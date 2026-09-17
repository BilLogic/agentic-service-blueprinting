---
'agentic-service-blueprinting': patch
---

One message can carry as many skills as the reader picks, each as its own
removable badge, every one of their instructions joined to the system prompt
for that message and every one of them recorded in the transcript.

A draft held one skill, so picking a second silently replaced the first: "build
this from my notes, then check it" could not be asked in one message even
though the two flows compose. The draft now holds a list, in pick order, with
no ceiling — the reader is the one who knows how many flows their message is.
Picking the same skill twice counts once, Backspace on an empty draft drops the
newest, and a message with no skills behaves exactly as before. Skills with no
prose still send a usable instruction, naming the order they were picked in.

The prompt names the order when there is more than one and asks for each flow
in full rather than a blend, and the sentence that translates a skill for this
surface is said once rather than per skill. A message carrying one skill
produces a byte-identical prompt to the previous release. The prompt-cache
breakpoint is measured through the same builder the prompt is assembled with,
so several skill bodies move it past all of them instead of cutting the prompt
mid-skill.

**A turn read back from the database keeps its skills.** The transcript records
every skill a message invoked. Rows persisted by earlier releases name one
skill in a field of its own, and the read settles them into the list this build
carries, so a reopened session shows the badge it was sent with.

Each body is several kilobytes, so a message carrying all four is a
substantially fuller prompt before board context loads. There is deliberately
no cap: if that degrades answers the evidence arrives as behaviour, and a limit
can be decided then.
