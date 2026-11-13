-- 원격 마이그레이션 20261113070256. 테이블 접근 권한은 변경하지 않는다.
create function public.hangul_clock_ms()
returns bigint
language sql
stable
security invoker
set search_path = ''
as $$
  select pg_catalog.floor(extract(epoch from pg_catalog.statement_timestamp()) * 1000)::bigint;
$$;

revoke all on function public.hangul_clock_ms() from public, anon, authenticated;
grant execute on function public.hangul_clock_ms() to anon, authenticated;

-- 이전 수업방에는 timer가 없으므로 기존 문제와 점수는 건드리지 않는다.
create function public.hangul_guard_round_time()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  timer_data jsonb;
  started_text text;
  started_ms bigint;
  now_ms bigint;
  has_new_completion boolean;
begin
  if old.match_start_time is null
     or new.match_start_time is distinct from old.match_start_time
     or new.stage_idx is distinct from old.stage_idx
     or pg_catalog.jsonb_typeof(old.lesson_state -> 'timer') is distinct from 'object' then
    return new;
  end if;

  timer_data := old.lesson_state -> 'timer';
  started_text := timer_data ->> 'startedAt';
  if started_text is null or started_text !~ '^[0-9]{1,16}$'
     or (timer_data ->> 'durationMs') is distinct from '180000' then
    return new;
  end if;
  started_ms := started_text::bigint;
  if started_ms <> old.match_start_time then
    return new;
  end if;
  now_ms := pg_catalog.floor(extract(epoch from pg_catalog.clock_timestamp()) * 1000)::bigint;

  if old.is_match_active is true and new.is_match_active is false
     and (new.lesson_state #>> '{timer,reason}') = 'timeout'
     and now_ms < started_ms + 180000 then
    raise exception using errcode = 'P0001', message = 'ROUND_NOT_EXPIRED';
  end if;

  if now_ms < started_ms + 180000 and old.is_match_active is true then
    return new;
  end if;
  if pg_catalog.jsonb_typeof(old.teams) is distinct from 'array'
     or pg_catalog.jsonb_typeof(new.teams) is distinct from 'array' then
    return new;
  end if;

  select exists (
    select 1
    from pg_catalog.jsonb_array_elements(new.teams) as new_team(value)
    cross join lateral pg_catalog.jsonb_array_elements(
      case when pg_catalog.jsonb_typeof(new_team.value -> 'members') = 'array'
        then new_team.value -> 'members' else '[]'::jsonb end
    ) as new_member(value)
    where new_member.value ->> 'completed' = 'true'
      and not exists (
        select 1
        from pg_catalog.jsonb_array_elements(old.teams) as old_team(value)
        cross join lateral pg_catalog.jsonb_array_elements(
          case when pg_catalog.jsonb_typeof(old_team.value -> 'members') = 'array'
            then old_team.value -> 'members' else '[]'::jsonb end
        ) as old_member(value)
        where old_team.value ->> 'id' = new_team.value ->> 'id'
          and old_member.value ->> 'id' = new_member.value ->> 'id'
          and old_member.value ->> 'completed' = 'true'
      )
  ) into has_new_completion;

  if has_new_completion then
    raise exception using errcode = 'P0001', message = 'ROUND_TIME_EXPIRED';
  end if;
  return new;
end;
$$;

revoke all on function public.hangul_guard_round_time() from public, anon, authenticated;

create trigger hangul_round_time_guard
before update of is_match_active, match_start_time, stage_idx, teams, lesson_state
on public.game_rooms
for each row execute function public.hangul_guard_round_time();
