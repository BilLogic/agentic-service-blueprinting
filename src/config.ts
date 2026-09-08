/**
 * Template-level configuration.
 *
 * ORG_NAME is the workspace/product name shown in app chrome (sidebar
 * wordmark, breadcrumbs). Change it when instantiating the template for an
 * organization; the browser tab title lives in index.html.
 */
export const ORG_NAME = 'Agentic Service Blueprint'

/**
 * The brand block a deployment writes its own values into.
 *
 * This module is already the file an instantiation edits — `ORG_NAME` is here
 * for exactly that reason — so it is also where the accent belongs. The
 * alternative was editing `deploymentConfig.ts`, a module whose other three
 * hundred lines an adopter has no quarrel with; a fork should be the small
 * file that exists to be forked.
 *
 * `accent` is the colour an installation is branded on, written the way a
 * deployer knows it: a CSS hex. `lib/brandAccent.ts` is its reader and its
 * header says exactly how far the value reaches.
 */
export type Brand = {
  /** CSS hex, `#RGB` or `#RRGGBB`. Omit to keep the theme files' own hue. */
  accent?: string
}

/**
 * The template's own brand: no accent, deliberately.
 *
 * Omitting the field is a real value here rather than a hole waiting to be
 * filled. `styles/themes/light.css` and `dark.css` ship `--chroma: 0` and
 * `--primary-chroma: 0` over a greyscale `--brand-*` ramp, so this kit has no
 * brand colour for an accent to be the hue of — the `--hue: 159` those files
 * declare is pinned to `--brand-hue-reference` to keep the status hues on
 * their anchors, not because anything is painted at 159. Naming a hex here
 * would assert a brand the stylesheet cannot show.
 *
 * A deployment built on this template writes its own hex into this constant
 * and layers a theme file whose `--brand-*` ramp is drawn at that hue; the two
 * belong together, and `lib/brandAccent.ts` carries why the accent alone moves
 * so little.
 */
export const BRAND: Brand = {}
