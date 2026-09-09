/**
 * A row's secondary control waits for a reader.
 *
 * A list row says what it is at rest. What it *offers* — the why-line under a
 * dependency, the grip that reorders a resource — is worth reading one row at
 * a time and not worth reading down a list of eight. Static, those controls
 * doubled the row's height or lined its edge with grey furniture, and made the
 * list's shape depend on how much each row happened to carry.
 *
 * Revealed rather than removed, and by one rule: hover OR focus anywhere in
 * the row — so the row itself carries `group` — and always visible where the
 * pointer is coarse, because an affordance that only exists under a mouse is
 * not an affordance for everyone. Opacity alone, so the row keeps its height:
 * a list whose rows grow under the pointer moves the row being pointed at.
 * What is revealed stays in the DOM at all times, so a screen reader reads it
 * and the keyboard reaches it whether or not anything is hovering.
 *
 * One copy, in a module of its own, because two callers in different folders
 * hand-copying the same class list is how the two drift apart.
 */
export const ROW_REVEAL_CLASS =
  'opacity-0 transition-opacity duration-(--motion-micro) group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none [@media(pointer:coarse)]:opacity-100'
