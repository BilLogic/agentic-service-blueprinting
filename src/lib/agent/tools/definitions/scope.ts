import { arg, requireClient, type ToolContext } from '@/lib/agent/tools/definition'
import {
  resolveServiceScope,
  type ServiceScope,
} from '@/lib/agent/tools/serviceScope'

/**
 * The service-scope filter shared by the reads that take one. It is a FILTER,
 * not a navigation mode: omitting it reads the service on screen — the one
 * the session was handed, the same default the interface has — naming one
 * moves the read to it, and "all" widens to every service in the deployment.
 * The description has to say what omitting it gets, because that is the
 * choice a model makes every time it calls one of these tools — and on a
 * deployment with several services the difference is real. Inert on a
 * single-service deployment, where every value names the same one service.
 */
export const SERVICE_ARG = arg.optionalText(
  'Optional. Which service to read: a service name, or "all" for every service in the deployment. Omitting it reads the ACTIVE service — the one on screen, the same default the person has. Name another service to read it instead, or "all" to span the deployment. Ignored when the deployment has only one service.',
)

/**
 * The scope one read covers: the tool's own `service` argument, or the
 * session's scope — the active service — when it names none. Resolved per
 * call rather than cached, because a deployment's roster of services can
 * change under it.
 */
export function readScope(ctx: ToolContext, service: string | undefined): Promise<ServiceScope> {
  return resolveServiceScope(requireClient(ctx), { serviceArg: service, active: ctx.scope })
}
