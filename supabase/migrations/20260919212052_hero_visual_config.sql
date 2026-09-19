alter table public.cms_hero_slides
  add column if not exists visual_config jsonb not null
  default '{"vertical":"bottom","titleSize":"standard","contentWidth":"standard","buttonRadius":"rounded"}'::jsonb;

alter table public.cms_hero_slides
  drop constraint if exists cms_hero_visual_config_check;

alter table public.cms_hero_slides
  add constraint cms_hero_visual_config_check check (
    jsonb_typeof(visual_config) = 'object'
    and coalesce(visual_config->>'vertical','bottom') in ('top','center','bottom')
    and coalesce(visual_config->>'titleSize','standard') in ('compact','standard','large')
    and coalesce(visual_config->>'contentWidth','standard') in ('narrow','standard','wide')
    and coalesce(visual_config->>'buttonRadius','rounded') in ('soft','rounded','pill')
  );

create or replace function public.set_cms_hero_visual_config(
  p_slide_id uuid,
  p_visual_config jsonb
)
returns public.cms_hero_slides
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
declare
  v_slide public.cms_hero_slides%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not private.is_dashboard_staff() then raise exception 'dashboard staff required'; end if;

  update public.cms_hero_slides
  set visual_config = coalesce(p_visual_config, '{}'::jsonb),
      updated_at = now()
  where id = p_slide_id
  returning * into v_slide;

  if v_slide.id is null then raise exception 'hero slide not found'; end if;

  perform private.log_cms_action(
    'update','hero_slide_visual',v_slide.id::text,
    jsonb_build_object('visual_config',v_slide.visual_config)
  );

  return v_slide;
end;
$$;

revoke all on function public.set_cms_hero_visual_config(uuid,jsonb) from public, anon;
grant execute on function public.set_cms_hero_visual_config(uuid,jsonb) to authenticated;