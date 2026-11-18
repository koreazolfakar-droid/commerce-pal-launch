-- Serialize dashboard login attempts per client bucket in PostgreSQL.
-- The previous Edge Function performed separate SELECT/UPSERT calls: parallel
-- requests could overwrite the same failure_count and bypass the threshold.
-- This RPC runs as the service_role caller, not SECURITY DEFINER, and exposes
-- no execution privilege to unauthenticated or normal authenticated clients.
create or replace function public.consume_dashboard_login_attempt(
  p_pair_key_hash text,
  p_ip_key_hash text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $function$
declare
  v_now timestamptz := clock_timestamp();
  v_pair_blocked_until timestamptz;
  v_ip_blocked_until timestamptz;
  v_retry_after integer := 0;
  v_index integer;
  v_key_hash text;
  v_soft_threshold integer;
  v_hard_threshold integer;
  v_failure_count integer;
  v_window_started_at timestamptz;
  v_blocked_until timestamptz;
  v_pair_remaining integer := 0;
  v_ip_remaining integer := 0;
begin
  if p_pair_key_hash is null
     or p_ip_key_hash is null
     or p_pair_key_hash !~ '^[0-9a-f]{64}$'
     or p_ip_key_hash !~ '^[0-9a-f]{64}$'
     or p_pair_key_hash = p_ip_key_hash
  then
    raise exception 'invalid dashboard throttle bucket' using errcode = '22023';
  end if;

  -- Lock the IP bucket, including when the row does not exist yet, so both
  -- pair and IP counters are checked and updated atomically under bursts.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_ip_key_hash, 0)
  );

  select blocked_until into v_pair_blocked_until
    from public.dashboard_login_throttle where key_hash = p_pair_key_hash;
  select blocked_until into v_ip_blocked_until
    from public.dashboard_login_throttle where key_hash = p_ip_key_hash;

  v_retry_after := greatest(
    case when v_pair_blocked_until > v_now then
      ceil(extract(epoch from v_pair_blocked_until - v_now))::integer else 0 end,
    case when v_ip_blocked_until > v_now then
      ceil(extract(epoch from v_ip_blocked_until - v_now))::integer else 0 end
  );
  if v_retry_after > 0 then
    return jsonb_build_object('allowed', false, 'retryAfter', v_retry_after);
  end if;

  for v_index in 1..2 loop
    v_key_hash := case when v_index = 1 then p_pair_key_hash else p_ip_key_hash end;
    v_soft_threshold := case when v_index = 1 then 5 else 25 end;
    v_hard_threshold := case when v_index = 1 then 10 else 50 end;

    select failure_count, window_started_at
      into v_failure_count, v_window_started_at
      from public.dashboard_login_throttle
      where key_hash = v_key_hash;

    if not found or v_window_started_at <= v_now - interval '10 minutes' then
      v_failure_count := 1;
      v_window_started_at := v_now;
    else
      v_failure_count := v_failure_count + 1;
    end if;

    v_blocked_until := case
      when v_failure_count >= v_hard_threshold then v_now + interval '60 minutes'
      when v_failure_count >= v_soft_threshold then v_now + interval '15 minutes'
      else null
    end;

    insert into public.dashboard_login_throttle (
      key_hash, failure_count, window_started_at, blocked_until, last_attempt_at
    ) values (
      v_key_hash, v_failure_count, v_window_started_at, v_blocked_until, v_now
    )
    on conflict (key_hash) do update set
      failure_count = excluded.failure_count,
      window_started_at = excluded.window_started_at,
      blocked_until = excluded.blocked_until,
      last_attempt_at = excluded.last_attempt_at;

    if v_index = 1 then
      v_pair_remaining := greatest(0, v_soft_threshold - v_failure_count);
    else
      v_ip_remaining := greatest(0, v_soft_threshold - v_failure_count);
    end if;
  end loop;

  -- As before, the attempt reaching the threshold is processed. Subsequent
  -- attempts are blocked before reaching Supabase password authentication.
  return jsonb_build_object(
    'allowed', true,
    'retryAfter', 0,
    'remainingBeforeBlock', least(v_pair_remaining, v_ip_remaining)
  );
end;
$function$;

revoke all on function public.consume_dashboard_login_attempt(text, text)
  from public, anon, authenticated;
grant execute on function public.consume_dashboard_login_attempt(text, text)
  to service_role;

comment on function public.consume_dashboard_login_attempt(text, text) is
  'Service-role-only atomic dashboard password-attempt throttle. Expects opaque SHA-256 bucket hashes.';
