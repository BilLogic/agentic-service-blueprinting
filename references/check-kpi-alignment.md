# check: kpi-alignment
wave: 2   # needs lane `kpis` (and optionally `tools`); skip if absent/empty everywhere
severity-default: warn

## Question
Do the lane's KPIs reward what its cells actually do — or do they reward
something the journey never shows?

## Read
Per lane with non-empty `kpis`: the KPI list vs that lane's cells across
all steps and paths. `tools` for whether the measured thing is even
instrumented.

## Finding shape
Two directions, one finding each per lane:
- A KPI no cell contributes to (measured but never enacted) → warn;
  cell_keys = the lane's cells (or scope-key if the lane is empty).
- A dominant cell activity no KPI rewards (enacted but never measured) →
  info; cell_keys = the strongest example cells.
Note cites the KPI text and keys — no invented metrics.

## Non-findings
Org-level KPIs (NPS, revenue) that legitimately roll up beyond one lane;
lanes with kpis deliberately empty (skip, don't flag).
