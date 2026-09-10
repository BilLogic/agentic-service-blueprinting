-- @recipe — buckets and their policies are Supabase's. The whole file, header
-- included: the portable core has no Storage, and a backend without one keeps
-- slide uploads wherever it keeps files and writes their URLs into
-- `slide_images.image_url`.

-- A slide's uploads live in a folder of their own, and the bucket admits them.
--
-- `21000222000000` made a slide's images a SET, and one kind of member is a
-- file somebody uploaded. That half of the feature lives in Storage rather
-- than in `public`, and the object key changed shape when the set did:
--
--   before   slices/<slice id>/<slide id>.png          one image per slide
--   after    slices/<slice id>/<slide id>/<id>.png     a folder per slide
--
-- The old key was an upsert target. A slide had one image, so replacing it
-- overwrote the object at its own name. A set does not overwrite: every
-- upload is its own object under its own name, so a new image is a new URL
-- and a slide can hold several at once — and the folder is what makes
-- "remove this slide's uploads" a thing that can be asked at all, which
-- deleting a slice needs and no per-object name gives you.
--
-- ── This file exists because the bucket refuses the new key ───────────────
--
-- `slice_illustrations_insert` matches the object name against a pattern with
-- exactly two path segments after `slices/`:
-- `^slices/<36>/(<36>|frame-[0-9]+|character-ref)\.(png|jpg|webp)$`
-- (`20260818000000`, widening `20260729120000`). The key `illustrationPath`
-- builds has three. So every slide upload was refused by row-level security
-- AFTER the whole file had gone over the wire — a 403 at the end of an
-- upload, from a policy no screen can explain — and a stock install of this
-- template could not accept a slide image at all unless somebody had set the
-- policy by hand.
--
-- The old spellings stay accepted. Objects uploaded under them are still in
-- the bucket and still named by rows; a pattern that stopped matching them
-- would delete nothing and merely make those objects unwritable.
--
-- ── And the delete nobody could perform ──────────────────────────────────
--
-- There has never been a DELETE policy on this bucket. That was harmless
-- while nothing ever asked to remove an object, and stopped being harmless
-- when the app started calling `removeSlideUploadObjects` on the two paths
-- where a slide's folder becomes unreachable: a slice deleted outright, and
-- an undo that drops a slide the inverse does not restore. With no policy
-- that call matches no rows and reports success, which is the worst of the
-- three available outcomes — the objects leak, and the code says they were
-- handled. `illustrationUpload.ts` now counts the removed rows rather than
-- reading a non-error return as a yes, so the two halves fail together.
--
-- The delete is bounded by the same name pattern as the insert, so a session
-- cannot reach past the slices tree, and it takes its tier gate from the same
-- place the insert does: the restrictive `slice_illustrations_service_only`
-- companion `20260818002000` installed over every command on this bucket,
-- DELETE included. That is checked below, because if it ever goes these three
-- permissive policies become the whole rule and a signed-in reader inherits
-- them.
--
-- ── What is NOT here ─────────────────────────────────────────────────────
--
-- No sweep of the objects already in the bucket, and no orphan purge.
-- Dropping an image from a slide's set leaves its object ON PURPOSE: a
-- duplicated slice copies members verbatim and an undo restores the
-- `image_url` it captured, so an object deleted the moment its last row went
-- would break a slide nobody asked to change. `replaceSlides` leaves the
-- folders of dropped slides for the same reason — the inverse still names
-- those URLs. What this file makes possible is removing the folder of a slide
-- that cannot come back, and nothing wider.
--
-- ── Replaying against an empty database ──────────────────────────────────
--
-- The shim models `storage.buckets` and `storage.objects`, so the policies
-- replay. The proof is an INVARIANT and counts no objects: the pattern
-- decides the right way about eight names, and the pattern it decided about
-- is the one the three policies actually carry, read back out of the catalog.

