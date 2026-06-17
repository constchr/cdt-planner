-- Absences (vacation / leave) are stored as tasks with kind = 'absence'.
-- A normal task has kind = 'task' (the default). Run once in the SQL Editor.

alter table public.tasks add column if not exists kind text not null default 'task';
