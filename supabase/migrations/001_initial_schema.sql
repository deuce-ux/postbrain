-- Profiles table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  role text,
  project_description text,
  unique_angle text,
  content_topics text[],
  style_preferences text[],
  example_posts text[],
  background_journey text,
  voice_dna jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Idea bank table
create table if not exists public.ideas (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  content text not null,
  source text default 'manual',
  tags text[],
  status text default 'raw',
  used_at timestamptz,
  created_at timestamptz default now()
);

-- Generated posts table
create table if not exists public.generated_posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  original_idea text not null,
  generated_text text not null,
  platform text not null,
  status text default 'draft',
  idea_id uuid references public.ideas(id),
  performance_views integer,
  performance_likes integer,
  performance_comments integer,
  performance_shares integer,
  performance_notes text,
  performance_logged_at timestamptz,
  created_at timestamptz default now()
);

-- Viral posts swipe file
create table if not exists public.viral_posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  content text not null,
  platform text not null,
  hook_type text,
  structure_notes text,
  emotional_trigger text,
  created_at timestamptz default now()
);

-- Content calendar
create table if not exists public.content_calendar (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  scheduled_date date not null,
  platform text not null,
  topic text,
  post_id uuid references public.generated_posts(id),
  status text default 'planned',
  created_at timestamptz default now()
);

-- RLS policies
alter table public.profiles enable row level security;
alter table public.ideas enable row level security;
alter table public.generated_posts enable row level security;
alter table public.viral_posts enable row level security;
alter table public.content_calendar enable row level security;

create policy "Users own their profile" on public.profiles for all using (auth.uid() = id);
create policy "Users own their ideas" on public.ideas for all using (auth.uid() = user_id);
create policy "Users own their posts" on public.generated_posts for all using (auth.uid() = user_id);
create policy "Users own their viral posts" on public.viral_posts for all using (auth.uid() = user_id);
create policy "Users own their calendar" on public.content_calendar for all using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, new.raw_user_meta_data->>'name');
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
