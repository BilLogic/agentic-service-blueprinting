-- Call-off Request step 5: rename Back Stage Tech to Google Spreadsheet.

update public.cells
set content = 'Google Spreadsheet'
where id = 'a0000000-0000-4000-8000-000000170508';
