-- ─── CDT Planner — Supabase Schema ──────────────────────────────────────────
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query)

-- 1. PROFILES  (one row per Google user, links auth.users to a team member + role)
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text,
  full_name    text,
  role         text check (role in ('admin','employee')),  -- null = pending approval
  member_name  text,   -- must match a name in public.members
  created_at   timestamptz default now()
);
alter table public.profiles enable row level security;
-- Anyone can read profiles (needed for AccountsView)
create policy "profiles_select" on public.profiles for select using (true);
-- Users can upsert their own profile; admins can update any
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update using (
  auth.uid() = id or
  (select role from public.profiles where id = auth.uid()) = 'admin'
);

-- 2. MEMBERS
create table if not exists public.members (
  name   text primary key,
  fte    numeric(4,2) not null default 1.0,
  created_at timestamptz default now()
);
alter table public.members enable row level security;
create policy "members_select" on public.members for select using (true);
create policy "members_write"  on public.members for all using (
  (select role from public.profiles where id = auth.uid()) = 'admin'
);

-- 3. TASKS
create table if not exists public.tasks (
  id              text primary key,
  summary         text not null,
  assignee        text references public.members(name) on update cascade on delete set null,
  customer        text,
  status          text not null default 'To Do',
  priority        text not null default 'Medium',
  man_days        numeric(6,2) not null default 1,
  efficiency_pct  integer not null default 100,
  buffer_days     integer not null default 0,
  start_date      date not null,
  jira_url        text,
  deps            text[] default '{}',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
alter table public.tasks enable row level security;
-- All authenticated users can read all tasks
create policy "tasks_select" on public.tasks for select using (auth.role() = 'authenticated');
-- Admins can write anything; employees can only update tasks assigned to them
create policy "tasks_insert" on public.tasks for insert with check (
  (select role from public.profiles where id = auth.uid()) = 'admin'
);
create policy "tasks_update" on public.tasks for update using (
  (select role from public.profiles where id = auth.uid()) = 'admin' or
  assignee = (select member_name from public.profiles where id = auth.uid())
);
create policy "tasks_delete" on public.tasks for delete using (
  (select role from public.profiles where id = auth.uid()) = 'admin'
);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

-- 4. CUSTOMERS
create table if not exists public.customers (
  name text primary key,
  created_at timestamptz default now()
);
alter table public.customers enable row level security;
create policy "customers_select" on public.customers for select using (auth.role() = 'authenticated');
create policy "customers_write"  on public.customers for all using (auth.role() = 'authenticated');

-- 5. REPORTS
create table if not exists public.reports (
  id          text primary key,
  date        text not null,
  iso_date    date not null,
  notes       jsonb not null default '{}',
  snapshot    jsonb not null default '[]',
  created_at  timestamptz default now()
);
alter table public.reports enable row level security;
create policy "reports_select" on public.reports for select using (auth.role() = 'authenticated');
create policy "reports_insert" on public.reports for insert with check (auth.role() = 'authenticated');
create policy "reports_delete" on public.reports for delete using (
  (select role from public.profiles where id = auth.uid()) = 'admin'
);

-- 6. Enable realtime for tasks table
alter publication supabase_realtime add table public.tasks;

-- ─── Seed your first admin ────────────────────────────────────────────────────
-- After you sign in with Google for the first time, run this to make yourself admin:
-- (replace the email with yours)
--
-- update public.profiles
-- set role = 'admin', member_name = 'Your Name'
-- where email = 'you@gmail.com';
