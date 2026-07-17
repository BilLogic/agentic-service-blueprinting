import {
  BLUEPRINT_CELL_BORDER_COLOR,
  BLUEPRINT_CELL_TEXT_COLOR,
} from '@/lib/blueprintCellStyle'
import { getTechPillFill } from '@/lib/techPillColors'

export type TechPillStyle = {
  backgroundColor: string
  color: string
  borderColor: string
}

export function getTechPillStyle(item: string): TechPillStyle {
  return {
    backgroundColor: getTechPillFill(item),
    color: BLUEPRINT_CELL_TEXT_COLOR,
    borderColor: BLUEPRINT_CELL_BORDER_COLOR,
  }
}
