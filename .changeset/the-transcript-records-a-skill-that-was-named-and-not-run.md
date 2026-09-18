---
'agentic-service-blueprinting': patch
---

A skill a reader named and chose not to run now leaves a row in the
transcript, so the decision survives the scroll and the reload instead of
living only in the moment it was made.

Typing `/audit` where the skill is `/sb:audit` invokes nothing, and the
composer has asked about that for a while: run it under its official name, or
send the sentence as text. Taking the second answer told the model in that
send's prompt that no skill ran — and told nobody else anything. An hour
later, or on a reopened session, the only trace of the decision was the token
sitting in a sentence, which is exactly the thing that reads as an
invocation. Half the original complaint was that nothing on screen *or in the
transcript* said so, and only the first half had been answered.

Sending as text now writes a row of its own under the message: the token as
it was typed, the skill that did not run, past tense, in the same quiet voice
every other non-turn row speaks in. It is not dressed as a failure — the
reader was asked a question with two answers and gave one of them — it does
not fold away into the "N steps" accordion where tool calls and errors go,
and it is written where every send passes through, so what the row says and
what the model was told cannot drift apart.

The row is a persisted event shape like any other: it rides the same
best-effort write-through to `agent_messages` and settles at the read
boundary, so a session opened in another browser shows it too, and
`get_session` spells it out for an agent catching up on a past conversation
rather than leaving it to infer from prose. Choosing to RUN the skill records
no such row — the badge on the turn and the skill's body in that turn's
prompt are already the evidence, and a second claim about the same fact is
only a second thing to keep in agreement.

**For a deployment owner:** nothing to configure and no migration. Rows of
the new shape appear in `agent_messages` for sends where a reader declined an
offer; a build that predates this one ignores them, and a transcript with
none of them reads exactly as it does today.
