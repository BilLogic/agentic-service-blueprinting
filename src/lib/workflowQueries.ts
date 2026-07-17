/** Supabase nested selects for the Service Blueprint schema */

export const PATH_LIST_SELECT =
  'id, name, description, note, path_type, service_scenario_id, created_at, updated_at'

/** Blueprint grid: path with layers, path_steps, and cells */
export const PATH_BLUEPRINT_SELECT = `
  id,
  name,
  description,
  note,
  path_type,
  service_scenario_id,
  layers (
    id,
    name,
    layer_role,
    row_position
  ),
  path_steps (
    column_position,
    steps (
      id,
      name
    )
  ),
  cells (
    id,
    layer_id,
    step_id,
    content,
    picture,
    description,
    links,
    outgoing:cell_triggers!cell_triggers_source_cell_id_fkey (
      id,
      target_cell_id
    )
  )
`
