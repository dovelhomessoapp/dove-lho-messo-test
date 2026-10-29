-- TEST ONLY — Dove l'ho messo?
-- Server-side enforcement of the 30 item free-plan limit.
-- Apply only to the TEST Supabase project first.

create or replace function public.enforce_free_item_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_is_premium boolean;
  v_item_count integer;
begin
  -- An upsert on an already existing id is an update, not a new quota item.
  if tg_op = 'INSERT' and exists (
    select 1
    from public.items i
    where i.id = new.id
  ) then
    return new;
  end if;

  -- Premium includes both the free trial and a paid active subscription.
  select exists (
    select 1
    from public.home_subscriptions hs
    where hs.home_id = new.home_id
      and hs.status in ('trialing', 'active')
  )
  into v_is_premium;

  if v_is_premium then
    return new;
  end if;

  select count(*)
  into v_item_count
  from public.items i
  where i.home_id = new.home_id;

  if v_item_count >= 30 then
    raise exception using
      errcode = 'P0001',
      message = 'FREE_PLAN_ITEM_LIMIT_REACHED',
      detail = 'Il piano gratuito consente al massimo 30 elementi per casa.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_free_item_limit on public.items;

create trigger trg_enforce_free_item_limit
before insert on public.items
for each row
execute function public.enforce_free_item_limit();

comment on function public.enforce_free_item_limit() is
'TEST: blocca il 31° elemento per le case senza abbonamento active/trialing.';
