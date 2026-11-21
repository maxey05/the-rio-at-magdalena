-- The Rio At Magdalena: starter data (RFC-004). Run AFTER schema.sql.
--
-- Safe to re-run:
--   * camps and the settings row are only inserted if missing, so edits made
--     later in the admin screens are never overwritten;
--   * slots are matched on (camp, code); re-running refreshes ONLY sort,
--     map_x and map_y from this file and leaves description/active alone.
--
-- Camps 3 and 4 are closed (D-016): seeded inactive, shown as "Coming soon".
-- Slot codes are exactly the letters on the owner's aerial photos (D-017).

insert into camps (name, description, sort, active) values
  ('Camp 1', 'Along the top of the riverbank cliff. Two restrooms (CR) near slots I and B/C and two sets of stairs down to the river, one near A.', 1, true),
  ('Camp 2', 'Lower camp beside the river, with two sets of stairs up the slope. No restroom marked yet.', 2, true),
  ('Camp 3', '', 3, false),
  ('Camp 4', '', 4, false)
on conflict (name) do nothing;

-- map_x / map_y are ESTIMATES, read by eye from the two aerial photos in
-- hidden/reference/ (percent of the photo width / height, pin on the middle of
-- each letter). They are meant to be fine-tuned once the camp map is on screen
-- (RFC-006): edit the numbers below and re-run this file.
insert into slots (camp_id, code, description, sort, map_x, map_y)
select c.id, v.code, v.description, v.sort, v.map_x, v.map_y
from (values
  ('Camp 1', 'A',  'Cliff edge, next to the stairs',          1, 91.48, 36.72),
  ('Camp 1', 'B',  'Cliff edge, near a restroom',             2, 80.37, 40.61),
  ('Camp 1', 'C',  'Cliff edge, near a restroom',             3, 70.56, 46.08),
  ('Camp 1', 'D',  'Cliff edge',                              4, 59.72, 50.51),
  ('Camp 1', 'E',  'Cliff edge',                              5, 50.46, 58.36),
  ('Camp 1', 'F',  'Cliff edge',                              6, 38.70, 65.19),
  ('Camp 1', 'G',  'Cliff edge',                              7, 27.04, 72.49),
  ('Camp 1', 'H',  'Inland, under the trees',                 8, 33.52, 39.93),
  ('Camp 1', 'I',  'Inland, under the trees, near a restroom', 9, 48.80, 41.64),
  ('Camp 2', 'J',  'By the water',                            1, 41.75, 49.82),
  ('Camp 2', 'K',  'By the water',                            2, 47.75, 60.18),
  ('Camp 2', 'L1', 'Far side of the camp',                    3, 84.50, 64.09),
  ('Camp 2', 'L2', 'Far side of the camp',                    4, 91.25, 89.55),
  ('Camp 2', 'M',  'Under the trees at the back',             5, 67.90, 45.91),
  ('Camp 2', 'N',  'Under the trees at the back',             6, 80.10, 42.00),
  ('Camp 2', 'O',  'Under the trees at the back',             7, 88.10, 40.45)
) as v(camp, code, description, sort, map_x, map_y)
join camps c on c.name = v.camp
on conflict (camp_id, code) do update
  set sort = excluded.sort,
      map_x = excluded.map_x,
      map_y = excluded.map_y;

-- The one settings row, with the rates from D-020..D-023 and the limits from
-- D-011, D-012, D-030, D-032, D-040, D-043. Admins edit these later (D-025).
insert into settings (
  id,
  overnight_adult, overnight_reduced, day_adult, day_reduced,
  tent_price, tent_stock, slot_capacity, site_cap,
  window_days, max_nights, hold_minutes, downpayment_pct
) values (
  true,
  500, 350, 300, 200,
  500, 5, 10, 100,
  90, 30, 30, 50
)
on conflict (id) do nothing;
