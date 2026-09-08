/**
 * The surface a subtree is drawn on, told to the stylesheet by the component
 * that paints it.
 *
 * A role's tint is a six-percent step along the signed canvas→ink span, and an
 * elevation rung is a step of the same size. Derived from the page, the tint
 * therefore lands on top of any surface raised off the page: every role
 * measured 1.02:1 against a card in dark, where the card itself sits 1.09:1 off
 * the page. Light hid the same arithmetic behind a sign rather than escaping
 * it.
 *
 * A stylesheet cannot see what is behind a declaration, so the value has to
 * come from the one place that knows — the component that established the
 * surface. That is what this tier has always been for, and it is the same
 * mechanism `pathColorTheme` uses for a fill that comes from data: the element
 * carries the thing CSS could not work out, and the rule that matches the
 * element re-derives from it.
 *
 * Spread it onto the element that PAINTS the surface, not onto the tinted thing
 * inside it — an alert does not know what it was dropped into, and a card does
 * not need to be told. Everything below the ground inherits it.
 *
 * The names are the surfaces themselves, because that is what a component
 * knows about itself. It does not know, and should not have to know, that a
 * card is one and a half elevation steps up; `semantic.css` owns that, and the
 * rule in `styles/tokens.test.ts` holds this list and the scopes in that file
 * to each other so neither side can drift.
 */
export const GROUNDS = ['sidebar', 'card', 'popover'] as const

export type Ground = (typeof GROUNDS)[number]

/** Props for the element that paints `surface`. */
export function ground(surface: Ground): { 'data-ground': Ground } {
  return { 'data-ground': surface }
}
