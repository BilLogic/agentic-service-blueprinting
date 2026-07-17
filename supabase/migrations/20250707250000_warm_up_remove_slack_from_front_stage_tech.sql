-- Remove Slack from Warm-Up Happy Path and Alternate Path Front Stage Tech cells.

update public.cells
set content = E'Zoom/Pencil\nPLUS App'
where path_id in (
  'a0000000-0000-4000-8000-000000000300',
  'a0000000-0000-4000-8000-000000000350'
)
and layer_id in (
  'a0000000-0000-4000-8000-000000000306',
  'a0000000-0000-4000-8000-000000000406'
)
and content = E'Zoom/Pencil\nPLUS App\nSlack';
