import type { CellLink } from '@/types/blueprint'
import { URL_LINK_TYPE } from '@/lib/blueprintTechDescriptions'

export const ONBOARDING_MODULE_1_LINK: CellLink = {
  type: URL_LINK_TYPE,
  label: 'Onboarding Module 1',
  url: 'https://plus-tutors.notion.site/Module-1-Welcome-to-PLUS-26fb7cca4982809f95b8c754d0e70834',
}

export const ONBOARDING_MODULE_2_LINK: CellLink = {
  type: URL_LINK_TYPE,
  label: 'Onboarding Module 2',
  url: 'https://plus-tutors.notion.site/Module-2-Your-Role-at-PLUS-26fb7cca498280daac2fd7efc191708d',
}

export const ONBOARDING_MODULE_3_LINK: CellLink = {
  type: URL_LINK_TYPE,
  label: 'Onboarding Module 3',
  url: 'https://plus-tutors.notion.site/Module-3-Tutoring-Session-Overview-26fb7cca498280dfa0daf291f2635b3f',
}

export const ONBOARDING_MODULE_4_LINK: CellLink = {
  type: URL_LINK_TYPE,
  label: 'Onboarding Module 4',
  url: 'https://plus-tutors.notion.site/Module-4-Tutoring-Session-Responsibilities-26fb7cca498280f3af02ffc07b5171e7',
}

export const ONBOARDING_MODULE_5_LINK: CellLink = {
  type: URL_LINK_TYPE,
  label: 'Onboarding Module 5',
  url: 'https://plus-tutors.notion.site/Module-5-Helping-Students-26fb7cca4982807fa5b7d2a0a92753dd',
}

export const ONBOARDING_MODULE_6_LINK: CellLink = {
  type: URL_LINK_TYPE,
  label: 'Onboarding Module 6',
  url: 'https://plus-tutors.notion.site/Module-6-Tutoring-Tools-26fb7cca498280e4aae2f73e8739388e',
}

export const ONBOARDING_MODULE_7_LINK: CellLink = {
  type: URL_LINK_TYPE,
  label: 'Onboarding Module 7',
  url: 'https://plus-tutors.notion.site/Module-7-Plus-App-Overview-26fb7cca498280c8b700e462fa340ddb',
}

export const ONBOARDING_MODULE_8_LINK: CellLink = {
  type: URL_LINK_TYPE,
  label: 'Onboarding Module 8',
  url: 'https://plus-tutors.notion.site/Module-8-Day-to-Day-Protocols-26fb7cca49828064a32cdde194e36bbd',
}

export const ONBOARDING_MODULE_9_LINK: CellLink = {
  type: URL_LINK_TYPE,
  label: 'Onboarding Module 9',
  url: 'https://plus-tutors.notion.site/Module-9-Goal-Setting-Practices-2a1b7cca498280278bb9e2c9f9e20b6b',
}

/** Lesson Modules — Modules 1, 7 */
export const LESSON_MODULES_REGULAR_TUTOR_ONBOARDING_LINKS: CellLink[] = [
  ONBOARDING_MODULE_1_LINK,
  ONBOARDING_MODULE_7_LINK,
]

/** Call-off Request — Modules 2, 8 */
export const CALL_OFF_REQUEST_REGULAR_TUTOR_ONBOARDING_LINKS: CellLink[] = [
  ONBOARDING_MODULE_2_LINK,
  ONBOARDING_MODULE_8_LINK,
]

/** Reporting an Issue — Module 2 (Regular + Lead Tutor) */
export const REPORTING_AN_ISSUE_REGULAR_TUTOR_ONBOARDING_LINKS: CellLink[] = [
  ONBOARDING_MODULE_2_LINK,
]

/** Before Students Join — Modules 3, 4, 5, 6, 7 */
export const BEFORE_STUDENTS_JOIN_REGULAR_TUTOR_ONBOARDING_LINKS: CellLink[] = [
  ONBOARDING_MODULE_3_LINK,
  ONBOARDING_MODULE_4_LINK,
  ONBOARDING_MODULE_5_LINK,
  ONBOARDING_MODULE_6_LINK,
  ONBOARDING_MODULE_7_LINK,
]

/** Students Just Joined — Modules 3, 4, 5, 6 */
export const STUDENTS_JUST_JOINED_REGULAR_TUTOR_ONBOARDING_LINKS: CellLink[] = [
  ONBOARDING_MODULE_3_LINK,
  ONBOARDING_MODULE_4_LINK,
  ONBOARDING_MODULE_5_LINK,
  ONBOARDING_MODULE_6_LINK,
]

/** Wrap Up — Modules 3, 4, 6 */
export const WRAP_UP_REGULAR_TUTOR_ONBOARDING_LINKS: CellLink[] = [
  ONBOARDING_MODULE_3_LINK,
  ONBOARDING_MODULE_4_LINK,
  ONBOARDING_MODULE_6_LINK,
]

/** Warm-Up — Modules 5, 6 */
export const WARM_UP_REGULAR_TUTOR_ONBOARDING_LINKS: CellLink[] = [
  ONBOARDING_MODULE_5_LINK,
  ONBOARDING_MODULE_6_LINK,
]

/** Goal Setting (all paths) — Modules 5, 6, 9 */
export const GOAL_SETTING_REGULAR_TUTOR_ONBOARDING_LINKS: CellLink[] = [
  ONBOARDING_MODULE_5_LINK,
  ONBOARDING_MODULE_6_LINK,
  ONBOARDING_MODULE_9_LINK,
]

/** Help Request — Module 6 */
export const HELP_REQUEST_REGULAR_TUTOR_ONBOARDING_LINKS: CellLink[] = [
  ONBOARDING_MODULE_6_LINK,
]

/** Reporting Hours — Module 8 (Regular + Lead Tutor) */
export const REPORTING_HOURS_REGULAR_TUTOR_ONBOARDING_LINKS: CellLink[] = [
  ONBOARDING_MODULE_8_LINK,
]
