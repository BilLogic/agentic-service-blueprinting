-- Goal Setting non-happy paths — Zoom/Pencil Front Stage Tech step descriptions

-- Set Goals path
update public.cells set description = 'The tutor utilizes Zoom/Pencil to virtually connect with the student and joins the breakout room to set goals with the student.' where id = 'a0000000-0000-4000-8000-0000001f0106';
update public.cells set description = 'The tutor shares their screen with the student in the breakout room via Zoom/Pencil to show the set goals flow in the PLUS app.' where id = 'a0000000-0000-4000-8000-0000001f0306';
update public.cells set description = 'The tutor explains what goal setting is to the student in the breakout room via Zoom/Pencil.' where id = 'a0000000-0000-4000-8000-0000001f0406';
update public.cells set description = 'The tutor guides the student through setting their first goals while sharing their screen on Zoom/Pencil.' where id = 'a0000000-0000-4000-8000-0000001f0506';
update public.cells set description = 'The tutor works with the student to fill out goal settings and quantities while sharing their screen on Zoom/Pencil.' where id = 'a0000000-0000-4000-8000-0000001f0606';
update public.cells set description = 'If prompted, the tutor works with the student to complete the goal achievement strategy while sharing their screen on Zoom/Pencil.' where id = 'a0000000-0000-4000-8000-0000001f0706';
update public.cells set description = 'The tutor saves the goal with the student while sharing their screen on Zoom/Pencil.' where id = 'a0000000-0000-4000-8000-0000001f0806';
update public.cells set description = 'The tutor finalizes goal setting with the student while sharing their screen on Zoom/Pencil.' where id = 'a0000000-0000-4000-8000-0000001f0906';
update public.cells set description = 'The tutor says goodbye and leaves the breakout room with the student via Zoom/Pencil.' where id = 'a0000000-0000-4000-8000-0000001f1006';

-- Set Goals Edge Case path
update public.cells set description = 'The tutor utilizes Zoom/Pencil to virtually connect with the student and joins the breakout room during a mid-cycle goal check-in to set goals with a student who has not yet set goals.' where id = 'a0000000-0000-4000-8000-000000c00106';
update public.cells set description = 'The tutor shares their screen with the student in the breakout room via Zoom/Pencil to show the set goals flow in the PLUS app.' where id = 'a0000000-0000-4000-8000-000000c00406';
update public.cells set description = 'The tutor explains what goal setting is to the student in the breakout room via Zoom/Pencil.' where id = 'a0000000-0000-4000-8000-000000c00506';
update public.cells set description = 'The tutor guides the student through setting their first goals while sharing their screen on Zoom/Pencil.' where id = 'a0000000-0000-4000-8000-000000c00606';
update public.cells set description = 'The tutor works with the student to fill out goal settings and quantities while sharing their screen on Zoom/Pencil.' where id = 'a0000000-0000-4000-8000-000000c00706';
update public.cells set description = 'If prompted, the tutor works with the student to complete the goal achievement strategy while sharing their screen on Zoom/Pencil.' where id = 'a0000000-0000-4000-8000-000000c00806';
update public.cells set description = 'The tutor saves the goal with the student while sharing their screen on Zoom/Pencil.' where id = 'a0000000-0000-4000-8000-000000c00906';
update public.cells set description = 'The tutor finalizes goal setting with the student while sharing their screen on Zoom/Pencil.' where id = 'a0000000-0000-4000-8000-000000c01006';
update public.cells set description = 'The tutor says goodbye and leaves the breakout room with the student via Zoom/Pencil.' where id = 'a0000000-0000-4000-8000-000000c01106';