do $policies$
begin
  drop policy if exists "slice_illustrations_insert" on storage.objects;
  drop policy if exists "slice_illustrations_update" on storage.objects;
  drop policy if exists "slice_illustrations_delete" on storage.objects;

  create policy "slice_illustrations_insert" on storage.objects
    for insert to authenticated
    with check (
      bucket_id = 'slice-illustrations'
      and name ~ '^slices/[0-9a-f-]{36}/([0-9a-f-]{36}/[0-9a-f-]{36}|[0-9a-f-]{36}|frame-[0-9]+|character-ref)\.(png|jpg|webp)$'
    );

  create policy "slice_illustrations_update" on storage.objects
    for update to authenticated
    using (bucket_id = 'slice-illustrations')
    with check (
      bucket_id = 'slice-illustrations'
      and name ~ '^slices/[0-9a-f-]{36}/([0-9a-f-]{36}/[0-9a-f-]{36}|[0-9a-f-]{36}|frame-[0-9]+|character-ref)\.(png|jpg|webp)$'
    );

  create policy "slice_illustrations_delete" on storage.objects
    for delete to authenticated
    using (
      bucket_id = 'slice-illustrations'
      and name ~ '^slices/[0-9a-f-]{36}/([0-9a-f-]{36}/[0-9a-f-]{36}|[0-9a-f-]{36}|frame-[0-9]+|character-ref)\.(png|jpg|webp)$'
    );
exception
  when insufficient_privilege then
    raise exception
      'storage.objects is owned by another role here, so the slice-illustration '
      'policies were not moved. Slide uploads stay refused until they are added '
      'through the dashboard: the insert pattern must accept '
      'slices/<slice>/<slide>/<id>.<ext>, and a DELETE policy must exist.';
end
$policies$;

do $the_pattern$
declare
  pattern text :=
    '^slices/[0-9a-f-]{36}/([0-9a-f-]{36}/[0-9a-f-]{36}|[0-9a-f-]{36}|frame-[0-9]+|character-ref)\.(png|jpg|webp)$';
  slice text := '11111111-1111-4111-8111-111111111111';
  slide text := '22222222-2222-4222-8222-222222222222';
  object text := '33333333-3333-4333-8333-333333333333';
  name text;
  installed int;
begin
  -- The key `illustrationPath` writes today, in each extension it can pick.
  name := format('slices/%s/%s/%s.png', slice, slide, object);
  if name !~ pattern then
    raise exception 'the bucket would refuse a slide upload: %', name;
  end if;
  if format('slices/%s/%s/%s.jpg', slice, slide, object) !~ pattern then
    raise exception 'the bucket would refuse a JPEG slide upload';
  end if;
  if format('slices/%s/%s/%s.webp', slice, slide, object) !~ pattern then
    raise exception 'the bucket would refuse a WebP slide upload';
  end if;

  -- The keys already in the bucket, which must keep resolving.
  if format('slices/%s/%s.png', slice, slide) !~ pattern then
    raise exception 'the bucket stopped admitting the one-image-per-slide key';
  end if;
  if format('slices/%s/frame-3.png', slice) !~ pattern then
    raise exception 'the bucket stopped admitting a frame key';
  end if;
  if format('slices/%s/character-ref.jpg', slice) !~ pattern then
    raise exception 'the bucket stopped admitting the character reference key';
  end if;

  -- And what it must still refuse: a key outside the slices tree, a fourth
  -- segment, and an extension the bucket's mime list does not allow.
  if format('other/%s/%s.png', slice, slide) ~ pattern then
    raise exception 'the pattern admits a key outside the slices tree';
  end if;
  if format('slices/%s/%s/%s/%s.png', slice, slide, object, object) ~ pattern then
    raise exception 'the pattern admits a fourth path segment';
  end if;
  if format('slices/%s/%s/%s.svg', slice, slide, object) ~ pattern then
    raise exception 'the pattern admits an extension the bucket does not allow';
  end if;

  -- The three write policies exist, each carries the pattern proved above,
  -- and none of them names anon.
  select count(*) into installed
    from pg_policies
   where schemaname = 'storage' and tablename = 'objects'
     and policyname in ('slice_illustrations_insert', 'slice_illustrations_update',
                        'slice_illustrations_delete')
     and position(pattern in coalesce(qual, '') || coalesce(with_check, '')) > 0
     and not ('anon' = any(roles) or 'public' = any(roles));
  if installed <> 3 then
    raise exception
      'expected three slice_illustrations write policies carrying this pattern '
      'and named to authenticated, found %', installed;
  end if;

  -- The tier gate is the restrictive companion, and it is what stands between
  -- a signed-in reader and this bucket. The three policies above assume it.
  if not exists (
    select 1 from pg_policies
     where schemaname = 'storage' and tablename = 'objects'
       and policyname = 'slice_illustrations_service_only'
       and permissive = 'RESTRICTIVE'
       and coalesce(qual, '') like '%is_service_account()%'
       and coalesce(with_check, '') like '%is_service_account()%'
  ) then
    raise exception
      'the restrictive service gate on slice-illustrations is gone, so these '
      'policies are the whole rule and a signed-in reader may write the bucket';
  end if;
end
$the_pattern$;

