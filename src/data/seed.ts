import type { ChatThread, Kitchen, Listing, SellerProfile } from '@/types';

export const DEMO_USER_ID = 'me';

function img(seed: string, count: number): string[] {
  return Array.from(
    { length: count },
    (_, i) => `https://picsum.photos/seed/souqna-${seed}-${i}/800/600`,
  );
}

const now = Date.now();
const mins = (m: number) => now - m * 60_000;
const hrs = (h: number) => now - h * 3_600_000;
const days = (d: number) => now - d * 86_400_000;

export const SELLERS: SellerProfile[] = [
  { id: 'me', name: 'أنت', phone: '+9647700000000', avatarColor: '#0E8F6E', joinedYear: 2026, ratingAvg: 0, ratingCount: 0, isPhoneVerified: true },
  { id: 's1', name: 'أحمد العبيدي', phone: '+9647701112233', avatarColor: '#2563EB', joinedYear: 2023, ratingAvg: 4.8, ratingCount: 41, isPhoneVerified: true },
  { id: 's2', name: 'مريم حسن', phone: '+9647705556677', avatarColor: '#DB2777', joinedYear: 2024, ratingAvg: 4.6, ratingCount: 23, isPhoneVerified: true },
  { id: 's3', name: 'كاروان رشید', phone: '+9647508889900', avatarColor: '#D97706', joinedYear: 2022, ratingAvg: 4.9, ratingCount: 88, isPhoneVerified: true },
  { id: 's4', name: 'علي الكناني', phone: '+9647802223344', avatarColor: '#7C3AED', joinedYear: 2025, ratingAvg: 4.2, ratingCount: 9, isPhoneVerified: false },
];

