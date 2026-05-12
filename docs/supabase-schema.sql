create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text
);

create table guardians (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  name text not null,
  email text not null,
  phone text
);

create table sos_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  latitude double precision not null,
  longitude double precision not null,
  created_at timestamptz not null default now()
);

create table user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  speech_rate numeric not null default 1,
  voice_enabled boolean not null default true
);
