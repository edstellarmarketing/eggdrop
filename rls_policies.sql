-- Phase 2: Row-Level Security (RLS) Policies for Egg Drop Console
-- This script secures the 'eggdrop' schema tables.

-- Enable RLS on all tables
alter table eggdrop.events enable row level security;
alter table eggdrop.event_settings enable row level security;
alter table eggdrop.teams enable row level security;
alter table eggdrop.team_members enable row level security;
alter table eggdrop.collaborators enable row level security;
alter table eggdrop.resources enable row level security;
alter table eggdrop.inventory_transactions enable row level security;
alter table eggdrop.team_wallets enable row level security;
alter table eggdrop.submissions enable row level security;
alter table eggdrop.drop_tests enable row level security;
alter table eggdrop.scores enable row level security;
alter table eggdrop.twists enable row level security;
alter table eggdrop.audit_log enable row level security;

-- Helper Function: Check if user is a collaborator (admin/judge) for an event
create or replace function eggdrop.is_collaborator(event_id uuid, role_type text default null)
returns boolean as $$
begin
    if role_type is null then
        return exists (
            select 1 from eggdrop.collaborators
            where collaborators.event_id = is_collaborator.event_id
            and collaborators.user_id = auth.uid()
        );
    else
        return exists (
            select 1 from eggdrop.collaborators
            where collaborators.event_id = is_collaborator.event_id
            and collaborators.user_id = auth.uid()
            and collaborators.role = role_type
        );
    end if;
end;
$$ language plpgsql security definer;

-- 1. Events Policies
create policy "Admins can manage events"
on eggdrop.events for all
using (eggdrop.is_collaborator(id, 'admin'));

create policy "Judges and Teams can read events"
on eggdrop.events for select
using (true); -- Public events can be read by anyone with the link for now

-- 2. Teams Policies
create policy "Admins/Judges can manage teams"
on eggdrop.teams for all
using (eggdrop.is_collaborator(event_id));

create policy "Teams can read themselves"
on eggdrop.teams for select
using (true); -- Filtered by join code in app logic, but RLS allows read

-- 3. Resources Policies
create policy "Admins can manage resources"
on eggdrop.resources for all
using (eggdrop.is_collaborator(event_id, 'admin'));

create policy "Anyone can read resources"
on eggdrop.resources for select
using (true);

-- 4. Team Wallets Policies
create policy "Admins/Judges can read all wallets"
on eggdrop.team_wallets for select
using (exists (
    select 1 from eggdrop.teams
    where teams.id = team_wallets.team_id
    and eggdrop.is_collaborator(teams.event_id)
));

create policy "Teams can read their own wallet"
on eggdrop.team_wallets for select
using (true); -- App logic filters by team_id

-- 5. Inventory Transactions Policies
create policy "Admins/Judges can read all transactions"
on eggdrop.inventory_transactions for select
using (eggdrop.is_collaborator(event_id));

create policy "Teams can insert their own transactions"
on eggdrop.inventory_transactions for insert
with check (true); -- Validated by server-side RPCs or logic

-- 6. Submissions Policies
create policy "Admins/Judges can manage submissions"
on eggdrop.submissions for all
using (eggdrop.is_collaborator(event_id));

create policy "Teams can create/read their own submissions"
on eggdrop.submissions for all
using (true);

-- 7. Scores Policies
create policy "Admins/Judges can manage scores"
on eggdrop.scores for all
using (eggdrop.is_collaborator(event_id));

create policy "Anyone can read scores"
on eggdrop.scores for select
using (true);

-- 8. Audit Log Policies
create policy "Only Admins can read audit log"
on eggdrop.audit_log for select
using (eggdrop.is_collaborator(event_id, 'admin'));

create policy "System can insert audit log"
on eggdrop.audit_log for insert
with check (true);
