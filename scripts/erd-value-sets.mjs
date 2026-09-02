/**
 * The value sets an ERD states, held to a catalog.
 *
 * A Mermaid ERD states values twice: an `%% Enums:` block at the top —
 * `scenarios.layout ∈ (stacked | merged)`, one entry per line, a set that
 * wraps continuing on the next — and `text kind "a | b | c"` attribute
 * lines inside each entity. Neither is JSX nor a code span, which is how a
 * rename reached the columns there and left the retired values beside the
 * new names with nothing noticing. Both are parsed here and compared, set
 * for set, to the CHECK constraints and domains the catalog holds.
 *
 * Pure. The catalog is `catalogValueSets()` / `catalogFromSchema()` output;
 * the caller decides where it came from.
 */
const TOKEN = /^[a-z][a-z0-9_-]*$/

/**
 * Every value-set claim in an ERD: `{ site, column, values }` where `column`
 * is `table.column` when the ERD qualifies it and a bare name otherwise.
 */
export function erdValueSets(mmd, source = 'docs/erd.mmd') {
  const claims = []
  const lines = mmd.split('\n')
  // The `%% Enums:` block: from the line that says Enums to the first `%%`
  // line that opens another topic. A set that wraps — `(interview | … |`
  // then `decision | other)` — is joined back before it is read.
  const start = lines.findIndex((line) => /^%%\s*Enums\b/.test(line))
  let open = null
  for (let i = start; i >= 0 && i < lines.length; i += 1) {
    const line = lines[i]
    if (!line.startsWith('%%')) break
    if (i > start && /^%%\s+[A-Z][a-z]+:/.test(line)) break
    const body = line.replace(/^%%\s*/, '')
    if (open) {
      open.text += ` ${body}`
      if (!/\([^)]*$/.test(open.text)) {
        claims.push(...enumClaims(open.text, `${source}:${open.line}`))
        open = null
      }
      continue
    }
    if (/\([^)]*$/.test(body)) open = { text: body, line: i + 1 }
    else claims.push(...enumClaims(body, `${source}:${i + 1}`))
  }
  if (open) claims.push(...enumClaims(open.text, `${source}:${open.line}`))
  // Attribute lines inside `entity {` blocks. A description that is not a
  // bare pipe list of tokens is prose.
  let entity = null
  lines.forEach((line, i) => {
    const opens = /^\s{2}([a-z_]+) \{/.exec(line)
    if (opens) entity = opens[1]
    if (/^\s{2}\}/.test(line)) entity = null
    const attr = entity && /^\s+\w+(?:\[\])? ([a-z_]+) "([^"]*)"/.exec(line)
    if (!attr) return
    const values = attr[2].split(/\s*\|\s*/).map((v) => v.trim())
    if (values.length < 2 || !values.every((v) => TOKEN.test(v))) return
    claims.push({ site: `${source}:${i + 1}`, column: `${entity}.${attr[1]}`, values })
  })
  return claims
}

function enumClaims(text, site) {
  const claims = []
  // Columns may be padded to align the ∈ signs, so the gap is any width.
  for (const m of text.matchAll(/([a-z_]+(?:\.[a-z_]+)?)(?:\s+\([^)]*\))?\s+∈\s+\(([^)]*)\)/g)) {
    claims.push({ site, column: m[1], values: m[2].split('|').map((v) => v.trim()) })
  }
  return claims
}

/** The disagreements between ERD claims and the catalog, as messages. */
export function erdFindings(claims, catalog) {
  const show = (values) => `{${[...values].join(', ')}}`
  const equal = (a, b) => a.size === b.size && [...a].every((v) => b.has(v))
  const findings = []
  for (const claim of claims) {
    const values = new Set(claim.values)
    const candidates = claim.column.includes('.')
      ? [catalog.columns.get(claim.column)].filter(Boolean).map((set) => ({ label: claim.column, set }))
      : (catalog.byColumn.get(claim.column) ?? []).map((key) => ({ label: key, set: catalog.columns.get(key) }))
    if (candidates.length === 0) {
      findings.push(
        `${claim.site} states values for \`${claim.column}\`, which no CHECK or domain constrains — renamed, or never a column`,
      )
      continue
    }
    if (candidates.some((c) => equal(values, c.set.values))) continue
    findings.push(
      `${claim.site} says \`${claim.column}\` is ${show(values)}; ` +
        candidates.map((c) => `${c.label} accepts ${show(c.set.values)}`).join('; '),
    )
  }
  return findings
}
