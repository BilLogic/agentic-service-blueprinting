/** Supabase nested selects for the Service Blueprint schema */
import { CELL_SELECT_COLUMNS } from '@/lib/cellFields'

export const PATH_LIST_SELECT =
  'id, name, summary, note, kind, scenario_id, created_at, updated_at'

/**
 * Blueprint grid: path with lanes, path_steps, and cells. The cells block's
 * columns come from the cell field list, which the normalizer maps from too.
 */
export const PATH_BLUEPRINT_SELECT = `
  id,
  name,
  summary,
  note,
  kind,
  status,
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
      name,
      summary
    )
  ),
  cells (
    ${CELL_SELECT_COLUMNS},
    resources!resources_cell_id_fkey (
      id,
      position,
      kind,
      name,
      url,
      cell_touchpoint_id,
      featured
    ),
    cell_touchpoints (
      id,
      touchpoint_id,
      name,
      position,
      summary,
      role,
      touchpoints (
        name,
        kind,
        icon_url
      )
    ),
    outgoing:cell_dependencies!cell_dependencies_source_cell_id_fkey (
      id,
      target_cell_id,
      kind,
      name,
      note
    )
  )
`
