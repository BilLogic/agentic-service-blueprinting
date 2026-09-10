---
'agentic-service-blueprinting': patch
---

The touchpoint cell hears the registry

`BlueprintTouchpointCell` called `getTouchpointTone` directly. That function
reads a module store, and a module store is invisible to React — which is what
`useTouchpointToneResolver` was written for, and what its own comment says:

> a cell that called it directly would draw whatever the store held at its
> first render and never hear that the rows had landed.

So a touchpoint cell mounted before the deployment's colours arrived kept the
default tone until something else re-rendered it. Every other surface that
draws a touchpoint already takes the hook; this one call site never switched.