-- Check Goals path
update public.cells set description = 'The tutor utilizes Zoom/Pencil to virtually connect with the student and joins the breakout room to check goals with the student.' where id = 'a0000000-0000-4000-8000-000000a00106';
update public.cells set description = 'The tutor shares their screen with the student in the breakout room via Zoom/Pencil to show the check goals flow in the PLUS app.' where id = 'a0000000-0000-4000-8000-000000a00306';
update public.cells set description = 'The tutor reviews the goals that were set with the student in the breakout room via Zoom/Pencil.' where id = 'a0000000-0000-4000-8000-000000a00406';
update public.cells set description = 'The tutor works with the student to complete the goal check while sharing their screen on Zoom/Pencil.' where id = 'a0000000-0000-4000-8000-000000a00506';
update public.cells set description = 'The tutor finalizes checking goals with the student while sharing their screen on Zoom/Pencil.' where id = 'a0000000-0000-4000-8000-000000a00606';
update public.cells set description = 'The tutor says goodbye and leaves the breakout room with the student via Zoom/Pencil.' where id = 'a0000000-0000-4000-8000-000000a00706';

-- Update Goals path
update public.cells set description = 'The tutor utilizes Zoom/Pencil to virtually connect with the student and joins the breakout room to update goals with the student.' where id = 'a0000000-0000-4000-8000-000000b00106';
update public.cells set description = 'The tutor shares their screen with the student in the breakout room via Zoom/Pencil to show the update goals flow in the PLUS app.' where id = 'a0000000-0000-4000-8000-000000b00306';
update public.cells set description = 'The tutor reviews the last goal cycle overview and system suggestions with the student in the breakout room via Zoom/Pencil.' where id = 'a0000000-0000-4000-8000-000000b00406';
update public.cells set description = 'The tutor guides the student through updating goals for the next goal cycle while sharing their screen on Zoom/Pencil.' where id = 'a0000000-0000-4000-8000-000000b00506';
update public.cells set description = 'The tutor works with the student to fill out goal settings and quantities while sharing their screen on Zoom/Pencil.' where id = 'a0000000-0000-4000-8000-000000b00606';
update public.cells set description = 'If prompted, the tutor works with the student to complete the goal achievement strategy while sharing their screen on Zoom/Pencil.' where id = 'a0000000-0000-4000-8000-000000b00706';
update public.cells set description = 'The tutor saves the updated goal with the student while sharing their screen on Zoom/Pencil.' where id = 'a0000000-0000-4000-8000-000000b00806';
update public.cells set description = 'The tutor finalizes updating goals with the student while sharing their screen on Zoom/Pencil.' where id = 'a0000000-0000-4000-8000-000000b00906';
update public.cells set description = 'The tutor says goodbye and leaves the breakout room with the student via Zoom/Pencil.' where id = 'a0000000-0000-4000-8000-000000b01006';

-- Update Goals Edge Case path
update public.cells set description = 'The tutor utilizes Zoom/Pencil to virtually connect with the student and joins the breakout room during a mid-cycle goal check-in to update goals with a student who needs to update their goals.' where id = 'a0000000-0000-4000-8000-000000d00106';
update public.cells set description = 'The tutor shares their screen with the student in the breakout room via Zoom/Pencil to show the update goals flow in the PLUS app.' where id = 'a0000000-0000-4000-8000-000000d00406';
update public.cells set description = 'The tutor reviews the last goal cycle overview and system suggestions with the student in the breakout room via Zoom/Pencil.' where id = 'a0000000-0000-4000-8000-000000d00506';
update public.cells set description = 'The tutor guides the student through updating goals for the next goal cycle while sharing their screen on Zoom/Pencil.' where id = 'a0000000-0000-4000-8000-000000d00606';
update public.cells set description = 'The tutor works with the student to fill out goal settings and quantities while sharing their screen on Zoom/Pencil.' where id = 'a0000000-0000-4000-8000-000000d00706';
update public.cells set description = 'If prompted, the tutor works with the student to complete the goal achievement strategy while sharing their screen on Zoom/Pencil.' where id = 'a0000000-0000-4000-8000-000000d00806';
update public.cells set description = 'The tutor saves the updated goal with the student while sharing their screen on Zoom/Pencil.' where id = 'a0000000-0000-4000-8000-000000d00906';
update public.cells set description = 'The tutor finalizes updating goals with the student while sharing their screen on Zoom/Pencil.' where id = 'a0000000-0000-4000-8000-000000d01006';
update public.cells set description = 'The tutor says goodbye and leaves the breakout room with the student via Zoom/Pencil.' where id = 'a0000000-0000-4000-8000-000000d01106';
