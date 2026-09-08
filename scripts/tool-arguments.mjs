/**
 * Check — the agent tool's wire, read from both ends.
 *
 * A tool call crosses two files that no compiler compares. `specs.ts` declares
 * the arguments a model may send; `registry.ts` reads them out of an
 * `args: Record<string, unknown>` by string key. Both typecheck no matter what
 * they say, because neither one names the other's keys in a type.
 *
 * #272 is what that costs. `create_slice` advertised `description` and read
 * `summary`, so a model that filled in the field the schema offered wrote an
 * empty summary and was told the slice had been created. `update_slice` was
 * worse: it kept the old summary and reported success, so an edit meant to
 * change the description changed nothing. Neither raised, and nothing could —
 * the two strings are in different files and nothing brings them together.
 *
 * SUBJECT: the argument NAMES on each side, per tool. Not their types, not
 * whether a required argument is enforced — only whether the name a model is
 * told to send is a name the handler looks for.
 *
 * The two directions fail differently and both are defects:
 *
 *   - declared, never read — the silent drop. The model is invited to send
 *     something and it goes nowhere.
 *   - read, never declared — the invisible argument. The handler wants a key
 *     no schema mentions, so a model can only send it by accident.
 *
 * TWO THINGS THIS HAS TO GET RIGHT, both of which are false positives
 * otherwise, and both of which I hit while writing it:
 *
 *   - a properties object written on ONE line. `update_path` is
 *     `properties: { path_id: str('Path id'), name: str('New name') }`, and a
 *     line-oriented reading of it finds no keys at all — which reads as
 *     "declares nothing, reads name" and accuses a correct tool.
 *   - an argument read through a HELPER. `list_scenarios` never says
 *     `s(args, 'service')`; it calls `readScope(client, args)`, which does.
 *     Any local function in the same file that takes `args` lends its keys to
 *     every case that passes `args` to it.
 */

/** Brace-, bracket- and quote-aware slice from `source[open]` to its match. */
function balanced(source, open) {
  const closer = { '{': '}', '[': ']' }[source[open]]
  let depth = 0
  let quote = null
  for (let i = open; i < source.length; i += 1) {
    const ch = source[i]
    if (quote) {
      if (ch === '\\') i += 1
      else if (ch === quote) quote = null
      continue
    }
    if (ch === "'" || ch === '"' || ch === '`') quote = ch
    else if (ch === source[open]) depth += 1
    else if (ch === closer) {
      depth -= 1
      if (depth === 0) return source.slice(open + 1, i)
    }
  }
  return ''
}

/** The top-level keys of an object literal's body, one line or many. */
function topLevelKeys(body) {
  const keys = new Set()
  let depth = 0
  let quote = null
  let atKey = true
  let word = ''
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i]
    if (quote) {
      if (ch === '\\') i += 1
      else if (ch === quote) quote = null
      continue
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch
      continue
    }
    if (ch === '{' || ch === '[' || ch === '(') {
      depth += 1
      continue
    }
    if (ch === '}' || ch === ']' || ch === ')') {
      depth -= 1
      continue
    }
    if (depth > 0) continue
    if (ch === ',') {
      atKey = true
      word = ''
      continue
    }
    if (ch === ':') {
      if (atKey && word) keys.add(word)
      atKey = false
      word = ''
      continue
    }
    if (/[A-Za-z0-9_]/.test(ch)) word += ch
    else if (!/\s/.test(ch)) atKey = false
    else if (word) atKey = false
  }
  return keys
}

/** Every tool spec's declared argument names, by tool name. */
export function declaredArguments(specsSource) {
  const declared = new Map()
  const entries = [...specsSource.matchAll(/\bname: '([a-z_]+)',/g)]
  entries.forEach((entry, index) => {
    const start = entry.index
    const end = index + 1 < entries.length ? entries[index + 1].index : specsSource.length
    const body = specsSource.slice(start, end)
    const at = body.indexOf('properties:')
    if (at < 0) {
      declared.set(entry[1], new Set())
      return
    }
    declared.set(entry[1], topLevelKeys(balanced(body, body.indexOf('{', at))))
  })
  return declared
}

/** The `args` keys one stretch of source reads directly. */
function directKeys(source) {
  const keys = new Set()
  for (const match of source.matchAll(/\(args,\s*'([a-z_]+)'/g)) keys.add(match[1])
  for (const match of source.matchAll(/\bargs\.([a-z_][a-z0-9_]*)/g)) keys.add(match[1])
  return keys
}

/**
 * Local helpers that take the whole `args` bag, and the keys each one reads.
 * `readScope` is the only one today; the shape is general so the next one
 * costs nothing.
 */
function helperKeys(registrySource) {
  const helpers = new Map()
  for (const match of registrySource.matchAll(
    // `args` with or without its type annotation — the annotation is not
    // what makes it the bag.
    /\bfunction ([A-Za-z_][A-Za-z0-9_]*)\([^)]*\bargs\s*[:,)]/g,
  )) {
    const open = registrySource.indexOf('{', match.index + match[0].length)
    helpers.set(match[1], directKeys(balanced(registrySource, open)))
  }
  return helpers
}

/** Every tool case's read argument names, by tool name. */
export function readArguments(registrySource) {
  const helpers = helperKeys(registrySource)
  const read = new Map()
  const cases = [...registrySource.matchAll(/\bcase '([a-z_]+)':/g)]
  cases.forEach((entry, index) => {
    const start = entry.index
    const end = index + 1 < cases.length ? cases[index + 1].index : registrySource.length
    const body = registrySource.slice(start, end)
    const keys = directKeys(body)
    for (const [helper, lent] of helpers) {
      if (new RegExp(`\\b${helper}\\([^)]*\\bargs\\b`).test(body))
        for (const key of lent) keys.add(key)
    }
    // Union, never overwrite: `registry.ts` holds TWO switches over the same
    // tool names — `dispatchTool` for a live client and `dispatchSampleTool`
    // for the sample workspace — so a name is read if either arm reads it.
    // Overwriting made `list_scenarios` look like it ignored `service`,
    // because the sample arm is one line that takes no arguments.
    const already = read.get(entry[1])
    if (already) for (const key of keys) already.add(key)
    else read.set(entry[1], keys)
  })
  return read
}

/**
 * Every tool whose two ends disagree, with an accepted-alias list for the
 * pairs that are a deliberate wire courtesy rather than a defect. An alias is
 * a name the handler still reads and the schema no longer advertises — never
 * the other way round, because a name only the schema knows is exactly the
 * silent drop this check exists for.
 */
export function argumentDrift(specsSource, registrySource, aliases = []) {
  const declared = declaredArguments(specsSource)
  const read = readArguments(registrySource)
  const excused = new Set(aliases.map((alias) => `${alias.tool}.${alias.accepts}`))
  const drift = []
  for (const [tool, keys] of declared) {
    const found = read.get(tool)
    if (!found) continue
    const declaredNotRead = [...keys].filter((key) => !found.has(key)).sort()
    const readNotDeclared = [...found]
      .filter((key) => !keys.has(key) && !excused.has(`${tool}.${key}`))
      .sort()
    if (declaredNotRead.length || readNotDeclared.length)
      drift.push({ tool, declaredNotRead, readNotDeclared })
  }
  return drift
}
