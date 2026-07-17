-- Fill-in Request step 1: rename Back Stage Tech to Google Spreadsheet.

update public.cells
set content = 'Google Spreadsheet'
where id = 'a0000000-0000-4000-8000-000000150108';
