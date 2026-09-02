-- An upload is an attachment with a stable URL.
--
-- 21000118000000 gave `resources` an `attachment` kind: a file the cell
-- points at, carried as a url like any other resource. Until now the only
-- way a file got there was a deploy — a path inside whatever site shipped
-- this template. This is where a person adds one: a public-read Storage
-- bucket on the free tier, one object per attachment, its public URL the
-- row's `url`. The row's kind is decided when it is made; the bytes at the
-- other end decide how it is shown.
--
-- ── The bucket (recipe) ───────────────────────────────────────────────────
--
-- `cell-attachments`, public. Public because the app reads without a
-- session — every board is readable by anon — and a private bucket would
-- need a signed URL per image per viewer, minted by a session the reader
-- does not have. Reading is the same posture as the tables: open. Writing
-- is not.
--
-- Objects are keyed `cells/<cell id>/<generated id>.<ext>`: ids and nothing
-- else, so renaming the placement, the touchpoint or the cell changes no
-- URL. No orphan purge: deleting the row leaves the object, a bounded cost
-- on a bucket this size.
--
-- The policies mirror the tables: SELECT for anyone signed in (anon reads
-- through the public URL, which never consults a policy), INSERT / UPDATE /
-- DELETE only for `authenticated` AND `is_service_account()`, and only under
-- the key pattern above. `slice-illustrations` reached the same shape in two
-- steps; this bucket starts there. Each write policy carries the guard
-- itself, so the four policies are the whole rule.
--
-- Storage is Supabase's, so the bucket and its policies are recipe. The
-- portable core knows nothing of buckets; a backend without one keeps
-- attachments wherever it keeps files and writes their URLs into the row.
--
-- ── The rule (core) ───────────────────────────────────────────────────────
--
-- A resource's url is a URL, never a path inside the site that happens to
-- deploy this template: `resources_url_absolute`. Vacuous on an empty
-- database and on every seed this repo ships — no sample resource names a
-- path. `cells.frame` is NOT held to the same rule here: the sample's
-- storyboard frames name the template's own cover figures, shipped with it
-- and not one deployment's content, and a rule the shipped seed breaks is
-- not a rule.
--
-- ── Replaying against an empty database ───────────────────────────────────
--
-- The shim models `storage.buckets` and `storage.objects`, so the bucket row
-- and the policies replay. The proof is an INVARIANT: the constraint exists
-- and no url starts with `/`; under the recipe, the bucket exists and is
-- public, the four policies exist, and no write policy admits anon.

-- @core

alter table public.resources
  add constraint resources_url_absolute check (url is null or url !~ '^/');

comment on constraint resources_url_absolute on public.resources is
  'A resource points at a URL, never at a path inside whatever site deployed this template. An uploaded file''s URL is its object''s in the cell-attachments bucket (21000121000000).';

do $proof$
declare
  bad int;
begin
  select count(*) into bad from public.resources where url ~ '^/';
  if bad <> 0 then raise exception '% resources still point inside the site', bad; end if;
  if not exists (select 1 from pg_constraint where conname = 'resources_url_absolute') then
    raise exception 'the absolute-url check is missing';
  end if;
end
$proof$;

-- @recipe — the bucket, its policies, and their proof.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cell-attachments', 'cell-attachments', true, 10485760,
  array[
    'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml',
    'video/mp4', 'video/webm', 'video/quicktime',
    'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg',
    'application/pdf'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "cell_attachments_select" on storage.objects;
drop policy if exists "cell_attachments_insert" on storage.objects;
drop policy if exists "cell_attachments_update" on storage.objects;
drop policy if exists "cell_attachments_delete" on storage.objects;

create policy "cell_attachments_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'cell-attachments');

create policy "cell_attachments_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'cell-attachments'
    and public.is_service_account()
    and name ~ '^cells/[0-9a-f-]{36}/[0-9a-f-]{36}\.[a-z0-9]{1,8}$'
  );

create policy "cell_attachments_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'cell-attachments' and public.is_service_account())
  with check (
    bucket_id = 'cell-attachments'
    and public.is_service_account()
    and name ~ '^cells/[0-9a-f-]{36}/[0-9a-f-]{36}\.[a-z0-9]{1,8}$'
  );

create policy "cell_attachments_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'cell-attachments' and public.is_service_account());

do $proof$
declare
  bad int;
begin
  if not exists (select 1 from storage.buckets where id = 'cell-attachments' and public) then
    raise exception 'the cell-attachments bucket is missing or not public';
  end if;

  select count(*) into bad
    from pg_policies
   where schemaname = 'storage' and tablename = 'objects'
     and policyname in ('cell_attachments_select', 'cell_attachments_insert',
                        'cell_attachments_update', 'cell_attachments_delete');
  if bad <> 4 then
    raise exception 'expected four cell_attachments policies on storage.objects, found %', bad;
  end if;

  select count(*) into bad
    from pg_policies
   where schemaname = 'storage' and tablename = 'objects'
     and policyname in ('cell_attachments_insert', 'cell_attachments_update', 'cell_attachments_delete')
     and ('anon' = any(roles) or 'public' = any(roles)
          or coalesce(qual, '') || coalesce(with_check, '') not like '%is_service_account()%');
  if bad <> 0 then
    raise exception '% cell_attachments write policies are open to anon or unguarded', bad;
  end if;
end
$proof$;
-- @core
