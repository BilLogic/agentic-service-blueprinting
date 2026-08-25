-- What the migrations actually built, as `table<TAB>column` rows.
--
-- Run with `psql -At -F $'\t' -f` so the output is exactly that and nothing
-- else. Views are excluded on purpose: the reference snapshot describes them
-- separately, and a view's columns are a projection rather than a shape a
-- replacement backend has to carry.
select c.table_name, c.column_name
from information_schema.columns c
join information_schema.tables t
  on t.table_schema = c.table_schema
 and t.table_name = c.table_name
where c.table_schema = 'public'
  and t.table_type = 'BASE TABLE'
order by c.table_name, c.column_name;
