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
}

export interface ChatThread {
  id: string;
  listingId: string;
  withSellerId: string;
  lastMessage: string;
  lastAt: number;
  unread: number;
}
