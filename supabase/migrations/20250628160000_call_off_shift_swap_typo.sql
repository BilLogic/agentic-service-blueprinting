-- Swift Swap → Shift Swap typo fix (all paths).

update public.cells
set content = replace(content, 'Swift Swap', 'Shift Swap')
where content like '%Swift Swap%';
