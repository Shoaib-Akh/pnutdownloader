create extension if not exists "pgcrypto";

create table if not exists public.download_errors (
  id uuid primary key default gen_random_uuid(),
  download_id text not null default 'unknown',
  title text not null default 'Unknown',
  url text,
  content_platform text,
  error_message text not null,
  error_reason text not null default 'unknown',
  error_details text,
  exit_code integer,
  device_id text not null,
  auth_user_id text,
  auth_user_email text,
  device_name text,
  os_name text,
  platform text,
  device_type text,
  device_label text,
  download_type text,
  format text,
  quality text,
  bitrate text,
  save_to text,
  source text not null default 'download_failed',
  app_version text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.download_errors
  add column if not exists content_platform text,
  add column if not exists error_reason text not null default 'unknown',
  add column if not exists error_details text,
  add column if not exists exit_code integer,
  add column if not exists auth_user_id text,
  add column if not exists auth_user_email text,
  add column if not exists device_name text,
  add column if not exists os_name text,
  add column if not exists platform text,
  add column if not exists device_type text,
  add column if not exists device_label text,
  add column if not exists download_type text,
  add column if not exists format text,
  add column if not exists quality text,
  add column if not exists bitrate text,
  add column if not exists save_to text,
  add column if not exists source text not null default 'download_failed',
  add column if not exists app_version text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now();

create index if not exists download_errors_created_at_idx on public.download_errors (created_at desc);
create index if not exists download_errors_device_id_idx on public.download_errors (device_id);
create index if not exists download_errors_reason_idx on public.download_errors (error_reason);
create index if not exists download_errors_content_platform_idx on public.download_errors (content_platform);
create index if not exists download_errors_device_reason_idx
  on public.download_errors (device_id, error_reason, content_platform);

create or replace view public.download_error_summary as
select
  device_id,
  auth_user_id,
  auth_user_email,
  os_name,
  device_type,
  device_label,
  content_platform,
  error_reason,
  count(*)::bigint as error_count,
  min(created_at) as first_error_at,
  max(created_at) as last_error_at
from public.download_errors
group by
  device_id,
  auth_user_id,
  auth_user_email,
  os_name,
  device_type,
  device_label,
  content_platform,
  error_reason;

create or replace view public.download_error_reason_summary as
select
  error_reason,
  content_platform,
  count(*)::bigint as error_count,
  max(created_at) as last_error_at
from public.download_errors
group by
  error_reason,
  content_platform;

alter table public.download_errors enable row level security;

drop policy if exists "Anyone can submit download errors" on public.download_errors;
create policy "Anyone can submit download errors"
  on public.download_errors
  for insert
  to anon, authenticated
  with check (
    device_id is not null
    and error_message is not null
    and source = 'download_failed'
  );

grant insert on public.download_errors to anon, authenticated;