export const SEED_LISTINGS: Listing[] = [
  {
    id: 'l1',
    title: 'تويوتا كورولا 2019 وارد الخليج',
    description: 'سيارة بحالة ممتازة، ماشية 78 ألف كم، فحص كامل، صبغ وكالة. السعر قابل للتفاوض البسيط.',
    priceIqd: 18_500_000, negotiable: true, categoryId: 'vehicles', governorateId: 'baghdad',
    condition: 'used', images: img('corolla', 3), sellerId: 's1', createdAt: mins(35),
    attributes: { kind: 'vehicle', make: 'toyota', model: 'corolla', trim: 'XLI', year: 2019, mileageKm: 78_000, transmission: 'automatic', fuel: 'gasoline' },
  },
  {
    id: 'l2',
    title: 'آيفون 14 برو ماكس 256 غيغا',
    description: 'الجهاز نظيف جداً مع علبته والشاحن الأصلي، البطارية 92%. لا يوجد أي خدش.',
    priceIqd: 1_150_000, negotiable: false, categoryId: 'mobiles', governorateId: 'erbil',
    condition: 'used', images: img('iphone', 2), sellerId: 's3', createdAt: hrs(3),
  },
  {
    id: 'l3',
    title: 'شقة للإيجار 3 غرف نوم - حي الجزائر',
    description: 'شقة مفروشة بالكامل، طابق ثاني، قريبة من الخدمات والمولات. الإيجار شهري.',
    priceIqd: 750_000, negotiable: true, categoryId: 'realestate', governorateId: 'basra',
    condition: 'used', images: img('apartment', 3), sellerId: 's2', createdAt: hrs(7),
    attributes: { kind: 'property', dealType: 'rent', propertyType: 'apartment', bedrooms: 3, bathrooms: 2, areaM2: 140, furnished: true, currency: 'IQD', yearBuilt: 2016, utilities: { gridHoursPerDay: 8, generatorAmps: 5, generatorIncluded: true, water: 'municipal', internet: 'fiber', parkingSpaces: 1 }, amenities: ['ac', 'elevator', 'parking', 'kitchen'] },
  },
  {
    id: 'l4',
    title: 'كنبة (أريكة) 7 مقاعد لون بيج',
    description: 'مستعملة سنة واحدة بحالة جيدة جداً، قماش فاخر سهل التنظيف.',
    priceIqd: 350_000, negotiable: true, categoryId: 'furniture', governorateId: 'najaf',
    condition: 'used', images: img('sofa', 2), sellerId: 's4', createdAt: hrs(11),
  },
  {
    id: 'l5',
    title: 'مولدة كهرباء 5 كيلو ياباني',
    description: 'مولدة بنزين، اشتغال نظيف وهادئ، مناسبة للبيت. مع ضمان شهر.',
    priceIqd: 600_000, negotiable: false, categoryId: 'power', governorateId: 'baghdad',
    condition: 'used', images: img('generator', 1), sellerId: 's1', createdAt: days(1),
  },
  {
    id: 'l6',
    title: 'لابتوب Dell XPS 13 - i7 الجيل 11',
    description: 'رام 16، هارد SSD 512، الشاشة لمس. مثالي للبرمجة والتصميم.',
    priceIqd: 900_000, negotiable: true, categoryId: 'electronics', governorateId: 'sulaymaniyah',
    condition: 'used', images: img('laptop', 2), sellerId: 's3', createdAt: days(1),
  },
  {
    id: 'l7',
    title: 'ثلاجة LG انفرتر 18 قدم جديدة',
    description: 'بالكارتون لم تُفتح، موفرة للطاقة، مع ضمان الوكيل سنتين.',
    priceIqd: 800_000, negotiable: false, categoryId: 'appliances', governorateId: 'karbala',
    condition: 'new', images: img('fridge', 1), sellerId: 's2', createdAt: days(2),
  },
  {
    id: 'l8',
    title: 'بلايستيشن 5 مع يدتين و3 ألعاب',
    description: 'النسخة الأصلية، استعمال خفيف، يعمل بكامل طاقته. الألعاب: FIFA، GTA V، Spider-Man.',
    priceIqd: 650_000, negotiable: true, categoryId: 'electronics', governorateId: 'baghdad',
    condition: 'used', images: img('ps5', 2), sellerId: 's4', createdAt: days(2),
  },
  {
    id: 'l9',
    title: 'دراجة هوائية جبلية مقاس 29',
    description: '21 سرعة، فيتيس شيمانو، حالة ممتازة. مناسبة للكبار.',
    priceIqd: 175_000, negotiable: true, categoryId: 'other', governorateId: 'kirkuk',
    condition: 'used', images: img('bike', 1), sellerId: 's1', createdAt: days(3),
  },
  {
    id: 'l10',
    title: 'خدمة تركيب وصيانة كاميرات المراقبة',
    description: 'تركيب أنظمة كاميرات للمنازل والمحلات مع المتابعة عبر الموبايل. كشف مجاني داخل بغداد.',
    priceIqd: 0, negotiable: false, categoryId: 'services', governorateId: 'baghdad',
    condition: 'new', images: img('cctv', 1), sellerId: 's3', createdAt: days(4),
  },
  {
    id: 'l11',
    title: 'سامسونج Galaxy S23 جديد',
    description: 'جهاز جديد مكفول، 256 غيغا، اللون أسود. السعر نهائي.',
    priceIqd: 1_050_000, negotiable: false, categoryId: 'mobiles', governorateId: 'basra',
    condition: 'new', images: img('galaxy', 2), sellerId: 's2', createdAt: days(5),
  },
  {
    id: 'l12',
    title: 'أرض سكنية 200م تسوية كاملة',
    description: 'قطعة أرض في موقع مميز قرب الشارع العام، سند طابو صرف. تصلح للبناء فوراً.',
    priceIqd: 45_000_000, negotiable: true, categoryId: 'realestate', governorateId: 'anbar',
    condition: 'used', images: img('land', 2), sellerId: 's1', createdAt: days(6),
    attributes: { kind: 'property', dealType: 'sale', propertyType: 'land', areaM2: 200 },
  },
  {
    id: 'l13',
    title: 'دار للبيع 150م في زيونة - ركن',
    description: 'دار طابقين، 4 غرف نوم، 3 صحيات، مطبخ حديث. قريبة من شارع الربيعي. طابو صرف.',
    priceIqd: 650_000_000, negotiable: true, categoryId: 'realestate', governorateId: 'baghdad',
    condition: 'used', images: img('house', 4), sellerId: 's3', createdAt: hrs(2),
    attributes: { kind: 'property', dealType: 'sale', propertyType: 'house', bedrooms: 4, bathrooms: 3, areaM2: 150, furnished: false, currency: 'USD', priceUsd: 445_000, yearBuilt: 2015, utilities: { gridHoursPerDay: 12, generatorAmps: 10, water: 'mixed', waterFiltered: true, internet: 'fiber', parkingSpaces: 2 }, amenities: ['garden', 'roof', 'storage', 'solar', 'kitchen'] },
  },
  {
    id: 'l14',
    title: 'كيا سبورتاج 2021 فول مواصفات',
    description: 'ماشية 42 ألف، بصمة وفتحة سقف وشاشة كبيرة. فحص أمامي كامل، بدون حوادث.',
    priceIqd: 32_000_000, negotiable: true, categoryId: 'vehicles', governorateId: 'erbil',
    condition: 'used', images: img('sportage', 3), sellerId: 's4', createdAt: hrs(5),
    attributes: { kind: 'vehicle', make: 'kia', model: 'sportage', year: 2021, mileageKm: 42_000, transmission: 'automatic', fuel: 'gasoline' },
  },
  {
    id: 'l15',
    title: 'شقة للبيع 120م في عنكاوا مجمع مسوّر',
    description: 'شقة طابق خامس مع مصعد وكراج، إطلالة جميلة، مجمع فيه حراسة وخدمات كاملة.',
    priceIqd: 180_000_000, negotiable: false, categoryId: 'realestate', governorateId: 'erbil',
    condition: 'new', images: img('ankawa', 3), sellerId: 's2', createdAt: days(1),
    attributes: { kind: 'property', dealType: 'sale', propertyType: 'apartment', bedrooms: 2, bathrooms: 2, areaM2: 120, furnished: false, currency: 'USD', priceUsd: 123_000, yearBuilt: 2021, utilities: { gridHoursPerDay: 20, generatorAmps: 15, water: 'municipal', internet: 'fiber', securityGuard: true, cctv: true, gated: true, parkingSpaces: 1 }, amenities: ['elevator', 'parking', 'pool', 'ac', 'balcony'] },
  },
  {
    id: 'l16',
    title: 'نيسان صني 2017 اقتصادية',
    description: 'سيارة عائلية اقتصادية جداً بالبنزين، جير عادي، ماشية 120 ألف. سعر مناسب.',
    priceIqd: 11_000_000, negotiable: true, categoryId: 'vehicles', governorateId: 'basra',
    condition: 'used', images: img('sunny', 2), sellerId: 's1', createdAt: days(2),
    attributes: { kind: 'vehicle', make: 'nissan', model: 'sunny', year: 2017, mileageKm: 120_000, transmission: 'manual', fuel: 'gasoline' },
  },
  {
    id: 'l17',
    title: 'تويوتا كورولا 2021 SE فل',
    description: 'كورولا فئة SE، ماشية 30 ألف فقط، حالة الوكالة، صبغ كامل أصلي. أقساط متاحة.',
    priceIqd: 24_000_000, negotiable: true, categoryId: 'vehicles', governorateId: 'baghdad',
    condition: 'used', images: img('corolla2', 3), sellerId: 's3', createdAt: hrs(9),
    attributes: { kind: 'vehicle', make: 'toyota', model: 'corolla', trim: 'SE', year: 2021, mileageKm: 30_000, transmission: 'automatic', fuel: 'gasoline' },
  },
  {
    id: 'l18',
    title: 'دولمة عراقية بالطريقة البغدادية',
    description: 'دولمة بيتية لذيذة، ورق عنب ويخضار محشية بالتمن واللحم. تكفي 4-5 أشخاص. تحتاج طلب قبل يوم.',
    priceIqd: 25_000, negotiable: false, categoryId: 'food', governorateId: 'baghdad',
    condition: 'new', images: img('dolma', 2), sellerId: 's2', createdAt: mins(50),
    attributes: { kind: 'food', cuisine: 'iraqi', dishType: 'main', servings: 5, leadTimeHours: 24, fulfillment: 'both' },
  },
  {
    id: 'l19',
    title: 'كليجة عيد بحشوة التمر والجوز',
    description: 'كليجة بيتية طازة بالتمر والجوز وجوز الهند. علبة نص كيلو. تنفع للعيد والضيوف.',
    priceIqd: 12_000, negotiable: false, categoryId: 'food', governorateId: 'basra',
    condition: 'new', images: img('kleicha', 2), sellerId: 's4', createdAt: hrs(2),
    attributes: { kind: 'food', cuisine: 'sweets', dishType: 'dessert', servings: 8, leadTimeHours: 48, fulfillment: 'delivery' },
  },
  {
    id: 'l20',
    title: 'برياني دجاج هندي حار',
    description: 'برياني دجاج بالبهارات الهندية الأصلية وزعفران. وجبة فردية كاملة مع الرز والصوص.',
    priceIqd: 8_000, negotiable: false, categoryId: 'food', governorateId: 'erbil',
    condition: 'new', images: img('biryani', 1), sellerId: 's3', createdAt: hrs(4),
    attributes: { kind: 'food', cuisine: 'indian', dishType: 'rice', diet: ['spicy'], servings: 1, leadTimeHours: 3, fulfillment: 'both' },
  },
  {
    id: 'l21',
    title: 'سلطة فتوش طازة - نباتي',
    description: 'فتوش بالخضار الطازة وخبز محمص ودبس رمان. تكفي شخصين. تنعمل يومياً طلب صباحي.',
    priceIqd: 5_000, negotiable: false, categoryId: 'food', governorateId: 'baghdad',
    condition: 'new', images: img('fattoush', 1), sellerId: 's2', createdAt: hrs(6),
    attributes: { kind: 'food', cuisine: 'levantine', dishType: 'salad', diet: ['vegetarian', 'vegan'], servings: 2, leadTimeHours: 4, fulfillment: 'pickup' },
  },
  {
    id: 'l22',
    title: 'بقلاوة شامية بالفستق الحلبي',
    description: 'بقلاوة بيتية بطبقات رقيقة وفستق حلبي وقطر. علبة كيلو، مثالية للمناسبات.',
    priceIqd: 35_000, negotiable: true, categoryId: 'food', governorateId: 'najaf',
    condition: 'new', images: img('baklava', 2), sellerId: 's1', createdAt: days(1),
    attributes: { kind: 'food', cuisine: 'levantine', dishType: 'dessert', servings: 10, leadTimeHours: 24, fulfillment: 'both' },
  },
];

