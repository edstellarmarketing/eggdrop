-- Phase 1: Supabase Schema and Data Model for Egg Drop Console
-- This script creates the dedicated 'eggdrop' schema and its tables.

create schema if not exists eggdrop;

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Events table
-- Stores event metadata, venue, date, and current game phase.
create table if not exists eggdrop.events (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    venue text,
    date timestamp with time zone,
    drop_height_meters numeric(5,2) default 3.0,
    current_phase text not null default 'setup', -- setup, budget_offer, build, trading, submission, drop_test, scoring, final, aborted
    timer_duration_minutes integer default 30,
    timer_started_at timestamp with time zone,
    timer_ends_at timestamp with time zone,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- 2. Event Settings table
-- Stores optional rules and twist toggles for a specific event.
create table if not exists eggdrop.event_settings (
    event_id uuid primary key references eggdrop.events(id) on delete cascade,
    trading_window_enabled boolean default false,
    mystery_resource_enabled boolean default false,
    market_crash_enabled boolean default false,
    forced_trade_enabled boolean default false,
    bullseye_bonus_enabled boolean default false,
    presentation_bonus_enabled boolean default true,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- 3. Teams table
-- Stores team information, join codes, and budget acceptance status.
create table if not exists eggdrop.teams (
    id uuid primary key default uuid_generate_v4(),
    event_id uuid not null references eggdrop.events(id) on delete cascade,
    name text not null,
    color text, -- hex code or name
    join_code text unique,
    budget_accepted_at timestamp with time zone,
    status text default 'active', -- active, disqualified, winner
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    unique(event_id, name)
);

-- 4. Team Members table
-- Stores participant names and their assigned roles within a team.
create table if not exists eggdrop.team_members (
    id uuid primary key default uuid_generate_v4(),
    team_id uuid not null references eggdrop.teams(id) on delete cascade,
    full_name text not null,
    role text, -- captain, member, treasurer, engineer
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- 5. Collaborators table
-- Stores admins and judges who have access to manage or score the event.
create table if not exists eggdrop.collaborators (
    id uuid primary key default uuid_generate_v4(),
    event_id uuid not null references eggdrop.events(id) on delete cascade,
    user_id uuid, -- links to auth.users
    email text not null,
    role text not null, -- admin, judge
    permissions jsonb default '{}'::jsonb,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    unique(event_id, email)
);

-- 6. Resources table
-- Marketplace catalog items for an event.
create table if not exists eggdrop.resources (
    id uuid primary key default uuid_generate_v4(),
    event_id uuid not null references eggdrop.events(id) on delete cascade,
    name text not null,
    category text, -- cushioning, structural, drag, adhesive, wildcard
    price_credits numeric(10,2) not null check (price_credits >= 0),
    stock_total integer not null check (stock_total >= 0),
    stock_remaining integer not null check (stock_remaining >= 0),
    image_url text,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- 7. Inventory Transactions table
-- Tracks every purchase, refund, or trade.
create table if not exists eggdrop.inventory_transactions (
    id uuid primary key default uuid_generate_v4(),
    event_id uuid not null references eggdrop.events(id) on delete cascade,
    team_id uuid not null references eggdrop.teams(id) on delete cascade,
    resource_id uuid references eggdrop.resources(id),
    quantity integer not null, -- positive for purchase, negative for refund
    unit_price numeric(10,2) not null,
    total_price numeric(10,2) not null,
    transaction_type text not null, -- purchase, refund, trade
    created_at timestamp with time zone default now()
);

-- 8. Team Wallets table
-- Durable snapshot of team budget and spend.
create table if not exists eggdrop.team_wallets (
    team_id uuid primary key references eggdrop.teams(id) on delete cascade,
    total_budget numeric(10,2) not null default 0 check (total_budget >= 0),
    spent_amount numeric(10,2) not null default 0 check (spent_amount >= 0),
    remaining_balance numeric(10,2) not null default 0,
    updated_at timestamp with time zone default now()
);

-- 9. Submissions table
-- Tracks digital submission state.
create table if not exists eggdrop.submissions (
    id uuid primary key default uuid_generate_v4(),
    event_id uuid not null references eggdrop.events(id) on delete cascade,
    team_id uuid not null references eggdrop.teams(id) on delete cascade,
    submitted_at timestamp with time zone default now(),
    status text default 'pending', -- pending, received, late, disqualified
    judge_confirmed_at timestamp with time zone,
    created_at timestamp with time zone default now(),
    unique(event_id, team_id)
);

-- 10. Drop Tests table
-- Records drop results and judge notes.
create table if not exists eggdrop.drop_tests (
    id uuid primary key default uuid_generate_v4(),
    event_id uuid not null references eggdrop.events(id) on delete cascade,
    team_id uuid not null references eggdrop.teams(id) on delete cascade,
    drop_order integer,
    egg_status text, -- intact, hairline, cracked, broken
    shield_status text, -- intact, minor, partial, destroyed
    judge_notes text,
    created_at timestamp with time zone default now(),
    unique(event_id, team_id)
);

-- 11. Scores table
-- Stores final calculated scores for each team.
create table if not exists eggdrop.scores (
    id uuid primary key default uuid_generate_v4(),
    event_id uuid not null references eggdrop.events(id) on delete cascade,
    team_id uuid not null references eggdrop.teams(id) on delete cascade,
    egg_integrity_score numeric(5,2) default 0,
    shield_integrity_score numeric(5,2) default 0,
    innovation_score numeric(5,2) default 0,
    budget_efficiency_score numeric(5,2) default 0,
    bonus_points numeric(5,2) default 0,
    penalty_points numeric(5,2) default 0,
    total_score numeric(5,2) generated always as (egg_integrity_score + shield_integrity_score + innovation_score + budget_efficiency_score + bonus_points - penalty_points) stored,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    unique(event_id, team_id)
);

-- 12. Twists table
-- Tracks scheduled or triggered game twists.
create table if not exists eggdrop.twists (
    id uuid primary key default uuid_generate_v4(),
    event_id uuid not null references eggdrop.events(id) on delete cascade,
    name text not null,
    description text,
    triggered_at timestamp with time zone default now()
);

-- 13. Audit Log table
-- Records important admin, judge, and team actions.
create table if not exists eggdrop.audit_log (
    id uuid primary key default uuid_generate_v4(),
    event_id uuid not null references eggdrop.events(id) on delete cascade,
    actor_id uuid, -- user_id or team_id
    action text not null,
    details jsonb default '{}'::jsonb,
    created_at timestamp with time zone default now()
);

-- Helper: Updated At Trigger Function
create or replace function eggdrop.update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Apply Updated At triggers
create trigger update_events_updated_at before update on eggdrop.events for each row execute procedure eggdrop.update_updated_at_column();
create trigger update_teams_updated_at before update on eggdrop.teams for each row execute procedure eggdrop.update_updated_at_column();
create trigger update_team_members_updated_at before update on eggdrop.team_members for each row execute procedure eggdrop.update_updated_at_column();
create trigger update_collaborators_updated_at before update on eggdrop.collaborators for each row execute procedure eggdrop.update_updated_at_column();
create trigger update_resources_updated_at before update on eggdrop.resources for each row execute procedure eggdrop.update_updated_at_column();
create trigger update_scores_updated_at before update on eggdrop.scores for each row execute procedure eggdrop.update_updated_at_column();

-- Helper: Wallet Balance Calculation
create or replace function eggdrop.update_wallet_balance()
returns trigger as $$
begin
    new.remaining_balance = new.total_budget - new.spent_amount;
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger update_wallet_balance_on_change before insert or update on eggdrop.team_wallets for each row execute procedure eggdrop.update_wallet_balance();

-- Realtime Configuration
-- Add the schema to the publication for realtime updates
-- Note: This usually needs to be done via the Supabase Dashboard or a specific RPC if using self-hosted
-- but we can prepare the tables for it.
alter publication supabase_realtime add table eggdrop.events;
alter publication supabase_realtime add table eggdrop.teams;
alter publication supabase_realtime add table eggdrop.resources;
alter publication supabase_realtime add table eggdrop.team_wallets;
alter publication supabase_realtime add table eggdrop.submissions;
alter publication supabase_realtime add table eggdrop.scores;
