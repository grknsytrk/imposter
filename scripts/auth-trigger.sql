-- 1. Create profiles table if it doesn't exist
-- This table mirrors auth.users and holds public profile data
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  username text unique,
  avatar text default 'ghost',
  updated_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()),

  constraint username_length check (char_length(username) >= 3)
);

-- 2. Enable Row Level Security (Security Best Practice)
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- 3. Create a Trigger to auto-create profile on signup
-- This ensures every authenticated user has a corresponding row in public.profiles
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, avatar)
  values (
    new.id, 
    new.raw_user_meta_data->>'name', 
    'ghost' -- Default avatar
  )
  on conflict (id) do nothing; -- Prevent errors if retry works
  return new;
end;
$$ language plpgsql security definer;

-- 4. Attach the trigger to auth.users
-- Drop first to prevent duplicates if re-running
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
