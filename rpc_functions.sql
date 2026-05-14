-- Phase 5: Transactional Game Logic (RPCs)
-- This script adds functions for atomic operations like purchases.

-- 1. Function to purchase a resource
-- Ensures stock is available and team has enough budget in a single transaction.
create or replace function eggdrop.purchase_resource(
    p_team_id uuid,
    p_resource_id uuid,
    p_quantity integer
)
returns jsonb as $$
declare
    v_event_id uuid;
    v_price_credits numeric;
    v_total_price numeric;
    v_remaining_balance numeric;
    v_stock_remaining integer;
    v_resource_name text;
    v_current_phase text;
begin
    -- 1. Get resource and event info
    select event_id, price_credits, stock_remaining, name
    into v_event_id, v_price_credits, v_stock_remaining, v_resource_name
    from eggdrop.resources
    where id = p_resource_id;

    if not found then
        return jsonb_build_object('error', 'Resource not found');
    end if;

    -- 2. Check game phase
    select current_phase into v_current_phase
    from eggdrop.events
    where id = v_event_id;

    if v_current_phase != 'build' and v_current_phase != 'trading' then
        return jsonb_build_object('error', 'Marketplace is currently closed');
    end if;

    -- 3. Check stock
    if v_stock_remaining < p_quantity then
        return jsonb_build_object('error', 'Insufficient stock for ' || v_resource_name);
    end if;

    -- 4. Check budget
    v_total_price := v_price_credits * p_quantity;
    
    select remaining_balance into v_remaining_balance
    from eggdrop.team_wallets
    where team_id = p_team_id;

    if v_remaining_balance < v_total_price then
        return jsonb_build_object('error', 'Insufficient credits in wallet');
    end if;

    -- 5. Perform Atomic Updates
    
    -- Update Stock
    update eggdrop.resources
    set stock_remaining = stock_remaining - p_quantity,
        updated_at = now()
    where id = p_resource_id;

    -- Update Wallet
    update eggdrop.team_wallets
    set spent_amount = spent_amount + v_total_price,
        updated_at = now()
    where team_id = p_team_id;

    -- Insert Transaction Record
    insert into eggdrop.inventory_transactions (
        event_id, team_id, resource_id, quantity, unit_price, total_price, transaction_type
    ) values (
        v_event_id, p_team_id, p_resource_id, p_quantity, v_price_credits, v_total_price, 'purchase'
    );

    -- Log to Audit
    insert into eggdrop.audit_log (event_id, actor_id, action, details)
    values (v_event_id, p_team_id, 'purchase', jsonb_build_object('item', v_resource_name, 'qty', p_quantity, 'cost', v_total_price));

    return jsonb_build_object('success', true, 'remaining_balance', v_remaining_balance - v_total_price);
end;
$$ language plpgsql security definer;
