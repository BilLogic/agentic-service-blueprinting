/**
 * The closed vocabularies the generated types carry as unions, and how a
 * CHECK's member list is read.
 *
 * Data and one pure function, in a module of their own, because two sides
 * read them and only one of them may load the generator: the generator
 * derives each union from the constraint named here, and the schema-inventory
 * check and the deployment superset check key their comparisons by the same
 * names. The generator's module graph loads `pg` and the typegen engine, which
 * are this repository's development dependencies; a deployment running the
 * superset check out of the installed package has neither, so the list they
 * share cannot live next to the code that needs them.
 */

/**
 * The enum unions, each derived from the constraint that closes the
 * vocabulary in the database. A `domain` names a CREATE DOMAIN's CHECK; a
 * `table` and `column` name the column's own CHECK. The member list is read
 * from the built database, never written here.
 */
export const ENUMS = [
  {
    name: 'EntityStatus',
    domain: 'entity_status',
    doc: 'The `entity_status` domain, shared by `cells.status` and `paths.status`.',
  },
  { name: 'PathKind', table: 'paths', column: 'kind', doc: 'The kinds of Path a Scenario holds.' },
  {
    name: 'StakeholderKind',
    table: 'stakeholders',
    column: 'kind',
    doc: 'Who a Stakeholder is to the service.',
  },
  {
    name: 'LaneRole',
    table: 'lanes',
    column: 'lane_role',
    doc: 'The closed vocabulary of `lanes.lane_role`; a null role renders as a plain swimlane.',
  },
]

/** The subject an entry closes: the domain's name, or `table.column`. */
export function enumSubject(entry) {
  return entry.domain ?? `${entry.table}.${entry.column}`
}

/**
 * The members a CHECK of the shape `x = ANY (ARRAY['a'::text, …])` accepts,
 * in declaration order; null for a constraint of any other shape. The
 * inventory SQL reads the same shape with the same two matches, so the two
 * readers agree on what a member is.
 */
export function membersOfCheck(definition) {
  const list = /ANY \(ARRAY\[([^\]]*)\]\)/.exec(definition)
  if (!list) return null
  return [...list[1].matchAll(/'((?:[^']|'')*)'::text/g)].map((match) => match[1].replace(/''/g, "'"))
}
