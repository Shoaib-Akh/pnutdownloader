create extension if not exists "pgcrypto";

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  rating integer not null check (rating between 1 and 5),
  category text not null default 'review',
  name text,
  email text,
  message text,
  device_id text not null,
  platform text,
  os_name text,
  device_type text,
  device_label text,
  review_surface text not null default 'in_app_review',
  app_version text,
  source text not null default 'in_app_review',
  status text not null default 'new',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.feedback
  add column if not exists os_name text,
  add column if not exists device_type text,
  add column if not exists device_label text,
  add column if not exists review_surface text not null default 'in_app_review';

alter table public.feedback
  alter column review_surface set default 'in_app_review';

update public.feedback
set review_surface = coalesce(review_surface, 'in_app_review')
where review_surface is null;

alter table public.feedback
  alter column review_surface set not null;

create index if not exists feedback_created_at_idx on public.feedback (created_at desc);
create index if not exists feedback_status_idx on public.feedback (status);
create index if not exists feedback_rating_idx on public.feedback (rating);
create index if not exists feedback_os_name_idx on public.feedback (os_name);
create index if not exists feedback_device_type_idx on public.feedback (device_type);

alter table public.feedback enable row level security;

drop policy if exists "Anyone can submit app feedback" on public.feedback;
create policy "Anyone can submit app feedback"
  on public.feedback
  for insert
  to anon, authenticated
  with check (
    rating between 1 and 5
    and source = 'in_app_review'
  );

grant insert on public.feedback to anon, authenticated;
