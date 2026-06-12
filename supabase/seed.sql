-- Souqna reference data: categories & governorates.
-- Ids/icons/names mirror src/data/categories.ts and src/data/governorates.ts.
-- Idempotent (upsert) — safe to re-run after schema changes.

insert into categories (id, icon, name_ar, name_ku, name_en, sort_order) values
  ('vehicles',    'car-sport',       'سيارات',        'ئۆتۆمبێل',       'Vehicles',           1),
  ('realestate',  'home',            'عقارات',        'خانووبەرە',      'Real estate',        2),
  ('mobiles',     'phone-portrait',  'موبايلات',      'مۆبایل',         'Mobiles',            3),
  ('electronics', 'laptop',          'إلكترونيات',    'ئەلیکترۆنیات',   'Electronics',        4),
  ('furniture',   'bed',             'أثاث',          'کەلوپەل',        'Furniture',          5),
  ('appliances',  'tv',              'أجهزة منزلية',  'ئامێری ماڵەوە',  'Home appliances',    6),
  ('food',        'restaurant',      'أكل بيتي',      'خواردنی ماڵەوە', 'Home-cooked food',    7),
  ('fashion',     'shirt',           'أزياء',         'جلوبەرگ',        'Fashion',            8),
  ('power',       'flash',           'مولدات وطاقة',  'مۆڵید و وزە',    'Generators & power', 9),
  ('services',    'construct',       'خدمات',         'خزمەتگوزاری',    'Services',           10),
  ('jobs',        'briefcase',       'وظائف',         'کار',            'Jobs',               11),
  ('other',       'pricetags',       'أخرى',          'هیتر',           'Other',              12)
on conflict (id) do update set
  icon = excluded.icon,
  name_ar = excluded.name_ar,
  name_ku = excluded.name_ku,
  name_en = excluded.name_en,
  sort_order = excluded.sort_order;

insert into governorates (id, name_ar, name_ku, name_en, sort_order) values
  ('baghdad',      'بغداد',       'بەغدا',       'Baghdad',      1),
  ('basra',        'البصرة',      'بەسرە',       'Basra',        2),
  ('nineveh',      'نينوى',       'نەینەوا',     'Nineveh',      3),
  ('erbil',        'أربيل',       'هەولێر',      'Erbil',        4),
  ('sulaymaniyah', 'السليمانية',  'سلێمانی',     'Sulaymaniyah', 5),
  ('duhok',        'دهوك',        'دهۆک',        'Duhok',        6),
  ('kirkuk',       'كركوك',       'کەرکووک',     'Kirkuk',       7),
  ('najaf',        'النجف',       'نەجەف',       'Najaf',        8),
  ('karbala',      'كربلاء',      'کەربەلا',     'Karbala',      9),
  ('babylon',      'بابل',        'بابل',        'Babylon',      10),
  ('wasit',        'واسط',        'واسیت',       'Wasit',        11),
  ('diyala',       'ديالى',       'دیالە',       'Diyala',       12),
  ('anbar',        'الأنبار',     'ئەنبار',      'Anbar',        13),
  ('saladin',      'صلاح الدين',  'سەلاحەدین',   'Saladin',      14),
  ('dhiqar',       'ذي قار',      'زیقار',       'Dhi Qar',      15),
  ('maysan',       'ميسان',       'مەیسان',      'Maysan',       16),
  ('muthanna',     'المثنى',      'موسەننا',     'Muthanna',     17),
  ('qadisiyah',    'القادسية',    'قادسیە',      'Qadisiyah',    18),
  ('halabja',      'حلبجة',       'هەڵەبجە',     'Halabja',      19)
on conflict (id) do update set
  name_ar = excluded.name_ar,
  name_ku = excluded.name_ku,
  name_en = excluded.name_en,
  sort_order = excluded.sort_order;
