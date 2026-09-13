import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { arg } from '@/lib/agent/tools/definition'
import {
  resolveServiceScope,
  type ServiceScope,
} from '@/lib/agent/tools/serviceScope'

type Client = SupabaseClient<Database>

/**
 * The service-scope filter shared by the reads that take one. It is a FILTER,
 * not a navigation mode, and it NARROWS: omitting it searches every service in
 * the deployment, naming one confines the read to it, and "all" says the
 * default out loud. The description has to say what omitting it gets, because
 * that is the choice a model makes every time it calls one of these tools —
 * and on a deployment with several services the difference is real. Inert on a
 * single-service deployment, where every value names the same one service.
 */
export const SERVICE_ARG = arg.optionalText(
  'Optional. Which service to search: a service name, or "all" for every service in the deployment. Omitting it searches EVERY service — the default is the whole deployment, not the one on screen. Name a service to confine the read to it. Ignored when the deployment has only one service.',
)

/**
 * The scope one read covers: the tool's own `service` argument, or every
 * service in the deployment when it names none. Resolved per call rather than
 * cached, because a deployment's roster of services can change under it.
 *
 * `ctx.scope` is not consulted yet: today it is always the whole deployment,
 * which is what an unnamed service resolves to. The day a session carries the
 * active service, this is the function that starts reading it.
 */
export function readScope(client: Client, service: string | undefined): Promise<ServiceScope> {
  return resolveServiceScope(client, { serviceArg: service })
}
