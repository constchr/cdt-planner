-- Mark a task as not time-critical: it never gets reported as overdue.
-- Purely additive — adds one column with a default; no existing data is read,
-- changed, or removed. Every existing task defaults to false (current behaviour).
-- Run once in the Supabase SQL Editor.

alter table public.tasks add column if not exists no_overdue boolean not null default false;
