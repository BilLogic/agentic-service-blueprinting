---
'agentic-service-blueprinting': patch
---

One message can carry as many skills as its text names, every one of their
instructions joined to the system prompt for that message and every one of
them recorded in the transcript.

A draft held one skill, so naming a second silently replaced the first:
"build this from my notes /sb:map then /sb:audit it" could not be asked in one
message even though the two flows compose. The skills a message runs are now
read out of its text at send — every word-start token that resolves, in the
order the tokens appear, each skill once however many times it is named, with
no ceiling. The reader is the one who knows how many flows their message is,
and the sentence they wrote is where they say so. A message that names none
behaves exactly as before, and a message that is nothing but tokens still
sends a usable instruction, naming the order it will work through them in.

The prompt names that order when there is more than one and asks for each flow
in full rather than a blend, and the sentence that translates a skill for this
surface is said once rather than per skill. A message carrying one skill
produces a byte-identical prompt to the previous release. The prompt-cache
breakpoint is measured through the same builder the prompt is assembled with,
so several skill bodies move it past all of them instead of cutting the prompt
mid-skill.

**The menu keeps offering after the first skill, and the notice names every
near miss.** A lookup used to refuse to open once the draft began with a
resolved skill — a head command owning its arguments, as it does in the tool
this composer mirrors — so `/sb:map notes then /sb:au` offered nothing and the
second skill had to be typed out in full. That guard is gone: what it was
protecting costs nothing without it, since a path typed for a skill to read
opens a lookup matching no skill and a lookup with no matches opens no menu.
For the same reason the near-miss notice now reads out every token in the
draft that nearly names a skill rather than the first: "check /audit then /map
this" names both, accepting one rewrites that token and asks again about the
next, and a sentence sent as prose tells the model about all of them. One
reported and the rest left out was the same silence with a smaller mouth.

**A turn read back from the database keeps its skills.** The transcript
records every skill a message invoked. Rows persisted by earlier releases name
one skill in a field of its own, and that is settled into the list this build
carries at the READ boundary — once, where the row arrives — rather than at
each place a row is drawn, so a reopened session shows what it was sent with
and nothing downstream has to remember the older shape.

Each body is several kilobytes, so a message carrying all four is a
substantially fuller prompt before board context loads. There is deliberately
no cap: if that degrades answers the evidence arrives as behaviour, and a
limit can be decided then.
