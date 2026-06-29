-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- 1. Profiles Table (syncs with Supabase Auth users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  role text not null default 'user'
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Drop policies if they exist (allows safe re-runs)
drop policy if exists "Users can view their own profile" on public.profiles;

-- Create policy to read profile
create policy "Users can view their own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

-- 2. Items Table
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  type text not null check (type in ('note', 'url', 'image', 'file')),
  text text,
  title text,
  url text,
  storage_path text,
  mime text,
  size bigint,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  favorite boolean not null default false
);

-- Enable Row Level Security (RLS)
alter table public.items enable row level security;

-- Drop policy if exists
drop policy if exists "Users can perform all operations on their own items" on public.items;

-- Create policy for users to manage their own items
create policy "Users can perform all operations on their own items"
  on public.items for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. Trigger Function to sync auth.users with public.profiles
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Recreate trigger (drop first to prevent duplicate errors)
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
