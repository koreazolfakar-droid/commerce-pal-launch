-- Keep direct CMS writes available to authenticated dashboard staff while
-- preserving row-level security. Anonymous clients never receive write grants.
revoke insert, update, delete, truncate, references, trigger on public.cms_brands from anon;
revoke insert, update, delete, truncate, references, trigger on public.cms_hero_slides from anon;
revoke insert, update, delete, truncate, references, trigger on public.cms_navigation from anon;
revoke insert, update, delete, truncate, references, trigger on public.cms_sections from anon;
revoke insert, update, delete, truncate, references, trigger on public.cms_seo_pages from anon;
revoke insert, update, delete, truncate, references, trigger on public.cms_settings from anon;

-- Dashboard CRUD is still constrained by the existing is_staff(auth.uid()) RLS
-- policies. These table privileges merely allow those policies to be evaluated.
grant select, insert, update, delete on public.cms_brands to authenticated;
grant select, insert, update, delete on public.cms_hero_slides to authenticated;
grant select, insert, update, delete on public.cms_navigation to authenticated;
grant select, insert, update, delete on public.cms_sections to authenticated;
grant select, insert, update, delete on public.cms_seo_pages to authenticated;
grant select, insert, update, delete on public.cms_settings to authenticated;

create table if not exists public.edge_rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  count integer not null default 0 check (count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.edge_rate_limits enable row level security;
revoke all on public.edge_rate_limits from public, anon, authenticated;
grant all on public.edge_rate_limits to service_role;

create or replace function public.consume_edge_rate_limit(
  _key text,
  _window_seconds integer,
  _limit integer
)
returns table(allowed boolean, remaining integer, reset_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  now_ts timestamptz := now();
  current_count integer;
  current_window timestamptz;
begin
  if _key is null or length(_key) < 1 or length(_key) > 200 then
    raise exception 'invalid rate-limit key';
  end if;
  if _window_seconds < 1 or _window_seconds > 86400 or _limit < 1 or _limit > 100000 then
    raise exception 'invalid rate-limit bounds';
  end if;

  insert into public.edge_rate_limits as erl (key, window_start, count, updated_at)
  values (_key, now_ts, 1, now_ts)
  on conflict (key) do update
  set count = case
        when erl.window_start <= now_ts - make_interval(secs => _window_seconds) then 1
        else erl.count + 1
      end,
      window_start = case
        when erl.window_start <= now_ts - make_interval(secs => _window_seconds) then now_ts
        else erl.window_start
      end,
      updated_at = now_ts
  returning erl.count, erl.window_start into current_count, current_window;

  delete from public.edge_rate_limits where updated_at < now_ts - interval '2 days';

  allowed := current_count <= _limit;
  remaining := greatest(_limit - current_count, 0);
  reset_at := current_window + make_interval(secs => _window_seconds);
  return next;
end;
$$;

revoke all on function public.consume_edge_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_edge_rate_limit(text, integer, integer) to service_role;
