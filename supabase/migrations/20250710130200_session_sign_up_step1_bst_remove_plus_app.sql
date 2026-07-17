-- Session Sign Up step 1: remove PLUS App from Back Stage Tech (keep Google Spreadsheet).

update public.cells
set content = 'Google Spreadsheet'
where id = 'a0000000-0000-4000-8000-000000130108';
