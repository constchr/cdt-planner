-- Track when a task was marked Done, so the Status Call can keep showing it for
-- a week afterward. Run once in the Supabase SQL Editor.

alter table public.tasks add column if not exists done_at timestamptz;
