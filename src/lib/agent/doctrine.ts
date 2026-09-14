/**
 * The deployment's doctrine: a system-prompt overlay, supplied through
 * `DeploymentConfig.agent.doctrine` and laid after the role and the canvas
 * adapter on every send. The template's own prompt is the role document;
 * this is what one deployment adds to it — its house rules, its posture, the
 * account of itself it wants the agent to hold — without replacing the
 * template's text or carrying a role document of its own.
 */

let doctrine = ''

export function configureAgentDoctrine(next: string | undefined): void {
  doctrine = next?.trim() ?? ''
}

/** The overlay as it joins the prompt; empty when the deployment set none. */
export function agentDoctrine(): string {
  return doctrine
}
