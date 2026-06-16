create extension if not exists "pgcrypto";

create table if not exists public.donation_clicks (
  id uuid primary key default gen_random_uuid(),
  button_action text not null,
  button_label text not null,
  target_url text,
  device_id text not null,
  device_name text,
  os_name text,
  platform text,
  device_type text,
  device_label text,
  source text not null default 'donation_modal',
  app_version text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists donation_clicks_created_at_idx on public.donation_clicks (created_at desc);
create index if not exists donation_clicks_device_id_idx on public.donation_clicks (device_id);
create index if not exists donation_clicks_os_name_idx on public.donation_clicks (os_name);
create index if not exists donation_clicks_button_action_idx on public.donation_clicks (button_action);
create index if not exists donation_clicks_device_summary_idx
  on public.donation_clicks (device_id, os_name, device_label, button_action);

create or replace view public.donation_click_summary as
select
  device_id,
  device_name,
  os_name,
  platform,
  device_type,
  device_label,
  button_action,
  button_label,
  count(*)::bigint as click_count,
  min(created_at) as first_clicked_at,
  max(created_at) as last_clicked_at
from public.donation_clicks
group by
  device_id,
  device_name,
  os_name,
  platform,
  device_type,
  device_label,
  button_action,
  button_label;

alter table public.donation_clicks enable row level security;

drop policy if exists "Anyone can submit donation clicks" on public.donation_clicks;
create policy "Anyone can submit donation clicks"
  on public.donation_clicks
  for insert
  to anon, authenticated
  with check (
    button_action is not null
    and button_label is not null
    and device_id is not null
    and source = 'donation_modal'
  );

grant insert on public.donation_clicks to anon, authenticated;
