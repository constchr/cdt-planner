-- Audit trail for tasks (feature #7).
-- Run this in the Supabase SQL Editor once. Until it exists, the app still
-- works — the Activity section just stays empty and logging is a no-op.

create table if not exists public.task_history (
  id         bigint generated always as identity primary key,
  task_id    text        not null,
  actor      text,
  action     text        not null,   -- create | edit | status | reschedule | reassign | delete | restore
  detail     text,
  created_at timestamptz not null default now()
);

create index if not exists task_history_task_idx
  on public.task_history (task_id, created_at desc);

alter table public.task_history enable row level security;

-- Any signed-in user may read and append history. (Inserts are append-only;
-- no update/delete policies are defined, so the log can't be tampered with.)
create policy "task_history read"
  on public.task_history for select
  using (auth.role() = 'authenticated');

create policy "task_history insert"
  on public.task_history for insert
  with check (auth.role() = 'authenticated');
