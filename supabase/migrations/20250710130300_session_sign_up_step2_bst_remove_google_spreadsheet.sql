-- Session Sign Up step 2: remove Google Spreadsheet from Back Stage Tech.

update public.cells
set content = ''
where id = 'a0000000-0000-4000-8000-000000130208';
