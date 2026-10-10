create table if not exists public.__tmp_migration_sql (id int primary key, version text not null, sql text not null);
grant select, insert, delete on public.__tmp_migration_sql to authenticated;
grant all on public.__tmp_migration_sql to service_role;
create or replace function public.__tmp_replay_migration(p_id int)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sql text;
  v_version text;
begin
  select sql, version into v_sql, v_version from public.__tmp_migration_sql where id = p_id;
  if v_sql is null then
    raise exception 'missing migration %', p_id;
  end if;
  execute v_sql;
  insert into supabase_migrations.schema_migrations(version) values (v_version) on conflict do nothing;
  delete from public.__tmp_migration_sql where id = p_id;
  return 'ok:' || v_version;
end;
$$;
revoke all on function public.__tmp_replay_migration(int) from public, anon, authenticated;
grant execute on function public.__tmp_replay_migration(int) to service_role;