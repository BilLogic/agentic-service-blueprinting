# Warm-Up Happy Path — stable ID map

Hierarchy: **Pre-Session** (`…000103`) → **Warm-Up** (`…000203`) → **Warm-Up Happy Path** (`…000300`)

## Path

| Field | Value |
| --- | --- |
| UUID | `a0000000-0000-4000-8000-000000000300` |
| path_type | `happy` |

## Layers (`layer_id` → UUID, `row_position`)

| layer_id | UUID | name |
| --- | --- | --- |
| partner_action_teacher | `…000301` | Partner Action: Teacher |
| lead_tutor | `…000302` | Lead Tutor |
| regular_tutor | `…000303` | Regular Tutor |
| front_stage_tech | `…000306` | Front Stage Tech |
| front_stage_actions | `…000304` | Front Stage Actions |
| back_stage_actions | `…000307` | Back Stage Actions |
| back_stage_tech | `…000308` | Back Stage Tech |
| support_actions | `…000309` | Support Actions |

## Steps (`id` → UUID, `column_position`)

| id | UUID | title |
| --- | --- | --- |
| enter_breakout_room | `…000311` | Enter Breakout Room |
| greet_student | `…000312` | Greet Student |
| ask_student_share_screen | `…000313` | Ask Student to Share Screen |
| remind_student_can_ask_help | `…000314` | Remind Student They Can Ask for Help |
| mark_student_present | `…000315` | Mark Student Present |
| select_engagement_level | `…000316` | Select Engagement Level |
| mark_student_helped | `…000317` | Mark Student Helped |
| move_to_next_student | `…000318` | Move to Next Student |

## Step 1 → step 2 triggers

| Layer | Source cell | Target cell |
| --- | --- | --- |
| Partner Action: Teacher | `…040101` | `…040201` |
| Lead Tutor | `…040102` | `…040202` |
| Regular Tutor | `…040103` | `…040203` |

## Step 2 → step 3 triggers

| Layer | Source cell | Target cell |
| --- | --- | --- |
| Partner Action: Teacher | `…040201` | `…040301` |
| Lead Tutor | `…040202` | `…040302` |

## Regular Tutor cells (trigger chain, steps 2–8)

| Step | Cell UUID |
| --- | --- |
| enter_breakout_room | `…040103` |
| greet_student | `…040203` |
| ask_student_share_screen | `…040303` |
| remind_student_can_ask_help | `…040403` |
| mark_student_present | `…040503` |
| select_engagement_level | `…040603` |
| mark_student_helped | `…040703` |
| move_to_next_student | `…040803` |

## Regular Tutor loop (step 8 → step 1)

| Source | Target |
| --- | --- |
| `…040803` (Move to Next Student) | `…040103` (Enter Breakout Room) |

Seed file: [`supabase/seeds/warm_up_happy_path.sql`](../supabase/seeds/warm_up_happy_path.sql)
