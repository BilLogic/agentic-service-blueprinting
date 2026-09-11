---
'agentic-service-blueprinting': minor
---

A deployment names the lanes a new blueprint starts with. `DeploymentConfig` has a new optional field, `defaultLanes`, which is a list of `LaneSetEntry` (`{ name, lane_role, position }`). When someone creates a blueprint without copying lanes from an existing one, the new blueprint starts with those lanes, and the lane picker's "Standard set" option counts them. If the field is left out or empty, the new blueprint starts with the template's standard set, which is unchanged: Storyboard, Customer Actions, Front Stage Touchpoints, Front Stage Actions, Back Stage Touchpoints, Back Stage Actions and Support Actions. A supplied list replaces that set whole and is never merged with it.

`blueprintValidation.ts` no longer has to be forked for a deployment's own lanes. `laneSetFor(draft, defaultLanes)` takes the resolved lanes as an argument, and `CreateBlueprintDialog` passes what `useDeploymentConfig()` resolved. To supply its lanes, a deployment adds the field to the config it passes to `App`:

```ts
export const deploymentConfig: DeploymentConfig = {
  defaultLanes: [
    { name: 'Storyboard', lane_role: 'storyboard', position: 0 },
    { name: 'Caller', lane_role: 'customer_actions', position: 1 },
    // …one entry per lane, top to bottom
  ],
}
```

`CreateBlueprintDialog` now reads the deployment config, so a test that renders it has to wrap it in `DeploymentConfigProvider`, the same way the app already does.
