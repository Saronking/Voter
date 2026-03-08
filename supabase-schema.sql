-- ============================================================
-- VoteLive — Supabase SQL Schema
-- Paste this into: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Sessions table
create table if not exists public.sessions (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid references auth.users(id) on delete cascade not null,
  title       text not null,
  type        text not null check (type in ('elimination', 'bracket')),
  bracket_size int,
  status      text not null default 'idle' check (status in ('idle', 'active', 'finished')),
  options     jsonb not null default '[]',
  current_round jsonb,
  rounds      jsonb not null default '[]',
  created_at  timestamptz default now()
);

-- Enable Row Level Security
alter table public.sessions enable row level security;

-- Authenticated users can manage their own sessions
create policy "owners can do everything"
  on public.sessions
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Anyone (voters) can read any session
create policy "public read"
  on public.sessions
  for select
  using (true);

-- Anyone can update votes on a session (voters submitting)
create policy "public vote update"
  on public.sessions
  for update
  using (true)
  with check (true);

-- Enable Realtime for this table
-- (You also need to enable realtime in Supabase Dashboard →
--  Database → Replication → supabase_realtime publication → add sessions table)
