/** Supabase nested selects for the Service Blueprint schema */

export const PATH_LIST_SELECT =
  'id, name, summary, note, path_type, scenario_id, created_at, updated_at'

/** Blueprint grid: path with lanes, path_steps, and cells */
export const PATH_BLUEPRINT_SELECT = `
  id,
  name,
  summary,
  note,
  path_type,
  scenario_id,
  lanes (
    id,
    name,
    lane_role,
    position
  ),
  path_steps (
    position,
    steps (
      id,
      name
    )
  ),
  cells (
    id,
    lane_id,
    step_id,
    position,
    content,
    picture,
    summary,
    links,
    outgoing:cell_dependencies!cell_dependencies_source_cell_id_fkey (
      id,
      target_cell_id,
      kind,
      label,
      note
    )
  )
`
