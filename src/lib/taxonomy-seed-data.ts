import type {
  CategoryGroupType,
  BusinessModel,
  CreateCategoryGroupRequest,
  CreateCategoryRequest,
  CreateSubcategoryRequest,
  CustomField,
} from '@/lib/types';

// ─── Helpers ──────────────────────────────────────────────

function sel(key: string, label: string, options: string[], opts?: Partial<CustomField>): CustomField {
  return {
    key, label, type: 'SELECT', order: 0,
    options: options.map((o, i) => ({ value: o.toLowerCase().replace(/[^a-z0-9]+/g, '_'), label: o, order: i })),
    ...opts,
  };
}

function multi(key: string, label: string, options: string[], opts?: Partial<CustomField>): CustomField {
  return {
    key, label, type: 'MULTISELECT', order: 0,
    options: options.map((o, i) => ({ value: o.toLowerCase().replace(/[^a-z0-9]+/g, '_'), label: o, order: i })),
    ...opts,
  };
}

function bool(key: string, label: string, opts?: Partial<CustomField>): CustomField {
  return { key, label, type: 'BOOLEAN', order: 0, ...opts };
}

function text(key: string, label: string, placeholder?: string, opts?: Partial<CustomField>): CustomField {
  return { key, label, type: 'TEXT', order: 0, placeholder, ...opts };
}

function num(key: string, label: string, placeholder?: string, opts?: Partial<CustomField>): CustomField {
  return { key, label, type: 'NUMBER', order: 0, placeholder, ...opts };
}

