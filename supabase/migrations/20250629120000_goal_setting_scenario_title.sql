-- Rename In-session → Goal-Setting Phase scenario to Goal Setting
update public.service_scenarios
set name = 'Goal Setting'
where id = 'a0000000-0000-4000-8000-000000000204';
