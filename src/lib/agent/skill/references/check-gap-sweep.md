# check: gap-sweep
wave: 1
severity-default: warn

## Question
Which moments the customer or an actor plainly experiences have no cell —
where does the blueprint go silent while the service keeps happening?

## Read
Per path, in step order: the step list vs each lane's cells. Then the
trigger graph.

## Finding shape
Emit one finding per contiguous silent stretch, not per empty cell:
- A lane empty across 3+ consecutive steps while its actor is clearly still
  present in the journey → cell_keys = the flanking cells; note names the
  silent steps.
- A trigger whose narrative implies a follow-up ("which kicks off…") with
  no cell at the receiving end → warn; cell_keys = the source cell.
- The inverse: a cell whose narrative promises an INBOUND transition
  (reopen, return, retry, "comes back to…") with no incoming trigger edge
  → warn; cell_keys = the promising cell.
- A step no path includes (declared but orphaned) → info; scope-key
  fingerprint.
Raise to critical when the gap touches the interaction line — the rule
applies if ANY step inside the silent stretch is a customer-visible
moment with no frontstage cell at all (not only when the finding is
itself that moment).

## Non-findings
Empty cells are NORMAL — a lane legitimately idle at a step is not a gap.
Only flag silence that the surrounding cells' content contradicts. Never
propose invented content; the finding names the hole, the human decides.
