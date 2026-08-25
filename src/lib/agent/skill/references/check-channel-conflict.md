# check: channel-conflict
wave: 1
severity-default: warn

## Question
Where do simultaneous cells compete for the same actor or the same channel
— one human required in two places, one screen showing two things?

## Read
Column by column (a step is simultaneity). Within each step: which cells
name the same actor across lanes; which name the same tool/channel. Then
dependencies that fan out from one cell to multiple same-step targets.

## Finding shape
One finding per (step × contested resource). cell_keys = the competing
cells. Note names the actor/channel and the collision, by key. An actor
required in N places at one step → warn; the spine actor blocked by it →
critical. If the chain is unclear, dispatch impact-tracer on the
suspected cells and cite its downstream list.

## Non-findings
The same TEAM (not person) appearing twice is staffing, not conflict.
Sequential use inside one step (content says "then") is not simultaneity.
Broadcast tools (a dashboard many people watch) don't conflict.
