/**
 * What each divider line means, in the words a service designer would use.
 *
 * These three lines are the whole grammar of a service blueprint and the
 * canvas states them as three unexplained captions. A reader who does not
 * already know the convention has nowhere to find out. The label names the
 * line and the definition says what it separates — one term, one meaning,
 * which is one section of a `DefinitionCard`.
 */
export const DIVIDER_MEANINGS: Record<string, string> = {
  'line of interaction':
    'Above it, what the customer does. Below it, the staff and systems they interact with directly.',
  'line of visibility':
    'Everything below this line happens out of the customer\'s sight.',
  'line of internal interaction':
    'Below it, the support work that never touches the customer — the teams and systems the backstage relies on.',
}
