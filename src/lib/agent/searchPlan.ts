import type {
  AgentSearchIndex,
  ResolvedAgentSearchConfig,
} from '@/deploymentConfig'
import { asbDefaultAgentSearch } from '@/deploymentConfig'
import type { AgentProviderId } from '@/lib/agent/settings'

/**
 * Whether this session gets ranked blueprint search, and with which vector
 * index.
 *
 * Three states, and the difference between the last two is the whole point of
 * this module:
 *
 *   offered: false          the tool is not on the roster at all
 *   offered, index: null    keyword and structural matching only
 *   offered, index: entry   the question is embedded first, meaning too
 *
 * `offered: false` is QUIET. The person is not told they are missing a tool,
 * no error is raised, and the model is never HANDED a name it cannot call —
 * a spec absent from the roster cannot be invoked, so nothing describes a
 * capability this session has. That matters most for the case it exists for:
 * a person on an Anthropic key, where a keyword-only search offered as
 * "search" would read as the same search everyone else gets.
 *
 * Quiet, not silent, and the difference is worth stating. The shared canvas
 * adapter reference is injected whole on every send and lists the full read
 * surface, this tool among it — so the model does read the NAME even where
 * the roster withholds the tool. That row says a tool missing from the tool
 * list does not exist in the session, that nothing substitutes for it, and
 * that there is nothing for the person to change, which is what keeps the
 * mention from becoming an offer. Withholding the name from that reference
 * instead would leave the one surface that claims to be the complete read
 * surface incomplete.
 */
export type AgentSearchPlan =
  | { offered: false }
  | { offered: true; index: AgentSearchIndex | null }

/**
 * The template's own state until a deployment says otherwise. Held as a
 * module value for the same reason the cell budget is: the roster filter and
 * the tool's own dispatch both ask this question, neither is a React
 * component, and a config read at render time cannot reach either.
 */
let search: ResolvedAgentSearchConfig = {
  enabled: asbDefaultAgentSearch.enabled,
  indexes: [...asbDefaultAgentSearch.indexes],
}

/**
 * Replace what {@link agentSearchPlan} reads.
 *
 * Called from `DeploymentConfigProvider` in a layout effect, and from tests
 * directly. `undefined` means the deployment named no search section, which is
 * the template's own state: search off, nothing listed. Replaces rather than
 * merges — a supplied section is the whole answer — and copies, so a later
 * mutation of the host's object cannot change which model a browser embeds
 * with.
 */
export function configureAgentSearch(
  next: ResolvedAgentSearchConfig | undefined,
): void {
  search = {
    enabled: next?.enabled ?? asbDefaultAgentSearch.enabled,
    indexes: (next?.indexes ?? asbDefaultAgentSearch.indexes).map((index) => ({
      ...index,
    })),
  }
}

/**
 * What this person's provider can reach.
 *
 * The provider is the person's CURRENTLY SELECTED chat provider, because the
 * key that would embed their question is the key they are already chatting
 * with — there is no second key to fall back to, and a key they saved for
 * another provider is not one they chose for this conversation.
 *
 * A non-empty index list with no entry for that provider is `offered: false`,
 * not keyword search. The deployment holding an index it cannot serve this
 * person from is the case the quiet omission is for: Anthropic has no
 * embedding model and is never listed, and OpenAI is unlisted until a
 * deployment builds an OpenAI index. An EMPTY list is different in kind — the
 * deployment holds no index at all, so nobody is being singled out, and
 * keyword search is what ranked search means here.
 */
export function agentSearchPlan(provider: AgentProviderId): AgentSearchPlan {
  if (!search.enabled) return { offered: false }
  if (search.indexes.length === 0) return { offered: true, index: null }
  const match = search.indexes.find((index) => index.provider === provider)
  if (!match) return { offered: false }
  return { offered: true, index: { ...match } }
}
