import type {
  CategoryGroupType,
  BusinessModel,
  CreateCategoryGroupRequest,
  CreateCategoryRequest,
  CreateSubcategoryRequest,
} from '@/lib/types';

// ─── Category Groups ───────────────────────────────────────

export interface SeedCategoryGroup extends CreateCategoryGroupRequest {
  _seedKey: string;
}

export const SEED_CATEGORY_GROUPS: SeedCategoryGroup[] = [
  {
    _seedKey: 'top-tiles',
    name: 'Top Tiles',
    slug: 'top-tiles',
    type: 'TOP_TILES' as CategoryGroupType,
    displayOrder: 1,
    description: 'Featured categories shown as tiles on home screen',
  },
  {
    _seedKey: 'more',
    name: 'More',
    slug: 'more',
    type: 'MORE' as CategoryGroupType,
    displayOrder: 2,
    description: 'Additional categories shown in "More" section',
  },
];

// ─── Categories ────────────────────────────────────────────

export interface SeedCategory extends Omit<CreateCategoryRequest, 'defaultGroupId'> {
  _seedKey: string;
  _groupSeedKey: string;
}

export const SEED_CATEGORIES: SeedCategory[] = [
  {
    _seedKey: 'concierge-services',
    _groupSeedKey: 'top-tiles',
    name: 'Concierge Services',
    slug: 'concierge-services',
    description: 'Your wish is our command. From airport pickups to personal assistants, get the VIP treatment from the moment you arrive.',
    iconKey: 'concierge',
    defaultGroupType: 'TOP_TILES' as CategoryGroupType,
    displayOrder: 1,
    isService: true,
  },
  {
    _seedKey: 'restaurants',
    _groupSeedKey: 'top-tiles',
    name: 'Restaurants',
    slug: 'restaurants',
    description: 'Taste cities like never before. Hidden gems, authentic suya spots, fine dining, and everything in between — curated for your palate.',
    iconKey: 'restaurant',
    defaultGroupType: 'TOP_TILES' as CategoryGroupType,
    displayOrder: 2,
  },
  {
    _seedKey: 'nightlife',
    _groupSeedKey: 'top-tiles',
    name: 'Nightlife',
    slug: 'nightlife',
    description: 'Where the city comes alive. Rooftop lounges, underground clubs, beach bars — find your scene and own the night.',
    iconKey: 'nightlife',
    defaultGroupType: 'TOP_TILES' as CategoryGroupType,
    displayOrder: 3,
  },
  {
    _seedKey: 'health-wellness',
    _groupSeedKey: 'top-tiles',
    name: 'Health & Wellness',
    slug: 'health-wellness',
    description: 'Glow up, inside and out. Spas that melt stress away, gyms to push your limits, salons that know your worth.',
    iconKey: 'health',
    defaultGroupType: 'TOP_TILES' as CategoryGroupType,
    displayOrder: 4,
    isService: true,
  },
  {
    _seedKey: 'home-services',
    _groupSeedKey: 'top-tiles',
    name: 'Home Services',
    slug: 'home-services',
    description: 'Your home, handled. Trusted cleaners, reliable electricians, expert plumbers — all vetted, all one tap away.',
    iconKey: 'home',
    defaultGroupType: 'TOP_TILES' as CategoryGroupType,
    displayOrder: 5,
    isService: true,
  },
  {
    _seedKey: 'shopping',
    _groupSeedKey: 'more',
    name: 'Shopping',
    slug: 'shopping',
    description: 'Discover. Desire. Deliver. Boutique fashion, local artisan finds, groceries, and pharmacy essentials — delivered to your door.',
    iconKey: 'shopping',
    defaultGroupType: 'MORE' as CategoryGroupType,
    displayOrder: 6,
    isShopping: true,
  },
  {
    _seedKey: 'local-services',
    _groupSeedKey: 'more',
    name: 'Local Services',
    slug: 'local-services',
    description: 'Get it done, the easy way. From tailoring to car washes, the everyday services you need — with quality you can count on.',
    iconKey: 'local',
    defaultGroupType: 'MORE' as CategoryGroupType,
    displayOrder: 7,
    isService: true,
  },
  {
    _seedKey: 'professional-services',
    _groupSeedKey: 'more',
    name: 'Professional Services',
    slug: 'professional-services',
    description: 'Expertise on demand. Legal advice, financial planning, consulting — top professionals ready when you are.',
    iconKey: 'professional',
    defaultGroupType: 'MORE' as CategoryGroupType,
    displayOrder: 8,
    isService: true,
  },
  {
    _seedKey: 'arts-entertainment',
    _groupSeedKey: 'more',
    name: 'Arts & Entertainment',
    slug: 'arts-entertainment',
    description: 'Culture. Concerts. Unforgettable moments. Galleries, live shows, festivals — experience the city\'s creative soul.',
    iconKey: 'arts',
    defaultGroupType: 'MORE' as CategoryGroupType,
    displayOrder: 9,
  },
  {
    _seedKey: 'hotels-travel',
    _groupSeedKey: 'more',
    name: 'Hotels & Travel',
    slug: 'hotels-travel',
    description: 'Stay somewhere extraordinary. Hotels, shortlets, and stays that feel like home — or better.',
    iconKey: 'hotel',
    defaultGroupType: 'MORE' as CategoryGroupType,
    displayOrder: 10,
  },
];

