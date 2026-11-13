-- 기존 수업방은 NULL을 유지하므로 문제와 점수를 변경하지 않는다. (원격 마이그레이션 20261113062544)
alter table public.game_rooms add column if not exists lesson_state jsonb;
