import { type SelectOption } from '@/components/blueprint/OptionSelect'
import {
  ENTITY_STATUS,
  ENTITY_STATUS_MEANING,
  ENTITY_STATUS_SHORT,
  type EntityStatus,
} from '@/lib/entityStatus'

/**
 * The six rungs as the select offers them: the name, and beneath it the one
 * authored line the badge's hover already shows.
 *
 * Exported because the definitions sweep reads what is RENDERED. A roster
 * that rebuilt these pairs from the two records itself would pass while this
 * list quietly drew something else.
 */
export const STATUS_OPTIONS: ReadonlyArray<SelectOption<EntityStatus>> =
  ENTITY_STATUS.map((status) => ({
    value: status,
    label: ENTITY_STATUS_SHORT[status],
    meaning: ENTITY_STATUS_MEANING[status],
  }))