// ─── Subcategories ─────────────────────────────────────────

export interface SeedSubcategory extends Omit<CreateSubcategoryRequest, 'categoryId' | 'templateId'> {
  _categorySeedKey: string;
  _templatePresetId?: string;
}

export const SEED_SUBCATEGORIES: SeedSubcategory[] = [
  // Concierge Services — all BOOKING_VISIT
  { _categorySeedKey: 'concierge-services', _templatePresetId: 'concierge', name: 'Airport Pickup', slug: 'airport-pickup', businessModel: 'BOOKING_VISIT' as BusinessModel, displayOrder: 1, riskTier: 'MEDIUM' },
  { _categorySeedKey: 'concierge-services', _templatePresetId: 'concierge', name: 'Private Security', slug: 'private-security', businessModel: 'BOOKING_VISIT' as BusinessModel, displayOrder: 2, riskTier: 'HIGH' },
  { _categorySeedKey: 'concierge-services', _templatePresetId: 'concierge', name: 'Personal Assistant', slug: 'personal-assistant', businessModel: 'BOOKING_VISIT' as BusinessModel, displayOrder: 3, riskTier: 'LOW' },

  // Restaurants — mixed
  { _categorySeedKey: 'restaurants', _templatePresetId: 'restaurant', name: 'Takeout & Fast Food', slug: 'takeout-fast-food', businessModel: 'ORDER_DELIVERY' as BusinessModel, displayOrder: 1, riskTier: 'LOW' },
  { _categorySeedKey: 'restaurants', _templatePresetId: 'restaurant', name: 'Casual Dining', slug: 'casual-dining', businessModel: 'VISIT_ONLY' as BusinessModel, displayOrder: 2, riskTier: 'LOW' },
  { _categorySeedKey: 'restaurants', _templatePresetId: 'restaurant', name: 'Fine Dining', slug: 'fine-dining', businessModel: 'BOOKING_VISIT' as BusinessModel, displayOrder: 3, riskTier: 'LOW' },

  // Nightlife — mostly VISIT_ONLY
  { _categorySeedKey: 'nightlife', _templatePresetId: 'nightlife', name: 'Clubs & Lounges', slug: 'clubs-lounges', businessModel: 'VISIT_ONLY' as BusinessModel, displayOrder: 1, riskTier: 'MEDIUM' },
  { _categorySeedKey: 'nightlife', _templatePresetId: 'nightlife', name: 'Beach Bars', slug: 'beach-bars', businessModel: 'VISIT_ONLY' as BusinessModel, displayOrder: 2, riskTier: 'MEDIUM' },
  { _categorySeedKey: 'nightlife', _templatePresetId: 'nightlife', name: 'Live Music Venues', slug: 'live-music-venues', businessModel: 'BOOKING_VISIT' as BusinessModel, displayOrder: 3, riskTier: 'MEDIUM' },

  // Health & Wellness — mixed
  { _categorySeedKey: 'health-wellness', _templatePresetId: 'salon', name: 'Hair Salon', slug: 'hair-salon', businessModel: 'VISIT_ONLY' as BusinessModel, displayOrder: 1, riskTier: 'LOW' },
  { _categorySeedKey: 'health-wellness', _templatePresetId: 'spa_wellness', name: 'Spa & Massage', slug: 'spa-massage', businessModel: 'BOOKING_VISIT' as BusinessModel, displayOrder: 2, riskTier: 'LOW' },
  { _categorySeedKey: 'health-wellness', _templatePresetId: 'gym', name: 'Gym & Fitness', slug: 'gym-fitness', businessModel: 'VISIT_ONLY' as BusinessModel, displayOrder: 3, riskTier: 'LOW' },

  // Home Services — all BOOKING_VISIT
  { _categorySeedKey: 'home-services', _templatePresetId: 'home_services', name: 'Cleaning', slug: 'cleaning', businessModel: 'BOOKING_VISIT' as BusinessModel, displayOrder: 1, riskTier: 'LOW' },
  { _categorySeedKey: 'home-services', _templatePresetId: 'home_services', name: 'Plumbing', slug: 'plumbing', businessModel: 'BOOKING_VISIT' as BusinessModel, displayOrder: 2, riskTier: 'MEDIUM' },
  { _categorySeedKey: 'home-services', _templatePresetId: 'home_services', name: 'Electrical', slug: 'electrical', businessModel: 'BOOKING_VISIT' as BusinessModel, displayOrder: 3, riskTier: 'HIGH' },

  // Shopping — all ORDER_DELIVERY
  { _categorySeedKey: 'shopping', _templatePresetId: 'shopping', name: 'Supermarket / Groceries', slug: 'supermarket-groceries', businessModel: 'ORDER_DELIVERY' as BusinessModel, displayOrder: 1, riskTier: 'LOW' },
  { _categorySeedKey: 'shopping', _templatePresetId: 'shopping', name: 'Pharmacy', slug: 'pharmacy', businessModel: 'ORDER_DELIVERY' as BusinessModel, displayOrder: 2, riskTier: 'HIGH' },
  { _categorySeedKey: 'shopping', _templatePresetId: 'shopping', name: 'Fashion & Boutique', slug: 'fashion-boutique', businessModel: 'ORDER_DELIVERY' as BusinessModel, displayOrder: 3, riskTier: 'LOW' },

  // Local Services — mixed
  { _categorySeedKey: 'local-services', _templatePresetId: 'salon', name: 'Tailoring', slug: 'tailoring', businessModel: 'VISIT_ONLY' as BusinessModel, displayOrder: 1, riskTier: 'LOW' },
  { _categorySeedKey: 'local-services', _templatePresetId: 'home_services', name: 'Laundry & Dry Cleaning', slug: 'laundry-dry-cleaning', businessModel: 'ORDER_DELIVERY' as BusinessModel, displayOrder: 2, riskTier: 'LOW' },
  { _categorySeedKey: 'local-services', _templatePresetId: 'car_services', name: 'Car Wash', slug: 'car-wash', businessModel: 'VISIT_ONLY' as BusinessModel, displayOrder: 3, riskTier: 'LOW' },
  { _categorySeedKey: 'local-services', _templatePresetId: 'home_services', name: 'Repairs', slug: 'repairs', businessModel: 'BOOKING_VISIT' as BusinessModel, displayOrder: 4, riskTier: 'MEDIUM' },

  // Professional Services — all BOOKING_VISIT
  { _categorySeedKey: 'professional-services', _templatePresetId: 'professional', name: 'Legal', slug: 'legal', businessModel: 'BOOKING_VISIT' as BusinessModel, displayOrder: 1, riskTier: 'LOW' },
  { _categorySeedKey: 'professional-services', _templatePresetId: 'professional', name: 'Financial & Accounting', slug: 'financial-accounting', businessModel: 'BOOKING_VISIT' as BusinessModel, displayOrder: 2, riskTier: 'LOW' },
  { _categorySeedKey: 'professional-services', _templatePresetId: 'professional', name: 'Consulting', slug: 'consulting', businessModel: 'BOOKING_VISIT' as BusinessModel, displayOrder: 3, riskTier: 'LOW' },

  // Arts & Entertainment — mixed
  { _categorySeedKey: 'arts-entertainment', _templatePresetId: 'arts_entertainment', name: 'Galleries & Museums', slug: 'galleries-museums', businessModel: 'VISIT_ONLY' as BusinessModel, displayOrder: 1, riskTier: 'LOW' },
  { _categorySeedKey: 'arts-entertainment', _templatePresetId: 'nightlife', name: 'Live Shows & Concerts', slug: 'live-shows-concerts', businessModel: 'BOOKING_VISIT' as BusinessModel, displayOrder: 2, riskTier: 'MEDIUM' },
  { _categorySeedKey: 'arts-entertainment', _templatePresetId: 'arts_entertainment', name: 'Festivals & Events', slug: 'festivals-events', businessModel: 'BOOKING_VISIT' as BusinessModel, displayOrder: 3, riskTier: 'MEDIUM' },

  // Hotels & Travel — all BOOKING_VISIT
  { _categorySeedKey: 'hotels-travel', _templatePresetId: 'hotel', name: 'Hotels', slug: 'hotels', businessModel: 'BOOKING_VISIT' as BusinessModel, displayOrder: 1, riskTier: 'LOW' },
  { _categorySeedKey: 'hotels-travel', _templatePresetId: 'hotel', name: 'Shortlets', slug: 'shortlets', businessModel: 'BOOKING_VISIT' as BusinessModel, displayOrder: 2, riskTier: 'MEDIUM' },
];

// ─── Template-to-Subcategory Mapping ───────────────────────

export const TEMPLATE_SUBCATEGORY_MAP: Record<string, string[]> = {
  restaurant: ['takeout-fast-food', 'casual-dining', 'fine-dining'],
  hotel: ['hotels', 'shortlets'],
  salon: ['hair-salon', 'tailoring'],
  spa_wellness: ['spa-massage'],
  gym: ['gym-fitness'],
  shopping: ['supermarket-groceries', 'pharmacy', 'fashion-boutique'],
  home_services: ['cleaning', 'plumbing', 'electrical', 'repairs'],
  professional: ['legal', 'financial-accounting', 'consulting'],
  nightlife: ['clubs-lounges', 'beach-bars', 'live-music-venues', 'live-shows-concerts'],
  car_services: ['car-wash'],
};
