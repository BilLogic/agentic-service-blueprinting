-- Warm-Up Happy Path steps 1–4: Front Stage Tech is Zoom/Pencil only (no PLUS App).

update public.cells
set content = 'Zoom/Pencil'
where path_id = 'a0000000-0000-4000-8000-000000000300'
  and layer_id = 'a0000000-0000-4000-8000-000000000306'
  and step_id in (
    'a0000000-0000-4000-8000-000000000311',
    'a0000000-0000-4000-8000-000000000312',
    'a0000000-0000-4000-8000-000000000313',
    'a0000000-0000-4000-8000-000000000314'
  );