function textarea(key: string, label: string, placeholder?: string, opts?: Partial<CustomField>): CustomField {
  return { key, label, type: 'TEXTAREA', order: 0, placeholder, ...opts };
}

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
  // ═══ Concierge Services — all BOOKING_VISIT (serviceFields) ═══
  {
    _categorySeedKey: 'concierge-services', _templatePresetId: 'concierge',
    name: 'Airport Pickup', slug: 'airport-pickup', businessModel: 'BOOKING_VISIT' as BusinessModel, displayOrder: 1, riskTier: 'MEDIUM',
    serviceFields: [
      sel('vehicle_type', 'Vehicle Type', ['Sedan', 'SUV', 'Van', 'Bus', 'Luxury'], { order: 0, required: true }),
      num('max_passengers', 'Max Passengers', 'e.g. 4', { order: 1 }),
      bool('luggage_assistance', 'Luggage Assistance Included', { order: 2 }),
      bool('flight_tracking', 'Flight Tracking Available', { order: 3 }),
      sel('coverage_area', 'Coverage Area', ['City Only', 'State-wide', 'Interstate'], { order: 4 }),
    ],
  },
  {
    _categorySeedKey: 'concierge-services', _templatePresetId: 'concierge',
    name: 'Private Security', slug: 'private-security', businessModel: 'BOOKING_VISIT' as BusinessModel, displayOrder: 2, riskTier: 'HIGH',
    serviceFields: [
      sel('security_type', 'Security Type', ['Close Protection', 'Event Security', 'Residential', 'Corporate'], { order: 0, required: true }),
      sel('team_size', 'Team Size', ['1 Officer', '2 Officers', '3-5 Officers', 'Custom'], { order: 1 }),
      bool('armed', 'Armed Personnel Available', { order: 2 }),
      bool('vehicle_included', 'Vehicle Included', { order: 3 }),
    ],
  },
  {
    _categorySeedKey: 'concierge-services', _templatePresetId: 'concierge',
    name: 'Personal Assistant', slug: 'personal-assistant', businessModel: 'BOOKING_VISIT' as BusinessModel, displayOrder: 3, riskTier: 'LOW',
    serviceFields: [
      multi('services_offered', 'Services Offered', ['Errands', 'Shopping', 'Travel Planning', 'Event Planning', 'Reservations', 'Translation'], { order: 0, required: true }),
      sel('availability', 'Availability', ['Business Hours', 'Extended Hours', '24/7'], { order: 1 }),
      multi('languages', 'Languages Spoken', ['English', 'Yoruba', 'Igbo', 'Hausa', 'Pidgin', 'French'], { order: 2 }),
    ],
  },

  // ═══ Restaurants ═══
  {
    _categorySeedKey: 'restaurants', _templatePresetId: 'restaurant',
    name: 'Takeout & Fast Food', slug: 'takeout-fast-food', businessModel: 'ORDER_DELIVERY' as BusinessModel, displayOrder: 1, riskTier: 'LOW',
    productFields: [
      sel('cuisine_type', 'Cuisine Type', ['Nigerian', 'Continental', 'Chinese', 'Indian', 'Fast Food', 'Grills & BBQ', 'Pastries', 'Other'], { order: 0 }),
      multi('dietary_options', 'Dietary Options', ['Vegetarian', 'Vegan', 'Halal', 'Gluten-Free', 'Keto', 'None'], { order: 1 }),
      sel('spice_level', 'Spice Level', ['Mild', 'Medium', 'Hot', 'Extra Hot'], { order: 2 }),
      sel('portion_size', 'Portion Size', ['Small', 'Regular', 'Large', 'Family'], { order: 3 }),
      num('prep_time_minutes', 'Prep Time (minutes)', 'e.g. 30', { order: 4 }),
    ],
  },
  {
    _categorySeedKey: 'restaurants', _templatePresetId: 'restaurant',
    name: 'Casual Dining', slug: 'casual-dining', businessModel: 'VISIT_ONLY' as BusinessModel, displayOrder: 2, riskTier: 'LOW',
    serviceFields: [
      sel('cuisine_type', 'Cuisine Type', ['Nigerian', 'Continental', 'Chinese', 'Indian', 'Grills & BBQ', 'Seafood', 'Other'], { order: 0 }),
      multi('dining_options', 'Dining Options', ['Dine-In', 'Outdoor Seating', 'Private Dining', 'Takeaway'], { order: 1 }),
      multi('dietary_options', 'Dietary Options', ['Vegetarian', 'Vegan', 'Halal', 'Gluten-Free', 'None'], { order: 2 }),
      bool('accepts_reservations', 'Accepts Reservations', { order: 3 }),
    ],
  },
  {
    _categorySeedKey: 'restaurants', _templatePresetId: 'restaurant',
    name: 'Fine Dining', slug: 'fine-dining', businessModel: 'BOOKING_VISIT' as BusinessModel, displayOrder: 3, riskTier: 'LOW',
    serviceFields: [
      sel('cuisine_type', 'Cuisine Type', ['Nigerian', 'Continental', 'French', 'Italian', 'Japanese', 'Fusion', 'Other'], { order: 0, required: true }),
      multi('dining_options', 'Dining Options', ['Indoor', 'Outdoor', 'Private Room', 'Chef\'s Table'], { order: 1 }),
      sel('dress_code', 'Dress Code', ['Smart Casual', 'Business Casual', 'Formal', 'No Restriction'], { order: 2 }),
      multi('dietary_options', 'Dietary Options', ['Vegetarian', 'Vegan', 'Halal', 'Gluten-Free', 'None'], { order: 3 }),
      num('seating_capacity', 'Seating Capacity', 'e.g. 50', { order: 4 }),
    ],
  },

  // ═══ Nightlife — mostly VISIT_ONLY (serviceFields) ═══
  {
    _categorySeedKey: 'nightlife', _templatePresetId: 'nightlife',
    name: 'Clubs & Lounges', slug: 'clubs-lounges', businessModel: 'VISIT_ONLY' as BusinessModel, displayOrder: 1, riskTier: 'MEDIUM',
    serviceFields: [
      sel('venue_type', 'Venue Type', ['Nightclub', 'Lounge', 'Rooftop Bar', 'Sports Bar'], { order: 0 }),
      sel('dress_code', 'Dress Code', ['Casual', 'Smart Casual', 'Formal', 'No Restriction'], { order: 1 }),
      multi('music_genre', 'Music Genre', ['Afrobeats', 'Hip-Hop', 'R&B', 'Amapiano', 'House', 'Reggae', 'Mixed'], { order: 2 }),
      sel('age_restriction', 'Age Restriction', ['18+', '21+', 'All Ages'], { order: 3 }),
      bool('vip_available', 'VIP Section Available', { order: 4 }),
    ],
  },
  {
    _categorySeedKey: 'nightlife', _templatePresetId: 'nightlife',
    name: 'Beach Bars', slug: 'beach-bars', businessModel: 'VISIT_ONLY' as BusinessModel, displayOrder: 2, riskTier: 'MEDIUM',
    serviceFields: [
      multi('offerings', 'Offerings', ['Drinks', 'Food', 'Shisha', 'Live Music', 'DJ'], { order: 0 }),
      sel('seating_type', 'Seating Type', ['Cabana', 'Open Air', 'Beach Chairs', 'Mixed'], { order: 1 }),
      bool('reservations_accepted', 'Reservations Accepted', { order: 2 }),
      sel('age_restriction', 'Age Restriction', ['18+', '21+', 'All Ages'], { order: 3 }),
    ],
  },
  {
    _categorySeedKey: 'nightlife', _templatePresetId: 'nightlife',
    name: 'Live Music Venues', slug: 'live-music-venues', businessModel: 'BOOKING_VISIT' as BusinessModel, displayOrder: 3, riskTier: 'MEDIUM',
    serviceFields: [
      multi('music_genre', 'Music Genre', ['Afrobeats', 'Jazz', 'Highlife', 'Reggae', 'Gospel', 'Rock', 'Mixed'], { order: 0 }),
      sel('venue_capacity', 'Venue Capacity', ['Intimate (<100)', 'Medium (100-500)', 'Large (500+)'], { order: 1 }),
      bool('food_service', 'Food Service Available', { order: 2 }),
      sel('age_restriction', 'Age Restriction', ['18+', '21+', 'All Ages'], { order: 3 }),
    ],
  },

  // ═══ Health & Wellness ═══
  {
    _categorySeedKey: 'health-wellness', _templatePresetId: 'salon',
    name: 'Hair Salon', slug: 'hair-salon', businessModel: 'VISIT_ONLY' as BusinessModel, displayOrder: 1, riskTier: 'LOW',
    serviceFields: [
      sel('service_type', 'Service Type', ['Haircut', 'Styling', 'Colouring', 'Braiding', 'Locs', 'Treatment', 'Extensions'], { order: 0, required: true }),
      sel('gender', 'Gender', ['Male', 'Female', 'Unisex'], { order: 1 }),
      sel('hair_type', 'Hair Type', ['Natural', 'Relaxed', 'All Types'], { order: 2 }),
      num('estimated_duration', 'Estimated Duration (mins)', 'e.g. 60', { order: 3 }),
    ],
  },
  {
    _categorySeedKey: 'health-wellness', _templatePresetId: 'spa_wellness',
    name: 'Spa & Massage', slug: 'spa-massage', businessModel: 'BOOKING_VISIT' as BusinessModel, displayOrder: 2, riskTier: 'LOW',
    serviceFields: [
      sel('treatment_type', 'Treatment Type', ['Swedish Massage', 'Deep Tissue', 'Hot Stone', 'Facial', 'Body Scrub', 'Aromatherapy', 'Full Spa Package'], { order: 0, required: true }),
      sel('body_area', 'Body Area', ['Full Body', 'Upper Body', 'Lower Body', 'Face & Head', 'Hands & Feet'], { order: 1 }),
      sel('pressure_level', 'Pressure Level', ['Light', 'Medium', 'Deep', 'Customizable'], { order: 2 }),
      bool('couples_available', 'Couples Package Available', { order: 3 }),
    ],
  },
  {
    _categorySeedKey: 'health-wellness', _templatePresetId: 'gym',
    name: 'Gym & Fitness', slug: 'gym-fitness', businessModel: 'VISIT_ONLY' as BusinessModel, displayOrder: 3, riskTier: 'LOW',
    serviceFields: [
      multi('activity_type', 'Activity Type', ['Gym Access', 'Personal Training', 'Group Class', 'Yoga', 'CrossFit', 'Swimming', 'Boxing'], { order: 0, required: true }),
      sel('difficulty', 'Difficulty Level', ['Beginner', 'Intermediate', 'Advanced', 'All Levels'], { order: 1 }),
      sel('session_type', 'Session Type', ['Drop-In', 'Monthly', 'Annual', 'Per Class'], { order: 2 }),
      bool('equipment_included', 'Equipment Included', { order: 3 }),
    ],
  },

  // ═══ Home Services — all BOOKING_VISIT (serviceFields) ═══
  {
    _categorySeedKey: 'home-services', _templatePresetId: 'cleaning',
    name: 'Cleaning', slug: 'cleaning', businessModel: 'BOOKING_VISIT' as BusinessModel, displayOrder: 1, riskTier: 'LOW',
    serviceFields: [
      sel('cleaning_type', 'Cleaning Type', ['Regular', 'Deep Cleaning', 'Post-Construction', 'Move In/Out', 'Office', 'Fumigation'], { order: 0, required: true }),
      sel('property_size', 'Property Size', ['Studio/1-Bed', '2-3 Bedrooms', '4-5 Bedrooms', '6+ Bedrooms', 'Office/Commercial'], { order: 1 }),
      bool('supplies_included', 'Cleaning Supplies Included', { order: 2 }),
      num('estimated_hours', 'Estimated Duration (hours)', 'e.g. 3', { order: 3 }),
    ],
  },
  {
    _categorySeedKey: 'home-services', _templatePresetId: 'plumbing',
    name: 'Plumbing', slug: 'plumbing', businessModel: 'BOOKING_VISIT' as BusinessModel, displayOrder: 2, riskTier: 'MEDIUM',
    serviceFields: [
      sel('service_type', 'Service Type', ['Repair', 'Installation', 'Maintenance', 'Inspection', 'Emergency'], { order: 0, required: true }),
      multi('scope', 'Scope', ['Pipes', 'Drainage', 'Toilet', 'Water Heater', 'Sink/Tap', 'Sewer', 'Water Tank'], { order: 1 }),
      bool('emergency_available', 'Emergency Service Available', { order: 2 }),
      bool('parts_included', 'Parts/Materials Included', { order: 3 }),
      text('service_area', 'Service Coverage Area', 'e.g. Lagos Mainland & Island', { order: 4 }),
    ],
  },
  {
    _categorySeedKey: 'home-services', _templatePresetId: 'electrical',
    name: 'Electrical', slug: 'electrical', businessModel: 'BOOKING_VISIT' as BusinessModel, displayOrder: 3, riskTier: 'HIGH',
    serviceFields: [
      sel('service_type', 'Service Type', ['Repair', 'Installation', 'Wiring', 'Inspection', 'Emergency', 'Solar/Inverter'], { order: 0, required: true }),
      multi('scope', 'Scope', ['Lighting', 'Wiring', 'Generator', 'Inverter/Solar', 'Appliance', 'Panel/Breaker', 'CCTV/Security'], { order: 1 }),
      bool('emergency_available', 'Emergency Service Available', { order: 2 }),
      bool('materials_included', 'Materials Included', { order: 3 }),
      text('service_area', 'Service Coverage Area', 'e.g. Lagos, Abuja', { order: 4 }),
    ],
  },

  // ═══ Shopping — all ORDER_DELIVERY (productFields) ═══
  {
    _categorySeedKey: 'shopping', _templatePresetId: 'shopping',
    name: 'Supermarket / Groceries', slug: 'supermarket-groceries', businessModel: 'ORDER_DELIVERY' as BusinessModel, displayOrder: 1, riskTier: 'LOW',
    productFields: [
      sel('category', 'Product Category', ['Fresh Produce', 'Canned Goods', 'Beverages', 'Snacks', 'Dairy', 'Frozen', 'Household', 'Personal Care'], { order: 0 }),
      text('brand', 'Brand', 'e.g. Dangote, Nestl\u00e9', { order: 1 }),
      text('weight_volume', 'Weight / Volume', 'e.g. 500g, 1L', { order: 2 }),
      bool('perishable', 'Perishable Item', { order: 3 }),
    ],
  },
  {
    _categorySeedKey: 'shopping', _templatePresetId: 'shopping',
    name: 'Pharmacy', slug: 'pharmacy', businessModel: 'ORDER_DELIVERY' as BusinessModel, displayOrder: 2, riskTier: 'HIGH',
    productFields: [
      sel('product_type', 'Product Type', ['Over-the-Counter', 'Vitamins & Supplements', 'Personal Care', 'First Aid', 'Baby Care', 'Medical Device'], { order: 0, required: true }),
      text('brand', 'Brand', 'e.g. Emzor, GSK', { order: 1 }),
      text('dosage_form', 'Dosage / Form', 'e.g. 500mg tablets, 200ml syrup', { order: 2 }),
      bool('prescription_required', 'Prescription Required', { order: 3 }),
    ],
  },
  {
    _categorySeedKey: 'shopping', _templatePresetId: 'shopping',
    name: 'Fashion & Boutique', slug: 'fashion-boutique', businessModel: 'ORDER_DELIVERY' as BusinessModel, displayOrder: 3, riskTier: 'LOW',
    productFields: [
      sel('clothing_type', 'Clothing Type', ['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Traditional', 'Accessories', 'Footwear', 'Bags'], { order: 0 }),
      sel('gender', 'Gender', ['Men', 'Women', 'Unisex', 'Kids'], { order: 1 }),
      multi('sizes_available', 'Sizes Available', ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Custom'], { order: 2 }),
      text('material', 'Material', 'e.g. Cotton, Ankara, Lace', { order: 3 }),
      text('brand', 'Brand', 'e.g. Brand name', { order: 4 }),
    ],
  },

  // ═══ Local Services — mixed ═══
  {
    _categorySeedKey: 'local-services', _templatePresetId: 'tailoring',
    name: 'Tailoring', slug: 'tailoring', businessModel: 'VISIT_ONLY' as BusinessModel, displayOrder: 1, riskTier: 'LOW',
    serviceFields: [
      sel('service_type', 'Service Type', ['Custom Outfit', 'Alterations', 'Repair', 'Embroidery', 'Bridal/Special Occasion'], { order: 0, required: true }),
      sel('garment_type', 'Garment Type', ['Agbada', 'Kaftan', 'Dress', 'Suit', 'Shirt/Blouse', 'Traditional', 'Other'], { order: 1 }),
      sel('gender', 'Gender', ['Men', 'Women', 'Unisex'], { order: 2 }),
      text('turnaround_time', 'Turnaround Time', 'e.g. 3-5 days', { order: 3 }),
    ],
  },
  {
    _categorySeedKey: 'local-services', _templatePresetId: 'laundry',
    name: 'Laundry & Dry Cleaning', slug: 'laundry-dry-cleaning', businessModel: 'ORDER_DELIVERY' as BusinessModel, displayOrder: 2, riskTier: 'LOW',
    productFields: [
      sel('service_type', 'Service Type', ['Wash & Fold', 'Dry Cleaning', 'Ironing Only', 'Wash & Iron', 'Special Care'], { order: 0, required: true }),
      sel('garment_type', 'Garment Type', ['Regular Clothes', 'Suits/Formal', 'Traditional/Agbada', 'Bedding', 'Curtains', 'Shoes'], { order: 1 }),
      sel('turnaround', 'Turnaround Time', ['Same Day', 'Next Day', '2-3 Days', '1 Week'], { order: 2 }),
      bool('pickup_delivery', 'Free Pickup & Delivery', { order: 3 }),
    ],
  },
  {
    _categorySeedKey: 'local-services', _templatePresetId: 'car_services',
    name: 'Car Wash', slug: 'car-wash', businessModel: 'VISIT_ONLY' as BusinessModel, displayOrder: 3, riskTier: 'LOW',
    serviceFields: [
      sel('wash_type', 'Wash Type', ['Basic Exterior', 'Full Wash', 'Interior Detail', 'Full Detail', 'Engine Wash'], { order: 0, required: true }),
      multi('vehicle_type', 'Vehicle Type', ['Sedan', 'SUV', 'Truck', 'Van', 'Bus', 'Motorcycle'], { order: 1 }),
      multi('add_ons', 'Add-Ons', ['Waxing', 'Polishing', 'Tyre Shine', 'Air Freshener', 'Upholstery Clean'], { order: 2 }),
    ],
  },
  {
    _categorySeedKey: 'local-services', _templatePresetId: 'repairs',
    name: 'Repairs', slug: 'repairs', businessModel: 'BOOKING_VISIT' as BusinessModel, displayOrder: 4, riskTier: 'MEDIUM',
    serviceFields: [
      sel('repair_type', 'Repair Type', ['Appliance', 'Furniture', 'Electronics', 'Phone/Laptop', 'AC/HVAC', 'Generator', 'Other'], { order: 0, required: true }),
      text('brand_model', 'Brand / Model', 'e.g. Samsung, LG Inverter AC', { order: 1 }),
      textarea('issue_description', 'Issue Description', 'Describe the problem', { order: 2 }),
      bool('emergency_available', 'Emergency Service Available', { order: 3 }),
      bool('parts_included', 'Replacement Parts Included', { order: 4 }),
    ],
  },

  // ═══ Professional Services — all BOOKING_VISIT (serviceFields) ═══
  {
    _categorySeedKey: 'professional-services', _templatePresetId: 'professional',
    name: 'Legal', slug: 'legal', businessModel: 'BOOKING_VISIT' as BusinessModel, displayOrder: 1, riskTier: 'LOW',
    serviceFields: [
      multi('practice_areas', 'Practice Areas', ['Corporate', 'Real Estate', 'Immigration', 'Family Law', 'Criminal', 'Tax', 'IP/Tech', 'General'], { order: 0, required: true }),
      sel('consultation_mode', 'Consultation Mode', ['In-Person', 'Virtual', 'Phone', 'Any'], { order: 1 }),
      multi('qualifications', 'Qualifications', ['NBA Registered', 'Senior Advocate (SAN)', 'Notary Public', 'Solicitor'], { order: 2 }),
    ],
  },
  {
    _categorySeedKey: 'professional-services', _templatePresetId: 'professional',
    name: 'Financial & Accounting', slug: 'financial-accounting', businessModel: 'BOOKING_VISIT' as BusinessModel, displayOrder: 2, riskTier: 'LOW',
    serviceFields: [
      multi('services_offered', 'Services Offered', ['Tax Filing', 'Bookkeeping', 'Audit', 'Payroll', 'Business Registration', 'Financial Advisory', 'Investment'], { order: 0, required: true }),
      sel('consultation_mode', 'Consultation Mode', ['In-Person', 'Virtual', 'Phone', 'Any'], { order: 1 }),
      multi('certifications', 'Certifications', ['ICAN', 'ACCA', 'CFA', 'CITN'], { order: 2 }),
    ],
  },
  {
    _categorySeedKey: 'professional-services', _templatePresetId: 'professional',
    name: 'Consulting', slug: 'consulting', businessModel: 'BOOKING_VISIT' as BusinessModel, displayOrder: 3, riskTier: 'LOW',
    serviceFields: [
      multi('specializations', 'Specializations', ['Business Strategy', 'Marketing', 'HR', 'IT/Tech', 'Operations', 'Finance', 'Real Estate', 'Import/Export'], { order: 0, required: true }),
      sel('consultation_mode', 'Consultation Mode', ['In-Person', 'Virtual', 'Phone', 'Any'], { order: 1 }),
      sel('engagement_type', 'Engagement Type', ['One-Time', 'Retainer', 'Project-Based', 'Flexible'], { order: 2 }),
    ],
  },

  // ═══ Arts & Entertainment — mixed ═══
  {
    _categorySeedKey: 'arts-entertainment', _templatePresetId: 'arts_entertainment',
    name: 'Galleries & Museums', slug: 'galleries-museums', businessModel: 'VISIT_ONLY' as BusinessModel, displayOrder: 1, riskTier: 'LOW',
    serviceFields: [
      multi('art_type', 'Art Type', ['Contemporary', 'Traditional', 'Photography', 'Sculpture', 'Mixed Media', 'Historical'], { order: 0 }),
      bool('guided_tours', 'Guided Tours Available', { order: 1 }),
      bool('art_for_sale', 'Art Available for Purchase', { order: 2 }),
      sel('admission', 'Admission', ['Free', 'Paid', 'Donation-Based'], { order: 3 }),
    ],
  },
  {
    _categorySeedKey: 'arts-entertainment', _templatePresetId: 'nightlife',
    name: 'Live Shows & Concerts', slug: 'live-shows-concerts', businessModel: 'BOOKING_VISIT' as BusinessModel, displayOrder: 2, riskTier: 'MEDIUM',
    serviceFields: [
      multi('event_type', 'Event Type', ['Concert', 'Comedy Show', 'Theatre', 'Open Mic', 'Poetry', 'Dance', 'Festival'], { order: 0, required: true }),
      sel('venue_capacity', 'Venue Capacity', ['Intimate (<100)', 'Medium (100-500)', 'Large (500+)'], { order: 1 }),
      sel('age_restriction', 'Age Restriction', ['All Ages', '16+', '18+'], { order: 2 }),
      bool('food_drinks', 'Food & Drinks Available', { order: 3 }),
    ],
  },
  {
    _categorySeedKey: 'arts-entertainment', _templatePresetId: 'arts_entertainment',
    name: 'Festivals & Events', slug: 'festivals-events', businessModel: 'BOOKING_VISIT' as BusinessModel, displayOrder: 3, riskTier: 'MEDIUM',
    serviceFields: [
      sel('event_type', 'Event Type', ['Festival', 'Exhibition', 'Trade Fair', 'Cultural Event', 'Food Festival', 'Music Festival'], { order: 0, required: true }),
      sel('venue_type', 'Venue Type', ['Indoor', 'Outdoor', 'Both'], { order: 1 }),
      bool('food_vendors', 'Food Vendors Available', { order: 2 }),
      sel('age_restriction', 'Age Restriction', ['All Ages', '16+', '18+'], { order: 3 }),
    ],
  },

  // ═══ Hotels & Travel — all BOOKING_VISIT (serviceFields) ═══
  {
    _categorySeedKey: 'hotels-travel', _templatePresetId: 'hotel',
    name: 'Hotels', slug: 'hotels', businessModel: 'BOOKING_VISIT' as BusinessModel, displayOrder: 1, riskTier: 'LOW',
    serviceFields: [
      sel('room_type', 'Room Type', ['Standard', 'Deluxe', 'Suite', 'Executive', 'Presidential'], { order: 0, required: true }),
      multi('amenities', 'Amenities', ['WiFi', 'Pool', 'Gym', 'Restaurant', 'Bar', 'Parking', 'Laundry', 'Airport Shuttle', 'Spa', 'Room Service'], { order: 1 }),
      sel('star_rating', 'Star Rating', ['1 Star', '2 Stars', '3 Stars', '4 Stars', '5 Stars'], { order: 2 }),
      text('check_in_time', 'Check-In Time', 'e.g. 2:00 PM', { order: 3 }),
      text('check_out_time', 'Check-Out Time', 'e.g. 12:00 PM', { order: 4 }),
    ],
  },
  {
    _categorySeedKey: 'hotels-travel', _templatePresetId: 'hotel',
    name: 'Shortlets', slug: 'shortlets', businessModel: 'BOOKING_VISIT' as BusinessModel, displayOrder: 2, riskTier: 'MEDIUM',
    serviceFields: [
      sel('property_type', 'Property Type', ['Apartment', 'Duplex', 'Penthouse', 'Villa', 'Studio', 'Bungalow'], { order: 0, required: true }),
      num('bedrooms', 'Number of Bedrooms', 'e.g. 2', { order: 1, required: true }),
      num('max_guests', 'Max Guests', 'e.g. 4', { order: 2 }),
      multi('amenities', 'Amenities', ['WiFi', 'AC', 'TV', 'Kitchen', 'Parking', 'Pool', 'Generator', 'Security', 'Washer'], { order: 3 }),
      text('check_in_time', 'Check-In Time', 'e.g. 2:00 PM', { order: 4 }),
      text('check_out_time', 'Check-Out Time', 'e.g. 12:00 PM', { order: 5 }),
    ],
  },
];

// ─── Template-to-Subcategory Mapping ───────────────────────

export const TEMPLATE_SUBCATEGORY_MAP: Record<string, string[]> = {
  restaurant: ['takeout-fast-food', 'casual-dining', 'fine-dining'],
  hotel: ['hotels', 'shortlets'],
  salon: ['hair-salon'],
  tailoring: ['tailoring'],
  laundry: ['laundry-dry-cleaning'],
  spa_wellness: ['spa-massage'],
  gym: ['gym-fitness'],
  shopping: ['supermarket-groceries', 'pharmacy', 'fashion-boutique'],
  cleaning: ['cleaning'],
  plumbing: ['plumbing'],
  electrical: ['electrical'],
  repairs: ['repairs'],
  professional: ['legal', 'financial-accounting', 'consulting'],
  nightlife: ['clubs-lounges', 'beach-bars', 'live-music-venues', 'live-shows-concerts'],
  car_services: ['car-wash'],
};
