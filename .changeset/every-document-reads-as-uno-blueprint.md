---
'agentic-service-blueprinting': patch
---

Every document reads as Uno Blueprint

The README, SETUP, CONTEXT, the guides, the ADRs, the connector notes, the
workspace handoff template and this changelog name the template Uno Blueprint,
the plugin `ub` and the skills `ub:map`, `ub:slice`, `ub:audit` and `ub:whatif`.
The schema migration's header comment names the template the same way; the
schema itself is unchanged.

`check:standalone` now fails on any other name for the package, its skill
namespace or its marketplace, as well as on the deployment's names. The npm
package name, the repository slug and the `ASB01` errcode an applied migration
raises still pass. A deployment that runs the template's guard over its own
tree sees the new patterns.
