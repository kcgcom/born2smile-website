create table public.admin_staff_accounts (
  email text primary key check (email = lower(trim(email)) and length(email) <= 254),
  permissions text[] not null check (
    cardinality(permissions) between 1 and 2
    and permissions <@ array['content', 'staff']::text[]
  ),
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.admin_browser_presence (
  email text not null,
  browser_id uuid not null,
  device_name text check (length(device_name) <= 60),
  public_ip inet,
  last_seen_at timestamptz not null default now(),
  primary key (email, browser_id)
);

create index admin_browser_presence_last_seen on public.admin_browser_presence (last_seen_at desc);

alter table public.admin_staff_accounts enable row level security;
alter table public.admin_browser_presence enable row level security;
revoke all on public.admin_staff_accounts, public.admin_browser_presence from public, anon, authenticated;
grant select, insert, update on public.admin_staff_accounts to service_role;
grant select, insert, update on public.admin_browser_presence to service_role;
