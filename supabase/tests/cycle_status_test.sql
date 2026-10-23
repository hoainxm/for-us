-- =============================================================================
-- Test hàm chu kỳ theo AC của ba-spec 01 (docs/app-map/01-ba-spec-menstrual-cycle.md).
-- Chạy SAU migration 00011, trong SQL Editor. Toàn bộ nằm trong transaction và ROLLBACK
-- ở cuối -> không để lại dữ liệu. Thành công: in ra "ALL CYCLE TESTS PASSED".
-- Lỗi: dừng ở assert đầu tiên sai, kèm tên AC.
-- =============================================================================
begin;

-- Giả lập đăng nhập bằng profile đầu tiên (auth.uid() đọc từ request.jwt.claims).
select set_config(
  'request.jwt.claims',
  json_build_object('sub', (select id from public.profiles order by created_at limit 1))::text,
  true
);

do $$
declare
  uid uuid := auth.uid();
  t   date := public.today_vn();
  s   jsonb;
  r   jsonb;
  ok  boolean;
begin
  if uid is null then raise exception 'Không có profile nào để test'; end if;

  -- Xoá sạch dữ liệu chu kỳ của uid (chỉ trong transaction) rồi đặt cấu hình mặc định
  delete from period_logs where user_id = uid;
  insert into cycle_settings (user_id, is_tracking, cycle_length, period_length, lead_days)
  values (uid, true, 28, 5, 2)
  on conflict (user_id) do update set is_tracking = true, cycle_length = 28, period_length = 5, lead_days = 2;

  -- AC-1: 1 kỳ mở từ 2026-10-01, xem ngày 2026-10-18
  insert into period_logs (user_id, start_date) values (uid, '2026-10-01');
  s := cycle_status(uid, '2026-10-18');
  assert s->>'next_start' = '2026-10-29', 'AC-1 next_start ' || (s->>'next_start');
  assert (s->>'cycle_day')::int = 18, 'AC-1 cycle_day';
  assert (s->>'days_until')::int = 11, 'AC-1 days_until';
  assert s->'periods'->0->>'effective_end' = '2026-10-05', 'AC-1 effective_end';
  assert (s->'periods'->0->>'is_estimated')::boolean, 'AC-1 estimated';
  assert s->>'status' = 'upcoming', 'AC-1 status';

  -- AC-9: 0 chu kỳ hoàn chỉnh -> dùng cấu hình (30)
  update cycle_settings set cycle_length = 30 where user_id = uid;
  s := cycle_status(uid, '2026-10-18');
  assert s->>'next_start' = '2026-10-31' and (s->>'cycles_used')::int = 0, 'AC-9';
  update cycle_settings set cycle_length = 28 where user_id = uid;

  -- AC-10: quá ngày / đúng ngày dự kiến
  s := cycle_status(uid, '2026-11-02');
  assert s->>'status' = 'overdue' and (s->>'days_overdue')::int = 4, 'AC-10 overdue';
  s := cycle_status(uid, '2026-10-29');
  assert s->>'status' = 'due_today' and (s->>'days_until')::int = 0, 'AC-10 due_today';

  -- AC-19: dải dự đoán 29/10 -> 02/11
  s := cycle_status(uid, '2026-10-18');
  assert s->>'predicted_end' = '2026-11-02', 'AC-19 predicted_end ' || (s->>'predicted_end');

  -- AC-20: sửa start -> dự đoán dời
  update period_logs set start_date = '2026-10-03' where user_id = uid;
  s := cycle_status(uid, '2026-10-18');
  assert s->>'next_start' = '2026-10-31', 'AC-20';

  -- AC-6: chu kỳ 29, 29, 30 -> TB 29, kỳ tới 26/08
  delete from period_logs where user_id = uid;
  insert into period_logs (user_id, start_date, end_date) values
    (uid, '2026-05-01', '2026-05-05'), (uid, '2026-05-30', '2026-06-03'),
    (uid, '2026-06-28', '2026-07-02'), (uid, '2026-07-28', '2026-08-01');
  s := cycle_status(uid, '2026-08-05');
  assert (s->>'avg_cycle')::int = 29 and (s->>'cycles_used')::int = 3
     and s->>'next_start' = '2026-08-26', 'AC-6 ' || s::text;
  assert (s->>'avg_period')::int = 5, 'AC-6 avg_period';

  -- AC-7: 28, 28, 56, 28 -> loại 56
  delete from period_logs where user_id = uid;
  insert into period_logs (user_id, start_date, end_date) values
    (uid, '2026-01-01', '2026-01-05'), (uid, '2026-01-29', '2026-02-02'),
    (uid, '2026-02-26', '2026-03-02'), (uid, '2026-04-23', '2026-04-27'),
    (uid, '2026-05-21', '2026-05-25');
  s := cycle_status(uid, '2026-06-01');
  assert (s->>'avg_cycle')::int = 28 and (s->>'cycles_used')::int = 3
     and (s->>'cycles_excluded')::int = 1, 'AC-7 ' || s::text;

  -- AC-8: 8 chu kỳ, 2 cũ = 40, 6 gần = 28 -> chỉ dùng 6
  delete from period_logs where user_id = uid;
  insert into period_logs (user_id, start_date, end_date)
  select uid, d, d + 4 from unnest(array[
    '2025-10-01', '2025-11-10', '2025-12-20', '2026-01-17', '2026-02-14',
    '2026-03-14', '2026-04-11', '2026-05-09', '2026-06-06']::date[]) d;
  s := cycle_status(uid, '2026-06-20');
  assert (s->>'cycles_used')::int = 6 and (s->>'avg_cycle')::int = 28, 'AC-8 ' || s::text;

  -- AC-11: 24, 28, 33 -> chưa đều; 26, 28, 30 -> đều
  delete from period_logs where user_id = uid;
  insert into period_logs (user_id, start_date, end_date) values
    (uid, '2026-01-01', '2026-01-05'), (uid, '2026-01-25', '2026-01-29'),
    (uid, '2026-02-22', '2026-02-26'), (uid, '2026-03-27', '2026-03-31');
  assert (cycle_status(uid, '2026-04-05')->>'irregular')::boolean, 'AC-11 irregular';
  delete from period_logs where user_id = uid;
  insert into period_logs (user_id, start_date, end_date) values
    (uid, '2026-01-01', '2026-01-05'), (uid, '2026-01-27', '2026-01-31'),
    (uid, '2026-02-24', '2026-02-28'), (uid, '2026-03-26', '2026-03-30');
  assert not (cycle_status(uid, '2026-04-05')->>'irregular')::boolean, 'AC-11 regular';

  -- AC-25: kỳ mở > 10 ngày tính 5 ngày, bản ghi gốc vẫn end trống
  delete from period_logs where user_id = uid;
  insert into period_logs (user_id, start_date) values (uid, t - 17);
  s := cycle_status(uid, t);
  assert s->'periods'->0->>'end_date' is null
     and (s->'periods'->0->>'effective_end')::date = t - 13, 'AC-25';

  -- AC-28: quên ghi kết thúc vẫn ghi được kỳ mới (tự đóng kỳ cũ, ước tính)
  r := cycle_log_start(t);
  assert (r->>'auto_closed_end')::date = t - 13, 'AC-28 auto_closed_end ' || r::text;
  assert (select count(*) from period_logs where user_id = uid) = 2, 'AC-28 count';
  assert (select count(*) from period_logs where user_id = uid and end_date is null) = 1, 'AC-28 open';
  assert (select is_estimated from period_logs where user_id = uid and start_date = t - 17), 'AC-28 estimated';
  s := cycle_status(uid, t);
  assert s->>'status' = 'in_period' and (s->>'period_day')::int = 1, 'AC-2 in_period day 1';

  -- AC-3: kỳ đang mở còn mới -> chặn kỳ thứ 2
  ok := false;
  begin
    insert into period_logs (user_id, start_date) values (uid, t);
  exception when others then ok := sqlerrm like '%CYCLE_OPEN%' or sqlerrm like '%CYCLE_OVERLAP%';
  end;
  assert ok, 'AC-3';

  -- AC-4: chặn ngày tương lai
  ok := false;
  begin
    update period_logs set end_date = t + 2 where user_id = uid and end_date is null;
  exception when others then ok := sqlerrm like '%CYCLE_FUTURE%';
  end;
  assert ok, 'AC-4';

  -- AC-5(c): kỳ > 15 ngày bị chặn
  ok := false;
  begin
    update period_logs set end_date = start_date + 15 where user_id = uid and start_date = t - 17;
  exception when others then ok := sqlerrm like '%period_logs_range%';
  end;
  assert ok, 'AC-5c';

  -- AC-29: sửa gây chồng lấn bị chặn
  ok := false;
  begin
    update period_logs set end_date = t where user_id = uid and start_date = t - 17;
  exception when others then ok := sqlerrm like '%CYCLE_OVERLAP%' or sqlerrm like '%period_logs_range%';
  end;
  assert ok, 'AC-29';

  -- AC-22: tắt theo dõi -> status not_tracking, dữ liệu giữ nguyên
  update cycle_settings set is_tracking = false where user_id = uid;
  s := cycle_status(uid, t);
  assert s->>'status' = 'not_tracking' and jsonb_array_length(s->'periods') = 2, 'AC-22';

  -- AC-21: xoá hết -> no_data
  update cycle_settings set is_tracking = true where user_id = uid;
  delete from period_logs where user_id = uid;
  s := cycle_status(uid, t);
  assert s->>'status' = 'no_data' and s->>'next_start' is null, 'AC-21';

  raise notice 'ALL CYCLE TESTS PASSED';
end $$;

rollback;
select 'ALL CYCLE TESTS PASSED' as result;
