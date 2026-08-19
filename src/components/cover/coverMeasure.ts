/**
 * The cover page's one measure.
 *
 * Every block on the page — the lede, prose, intro lines, definition tables
 * and figures — is bounded by this and nothing else. It exists as a constant
 * because it previously did not, and the page showed it twice over: prose
 * sat at `max-w-2xl` while figures ran to `max-w-3xl`, so every figure
 * overhung the paragraph above it and the column edge moved at each image;
 * and the header's lede was `max-w-3xl` against `max-w-2xl` content, so the
 * title block and the tab body below it did not line up either.
 *
 * 48rem, the wider of the two, because the header sets the page's edge and
 * the reader meets it first — narrowing the body to 42rem left the whole
 * page looking indented under its own title. It runs a little past the
 * classic 45-85 character measure at the body size; that is the accepted
 * cost of one edge down the entire page, and it buys the 880px-wide
 * diagrams noticeably more room.
 *
 * Import it. Do not restate the value — two literals is how the page got
 * into this state.
 */
export const COVER_MEASURE = 'max-w-3xl'
