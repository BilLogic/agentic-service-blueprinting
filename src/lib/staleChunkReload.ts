import { useEffect } from "react";
import { storageKey } from "@/lib/storageNamespace";

/**
 * How a tab that outlived a deploy gets itself back.
 *
 * The app is served as content-hashed chunks, so a deploy replaces the file
 * names as well as the files. A tab that loaded before the deploy still holds
 * the old module graph, and the first lazy import it asks for afterwards
 * requests a chunk the new build never shipped. Vite raises
 * `vite:preloadError` for exactly that case, and unhandled it surfaces as
 * "Failed to fetch dynamically imported module" — a message that tells a
 * reader nothing and offers them nothing. The fix is the reload they would
 * have done by hand.
 *
 * ── WHY THE RELOAD IS SPENT ONCE ──────────────────────────────────────────
 *
 * A reload only helps when the chunk is missing because the tab is stale. If
 * it is missing because the deployed build is broken, reloading fetches the
 * same broken build, fails the same way, and reloads again: a tab spinning on
 * its own recovery, which is worse than the error it replaced. So the reload
 * is a single credit per browsing session, spent before navigating away and
 * recorded in `sessionStorage` — the one store that survives the reload and
 * dies with the tab, which is precisely the lifetime "this tab has already
 * tried" wants.
 *
 * The credit is deliberately never refunded on a later successful boot. The
 * preload error fires when the reader opens a transcript, which can be an
 * hour after the boot that would have refunded it, so a refund on boot is a
 * refund in time for the next failure — the loop again, only slower.
 *
 * WHAT THE CREDIT COVERS. The template's one lazy surface (the agent's
 * markdown renderer) keeps rendering its raw text when the chunk never
 * arrives, so a tab that has already spent its reload still shows the reader
 * the transcript, in plain text, until they refresh. A HOST CAN ADD A SECOND
 * lazy boundary — a blueprint registry supplied as a loader is the documented
 * one — and a loader that rejects is a throw this module does not soften: the
 * credit is one per tab, not one per import. That rejection is caught by
 * `App`'s app-scoped `EditorErrorBoundary` instead.
 */

/**
 * Namespaced with every other key this installation stores, for the reason
 * `storageNamespace.ts` gives: two installations served from one origin share
 * a storage area, and nothing about a key may be left to collide.
 */
const STORAGE_KEY = storageKey("chunk-reload");

/**
 * Claims this session's one reload, or reports that it is already spent.
 *
 * A storage that throws — private mode, blocked site data — counts as spent.
 * Without somewhere to record the attempt there is no way to stop a broken
 * build from looping, and an unbreakable loop is a worse trade than the raw
 * text the reader still gets.
 */
function claimTheReload(): boolean {
  try {
    if (window.sessionStorage.getItem(STORAGE_KEY) !== null) {
      return false;
    }
    window.sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
    return true;
  } catch {
    return false;
  }
}

/**
 * Listens for a chunk the deploy took away and reloads once. Returns the
 * removal, so a caller that mounts twice (StrictMode, a remount) leaves one
 * listener behind rather than two.
 */
export function installStaleChunkReload(): () => void {
  const onPreloadError = (event: Event) => {
    if (!claimTheReload()) return;
    // Vite's default is to rethrow onto the window. Taken only when the
    // reload replaces it; an error nobody is acting on is left to surface,
    // because that one is a report about a build rather than a stale tab.
    event.preventDefault();
    window.location.reload();
  };
  window.addEventListener("vite:preloadError", onPreloadError);
  return () => window.removeEventListener("vite:preloadError", onPreloadError);
}

/**
 * The listener, for the lifetime of the app root.
 *
 * It hangs off `App` rather than off an entry file because `App` is what a
 * deployment mounts: the template's own `main.tsx` and every deployment's
 * reach the app through here, so the recovery arrives with the app and no
 * host has to remember to install it.
 */
export function useStaleChunkReload(): void {
  useEffect(() => installStaleChunkReload(), []);
}