export const SEED_KITCHENS: Kitchen[] = [
  {
    id: 'k1',
    ownerId: 's2',
    name: 'مطبخ أم أحمد',
    bio: 'أكل بيتي عراقي أصيل، نطبخ بالطريقة البغدادية القديمة. دولمة، تبسي، كبة، ومحاشي حسب الطلب. النظافة والجودة أولاً.',
    coverUrl: img('kitchen-um-ahmad', 1)[0],
    cuisines: ['iraqi', 'levantine'],
    governorateId: 'baghdad',
    createdAt: days(40),
  },
  {
    id: 'k2',
    ownerId: 's1',
    name: 'حلويات بيت الشام',
    bio: 'حلويات شرقية بيتية بأيدي خبيرة: بقلاوة، كليجة، وكنافة بالفستق الحلبي. طلبات المناسبات والأعراس متوفرة.',
    coverUrl: img('kitchen-sham', 1)[0],
    cuisines: ['sweets', 'levantine'],
    governorateId: 'najaf',
    createdAt: days(70),
  },
];

export const SEED_THREADS: ChatThread[] = [
  { id: 't1', listingId: 'l1', withSellerId: 's1', lastMessage: 'تمام، نلتقي بكرة الساعة 5 العصر؟', lastAt: mins(20), unread: 2 },
  { id: 't2', listingId: 'l6', withSellerId: 's3', lastMessage: 'آخر سعر شكد بالضبط؟', lastAt: hrs(5), unread: 0 },
];
