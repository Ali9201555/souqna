export type Language = 'ar' | 'ku' | 'en';

/** A string translated into each supported language. */
export type LocalizedText = Record<Language, string>;

export interface Category {
  id: string;
  /** Ionicons glyph name. */
  icon: string;
  name: LocalizedText;
}

export interface Governorate {
  id: string;
  name: LocalizedText;
}

export type ListingCondition = 'new' | 'used';
export type ReportReason = 'scam' | 'prohibited' | 'duplicate' | 'sold' | 'offensive' | 'other';

export interface SellerProfile {
  id: string;
  name: string;
  /** E.164-style phone, e.g. +9647701234567. */
  phone: string;
  /** Background color for the placeholder avatar. */
  avatarColor: string;
  joinedYear: number;
  ratingAvg: number;
  ratingCount: number;
  isPhoneVerified: boolean;
}

export type Transmission = 'automatic' | 'manual';
export type FuelType = 'gasoline' | 'diesel' | 'hybrid' | 'electric' | 'lpg';

/** Structured facts for the Cars section. All numeric values are JSON numbers. */
export interface VehicleAttributes {
  kind: 'vehicle';
  /** Make id from VEHICLE_MAKES (e.g. 'toyota'), or 'other'. */
  make?: string;
  /** Model id within the make (from VEHICLE_MAKES), or free text when unlisted. */
  model?: string;
  /** Free-text trim/grade, e.g. "XLI", "Limited", "AMG". */
  trim?: string;
  year?: number;
  mileageKm?: number;
  transmission?: Transmission;
  fuel?: FuelType;
}

export type DealType = 'sale' | 'rent';
export type PropertyType = 'house' | 'apartment' | 'land' | 'commercial' | 'villa' | 'farm';
export type Currency = 'IQD' | 'USD';
export type WaterSource = 'municipal' | 'well' | 'tanker' | 'mixed';
export type InternetKind = 'fiber' | 'wireless' | 'mobile' | 'none';

/**
 * Iraq-specific utilities — the headline differentiator. Power is the first
 * thing every Iraqi renter/buyer asks about: national-grid hours vs the
 * neighborhood generator sold by amps (أمبير).
 */
export interface PropertyUtilities {
  /** National-grid electricity hours per day (0–24). */
  gridHoursPerDay?: number;
  /** Neighborhood generator amps available (أمبير). */
  generatorAmps?: number;
  generatorIncluded?: boolean;
  water?: WaterSource;
  waterFiltered?: boolean;
  internet?: InternetKind;
  securityGuard?: boolean;
  cctv?: boolean;
  gated?: boolean;
  parkingSpaces?: number;
}

/** Structured facts for the Real-estate section. `rent` prices are monthly. */
export interface PropertyAttributes {
  kind: 'property';
  dealType: DealType;
  propertyType?: PropertyType;
  bedrooms?: number;
  bathrooms?: number;
  /** Plot/built area in square meters. */
  areaM2?: number;
  furnished?: boolean;
  // ── v2 additions (all optional → existing listings stay valid) ──
  /** The currency the owner quotes in. `priceIqd` stays the canonical spine. */
  currency?: Currency;
  /** USD figure when quoted in dollars (common for sales); priceIqd is the converted spine. */
  priceUsd?: number;
  /** District/neighborhood id from locations.ts. */
  districtId?: string;
  yearBuilt?: number;
  /** Amenity ids from AMENITIES. */
  amenities?: string[];
  utilities?: PropertyUtilities;
}

export type Fulfillment = 'pickup' | 'delivery' | 'both';

/** Structured facts for the home-cooked Food section. `priceIqd` is per portion. */
export interface FoodAttributes {
  kind: 'food';
  /** Cuisine id from CUISINES (e.g. 'iraqi'). */
  cuisine?: string;
  /** Dish-type id from DISH_TYPES (e.g. 'main'). */
  dishType?: string;
  /** Dietary tag ids from DIET_TAGS (e.g. ['vegetarian']). */
  diet?: string[];
  /** Portions the price covers. */
  servings?: number;
  /** Hours of notice the cook needs before pickup/delivery. */
  leadTimeHours?: number;
  fulfillment?: Fulfillment;
}

export type ListingAttributes = VehicleAttributes | PropertyAttributes | FoodAttributes;

export interface Listing {
  id: string;
  title: string;
  description: string;
  /** Price in Iraqi Dinar. 0 means "contact for price". */
  priceIqd: number;
  negotiable: boolean;
  categoryId: string;
  governorateId: string;
  condition: ListingCondition;
  /** Remote image URLs. */
  images: string[];
  sellerId: string;
  /** Epoch milliseconds. */
  createdAt: number;
  /** Category-specific structured facts (vehicles / realestate). */
  attributes?: ListingAttributes;
}

export interface ListingReport {
  id: string;
  listingId: string;
  reporterId: string;
  reason: ReportReason;
  details?: string;
  status: 'open' | 'reviewed' | 'dismissed';
  /** Epoch milliseconds. */
  createdAt: number;
}

/** A home-cook storefront (one per user). Dishes are the owner's food listings. */
export interface Kitchen {
  id: string;
  ownerId: string;
  name: string;
  bio: string;
  /** Cover image URL. */
  coverUrl?: string;
  /** Cuisine ids from CUISINES. */
  cuisines: string[];
  governorateId?: string;
  /** Epoch milliseconds. */
  createdAt: number;
}

export interface ChatThread {
  id: string;
  listingId: string;
  /** The OTHER participant's profile id (seller when I'm the buyer, and vice-versa). */
  withSellerId: string;
  lastMessage: string;
  /** Epoch milliseconds. */
  lastAt: number;
  unread: number;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  /** Epoch milliseconds. */
  createdAt: number;
}
