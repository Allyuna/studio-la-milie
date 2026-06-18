-- ============================================================
-- Studio La Milie — Tribute Wall — Supabase Setup
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- 1. Tributes table
create table public.tributes (
  id         uuid default gen_random_uuid() primary key,
  name       text not null,
  message    text not null,
  photo_url  text,
  is_public  boolean default false,
  created_at timestamp with time zone default now()
);

-- 2. Row Level Security
alter table public.tributes enable row level security;

-- Anyone can submit a tribute (INSERT)
create policy "Anyone can submit"
  on public.tributes for insert
  to anon
  with check (true);

-- Only published tributes are visible publicly (SELECT)
create policy "Public tributes are visible"
  on public.tributes for select
  to anon
  using (is_public = true);

-- Service role key (used by admin page) bypasses RLS automatically — no extra policy needed.
-- DELETE is only used via the service role key (admin page), RLS bypass covers it.

-- ============================================================
-- 3. Storage bucket for photos
-- Do this manually in the Supabase Dashboard:
--   Storage > New bucket
--   Name: tribute-photos
--   Public: YES (toggle on)
-- Then add these storage policies:
-- ============================================================

-- Allow anyone to upload photos
insert into storage.buckets (id, name, public)
values ('tribute-photos', 'tribute-photos', true)
on conflict (id) do nothing;

create policy "Anyone can upload"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'tribute-photos');

create policy "Anyone can view photos"
  on storage.objects for select
  to anon
  using (bucket_id = 'tribute-photos');

-- ============================================================
-- 4. After running this, add to your .env.local:
--
--   VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
--   VITE_SUPABASE_ANON_KEY=<anon key from Project Settings > API>
--   VITE_SUPABASE_SERVICE_KEY=<service_role key from Project Settings > API>
--   VITE_ADMIN_PASSWORD=lamilie2026
-- ============================================================
