-- 2026-08-09: Allow admin/editor panel users to insert & update the Google indexing queue.
-- Previously only a public SELECT policy existed, so client-side queue writes silently failed.

create policy "Admins can insert into indexing queue"
on public.google_indexing_queue
for insert
to authenticated
with check (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin', 'editor'))
);

create policy "Admins can update indexing queue"
on public.google_indexing_queue
for update
to authenticated
using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin', 'editor'))
)
with check (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin', 'editor'))
);
