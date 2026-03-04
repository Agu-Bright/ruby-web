import {
  Utensils, Hotel, Scissors, Dumbbell, ShoppingBag, Wrench,
  Briefcase, Music, Car, Stethoscope,
} from 'lucide-react';
import type { TemplateField } from '@/lib/types';

// ─── Template Presets ──────────────────────────────────────

export interface TemplatePreset {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  fields: TemplateField[];
}

export const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id: 'restaurant',
    name: 'Restaurant',
    description: 'Dining, takeout, and food service businesses',
    icon: Utensils,
    color: 'from-orange-400 to-red-500',
    fields: [
      { key: 'cuisine_type', label: 'Cuisine Type', type: 'MULTISELECT', required: true, isPublic: true, isFilter: true, filterType: 'MULTI_CHECKBOX', order: 0, options: [
        { value: 'nigerian', label: 'Nigerian' }, { value: 'continental', label: 'Continental' }, { value: 'chinese', label: 'Chinese' },
        { value: 'indian', label: 'Indian' }, { value: 'italian', label: 'Italian' }, { value: 'lebanese', label: 'Lebanese' },
        { value: 'japanese', label: 'Japanese' }, { value: 'fusion', label: 'Fusion' }, { value: 'african', label: 'African' },
      ] },
      { key: 'price_range', label: 'Price Range', type: 'SELECT', required: true, isPublic: true, isFilter: true, filterType: 'CHECKBOX', order: 1, options: [
        { value: 'budget', label: '₦ Budget (Under ₦3,000)' }, { value: 'mid_range', label: '₦₦ Mid-Range (₦3,000–₦10,000)' },
        { value: 'premium', label: '₦₦₦ Premium (₦10,000–₦25,000)' }, { value: 'fine_dining', label: '₦₦₦₦ Fine Dining (₦25,000+)' },
      ] },
      { key: 'seating_capacity', label: 'Seating Capacity', type: 'NUMBER', required: false, isPublic: true, isFilter: true, filterType: 'RANGE_SLIDER', order: 2, placeholder: 'e.g. 50', options: [] },
      { key: 'dining_options', label: 'Dining Options', type: 'MULTISELECT', required: true, isPublic: true, isFilter: true, filterType: 'MULTI_CHECKBOX', order: 3, options: [
        { value: 'dine_in', label: 'Dine-in' }, { value: 'takeaway', label: 'Takeaway' }, { value: 'delivery', label: 'Delivery' },
        { value: 'outdoor_seating', label: 'Outdoor Seating' }, { value: 'private_dining', label: 'Private Dining' },
      ] },
      { key: 'dietary_options', label: 'Dietary Options Available', type: 'MULTISELECT', required: false, isPublic: true, isFilter: true, filterType: 'MULTI_CHECKBOX', order: 4, options: [
        { value: 'halal', label: 'Halal' }, { value: 'vegetarian', label: 'Vegetarian' }, { value: 'vegan', label: 'Vegan' },
        { value: 'gluten_free', label: 'Gluten-Free' }, { value: 'keto', label: 'Keto-Friendly' },
      ] },
      { key: 'accepts_reservations', label: 'Accepts Reservations', type: 'BOOLEAN', required: true, isPublic: true, isFilter: true, filterType: 'TOGGLE', order: 5, options: [] },
      { key: 'average_wait_time', label: 'Average Wait Time', type: 'DURATION', required: false, isPublic: true, isFilter: false, order: 6, placeholder: 'e.g. 15 minutes', options: [] },
      { key: 'special_features', label: 'Special Features', type: 'MULTISELECT', required: false, isPublic: true, isFilter: true, filterType: 'MULTI_CHECKBOX', order: 7, options: [
        { value: 'live_band', label: 'Live Band/Music' }, { value: 'wifi', label: 'Free Wi-Fi' }, { value: 'parking', label: 'Parking Available' },
        { value: 'kids_area', label: 'Kids Play Area' }, { value: 'rooftop', label: 'Rooftop' }, { value: 'ac', label: 'Air Conditioned' },
        { value: 'generator', label: '24/7 Power (Generator)' },
      ] },
      { key: 'menu_url', label: 'Menu Link', type: 'URL', required: false, isPublic: true, isFilter: false, order: 8, placeholder: 'https://...', options: [] },
      { key: 'menu_photo', label: 'Menu Photo', type: 'MEDIA', required: false, isPublic: true, isFilter: false, order: 9, options: [] },
    ],
  },
  {
    id: 'hotel',
    name: 'Hotel & Shortlet',
    description: 'Hotels, shortlet apartments, and accommodations',
    icon: Hotel,
    color: 'from-blue-400 to-indigo-500',
    fields: [
      { key: 'property_type', label: 'Property Type', type: 'SELECT', required: true, isPublic: true, isFilter: true, filterType: 'CHECKBOX', order: 0, options: [
        { value: 'hotel', label: 'Hotel' }, { value: 'shortlet', label: 'Shortlet Apartment' }, { value: 'guest_house', label: 'Guest House' },
        { value: 'resort', label: 'Resort' }, { value: 'boutique', label: 'Boutique Hotel' },
      ] },
      { key: 'star_rating', label: 'Star Rating', type: 'SELECT', required: false, isPublic: true, isFilter: true, filterType: 'CHECKBOX', order: 1, options: [
        { value: '1', label: '1 Star' }, { value: '2', label: '2 Stars' }, { value: '3', label: '3 Stars' },
        { value: '4', label: '4 Stars' }, { value: '5', label: '5 Stars' },
      ] },
      { key: 'price_per_night', label: 'Price Per Night (₦)', type: 'PRICE', required: true, isPublic: true, isFilter: true, filterType: 'RANGE_SLIDER', order: 2, placeholder: 'e.g. 25000', options: [] },
      { key: 'room_types', label: 'Room Types Available', type: 'MULTISELECT', required: true, isPublic: true, isFilter: true, filterType: 'MULTI_CHECKBOX', order: 3, options: [
        { value: 'standard', label: 'Standard' }, { value: 'deluxe', label: 'Deluxe' }, { value: 'suite', label: 'Suite' },
        { value: 'studio', label: 'Studio' }, { value: 'penthouse', label: 'Penthouse' },
      ] },
      { key: 'amenities', label: 'Amenities', type: 'MULTISELECT', required: false, isPublic: true, isFilter: true, filterType: 'MULTI_CHECKBOX', order: 4, options: [
        { value: 'pool', label: 'Swimming Pool' }, { value: 'gym', label: 'Gym' }, { value: 'wifi', label: 'Free Wi-Fi' },
        { value: 'parking', label: 'Parking' }, { value: 'restaurant', label: 'Restaurant' }, { value: 'bar', label: 'Bar/Lounge' },
        { value: 'spa', label: 'Spa' }, { value: 'laundry', label: 'Laundry Service' }, { value: 'generator', label: '24/7 Power' },
      ] },
      { key: 'check_in_time', label: 'Check-in Time', type: 'TIME', required: true, isPublic: true, isFilter: false, order: 5, options: [] },
      { key: 'check_out_time', label: 'Check-out Time', type: 'TIME', required: true, isPublic: true, isFilter: false, order: 6, options: [] },
      { key: 'accepts_bookings', label: 'Online Booking Available', type: 'BOOLEAN', required: true, isPublic: true, isFilter: true, filterType: 'TOGGLE', order: 7, options: [] },
    ],
  },
  {
    id: 'salon',
    name: 'Hair Salon & Barber',
    description: 'Hair salons, barbershops, and beauty services',
    icon: Scissors,
    color: 'from-pink-400 to-rose-500',
    fields: [
      { key: 'service_types', label: 'Service Types', type: 'MULTISELECT', required: true, isPublic: true, isFilter: true, filterType: 'MULTI_CHECKBOX', order: 0, options: [
        { value: 'haircut', label: 'Haircut' }, { value: 'braiding', label: 'Braiding' }, { value: 'weaving', label: 'Weaving/Wigs' },
        { value: 'coloring', label: 'Coloring' }, { value: 'treatment', label: 'Hair Treatment' }, { value: 'styling', label: 'Styling' },
        { value: 'locs', label: 'Locs' }, { value: 'kids', label: 'Kids Hair' },
      ] },
      { key: 'gender_focus', label: 'Serves', type: 'SELECT', required: true, isPublic: true, isFilter: true, filterType: 'CHECKBOX', order: 1, options: [
        { value: 'men', label: 'Men Only' }, { value: 'women', label: 'Women Only' }, { value: 'unisex', label: 'Unisex' },
      ] },
      { key: 'price_range', label: 'Starting Price (₦)', type: 'PRICE', required: true, isPublic: true, isFilter: true, filterType: 'RANGE_SLIDER', order: 2, placeholder: 'e.g. 2000', options: [] },
      { key: 'walk_in_accepted', label: 'Walk-ins Accepted', type: 'BOOLEAN', required: true, isPublic: true, isFilter: true, filterType: 'TOGGLE', order: 3, options: [] },
      { key: 'accepts_appointments', label: 'Accepts Appointments', type: 'BOOLEAN', required: true, isPublic: true, isFilter: true, filterType: 'TOGGLE', order: 4, options: [] },
      { key: 'payment_methods', label: 'Payment Methods', type: 'MULTISELECT', required: false, isPublic: true, isFilter: false, order: 5, options: [
        { value: 'cash', label: 'Cash' }, { value: 'transfer', label: 'Bank Transfer' }, { value: 'pos', label: 'POS' }, { value: 'mobile', label: 'Mobile Payment' },
      ] },
    ],
  },
  {
    id: 'gym',
    name: 'Gym & Fitness',
    description: 'Gyms, fitness centers, and workout facilities',
    icon: Dumbbell,
    color: 'from-emerald-400 to-teal-500',
    fields: [
      { key: 'facility_type', label: 'Facility Type', type: 'SELECT', required: true, isPublic: true, isFilter: true, filterType: 'CHECKBOX', order: 0, options: [
        { value: 'gym', label: 'Full Gym' }, { value: 'studio', label: 'Fitness Studio' }, { value: 'crossfit', label: 'CrossFit Box' },
        { value: 'outdoor', label: 'Outdoor Fitness' }, { value: 'yoga', label: 'Yoga Studio' },
      ] },
      { key: 'services', label: 'Services Offered', type: 'MULTISELECT', required: true, isPublic: true, isFilter: true, filterType: 'MULTI_CHECKBOX', order: 1, options: [
        { value: 'weights', label: 'Weight Training' }, { value: 'cardio', label: 'Cardio' }, { value: 'classes', label: 'Group Classes' },
        { value: 'personal_training', label: 'Personal Training' }, { value: 'swimming', label: 'Swimming' }, { value: 'sauna', label: 'Sauna/Steam' },
      ] },
      { key: 'monthly_fee', label: 'Monthly Membership (₦)', type: 'PRICE', required: true, isPublic: true, isFilter: true, filterType: 'RANGE_SLIDER', order: 2, placeholder: 'e.g. 15000', options: [] },
      { key: 'day_pass', label: 'Day Pass Available', type: 'BOOLEAN', required: true, isPublic: true, isFilter: true, filterType: 'TOGGLE', order: 3, options: [] },
      { key: 'operating_hours', label: 'Operating Hours', type: 'TEXT', required: true, isPublic: true, isFilter: false, order: 4, placeholder: 'e.g. 6:00 AM – 10:00 PM', options: [] },
      { key: 'has_parking', label: 'Parking Available', type: 'BOOLEAN', required: false, isPublic: true, isFilter: true, filterType: 'TOGGLE', order: 5, options: [] },
    ],
  },
  {
    id: 'shopping',
    name: 'Shopping & Retail',
    description: 'Boutiques, supermarkets, and retail stores',
    icon: ShoppingBag,
    color: 'from-amber-400 to-orange-500',
    fields: [
      { key: 'store_type', label: 'Store Type', type: 'SELECT', required: true, isPublic: true, isFilter: true, filterType: 'CHECKBOX', order: 0, options: [
        { value: 'boutique', label: 'Boutique/Fashion' }, { value: 'supermarket', label: 'Supermarket' }, { value: 'pharmacy', label: 'Pharmacy' },
        { value: 'electronics', label: 'Electronics' }, { value: 'artisan', label: 'Artisan/Crafts' }, { value: 'general', label: 'General Store' },
      ] },
      { key: 'delivery_available', label: 'Delivery Available', type: 'BOOLEAN', required: true, isPublic: true, isFilter: true, filterType: 'TOGGLE', order: 1, options: [] },
      { key: 'payment_methods', label: 'Payment Methods', type: 'MULTISELECT', required: false, isPublic: true, isFilter: false, order: 2, options: [
        { value: 'cash', label: 'Cash' }, { value: 'transfer', label: 'Bank Transfer' }, { value: 'pos', label: 'POS' }, { value: 'mobile', label: 'Mobile Payment' },
      ] },
      { key: 'min_order', label: 'Minimum Order (₦)', type: 'PRICE', required: false, isPublic: true, isFilter: true, filterType: 'RANGE_SLIDER', order: 3, placeholder: 'e.g. 5000', options: [] },
      { key: 'return_policy', label: 'Return Policy', type: 'TEXTAREA', required: false, isPublic: true, isFilter: false, order: 4, placeholder: 'Describe your return/exchange policy', options: [] },
    ],
  },
  {
    id: 'home_services',
    name: 'Home Services',
    description: 'Cleaning, plumbing, electrical, and repairs',
    icon: Wrench,
    color: 'from-cyan-400 to-blue-500',
    fields: [
      { key: 'service_type', label: 'Service Type', type: 'SELECT', required: true, isPublic: true, isFilter: true, filterType: 'CHECKBOX', order: 0, options: [
        { value: 'cleaning', label: 'Cleaning' }, { value: 'plumbing', label: 'Plumbing' }, { value: 'electrical', label: 'Electrical' },
        { value: 'painting', label: 'Painting' }, { value: 'carpentry', label: 'Carpentry' }, { value: 'ac_repair', label: 'AC Repair' },
        { value: 'fumigation', label: 'Fumigation' },
      ] },
      { key: 'service_area', label: 'Service Area', type: 'TEXT', required: true, isPublic: true, isFilter: false, order: 1, placeholder: 'e.g. Lagos Island, Victoria Island, Lekki', options: [] },
      { key: 'starting_price', label: 'Starting Price (₦)', type: 'PRICE', required: true, isPublic: true, isFilter: true, filterType: 'RANGE_SLIDER', order: 2, placeholder: 'e.g. 5000', options: [] },
      { key: 'response_time', label: 'Average Response Time', type: 'DURATION', required: false, isPublic: true, isFilter: true, filterType: 'RANGE_SLIDER', order: 3, placeholder: 'e.g. 2 hours', options: [] },
      { key: 'emergency_service', label: 'Emergency/Same-Day Service', type: 'BOOLEAN', required: true, isPublic: true, isFilter: true, filterType: 'TOGGLE', order: 4, options: [] },
      { key: 'guarantee', label: 'Work Guarantee', type: 'TEXTAREA', required: false, isPublic: true, isFilter: false, order: 5, placeholder: 'Describe warranty or guarantee on work', options: [] },
    ],
  },
  {
    id: 'professional',
    name: 'Professional Services',
    description: 'Legal, financial, and consulting services',
    icon: Briefcase,
    color: 'from-slate-400 to-gray-600',
    fields: [
      { key: 'specialty', label: 'Specialty', type: 'MULTISELECT', required: true, isPublic: true, isFilter: true, filterType: 'MULTI_CHECKBOX', order: 0, options: [
        { value: 'legal', label: 'Legal' }, { value: 'accounting', label: 'Accounting' }, { value: 'tax', label: 'Tax Advisory' },
        { value: 'consulting', label: 'Business Consulting' }, { value: 'immigration', label: 'Immigration' }, { value: 'real_estate', label: 'Real Estate' },
      ] },
      { key: 'consultation_fee', label: 'Consultation Fee (₦)', type: 'PRICE', required: true, isPublic: true, isFilter: true, filterType: 'RANGE_SLIDER', order: 1, placeholder: 'e.g. 20000', options: [] },
      { key: 'consultation_mode', label: 'Consultation Mode', type: 'MULTISELECT', required: true, isPublic: true, isFilter: true, filterType: 'MULTI_CHECKBOX', order: 2, options: [
        { value: 'in_person', label: 'In-Person' }, { value: 'virtual', label: 'Virtual/Video Call' }, { value: 'phone', label: 'Phone' },
      ] },
      { key: 'years_experience', label: 'Years of Experience', type: 'NUMBER', required: false, isPublic: true, isFilter: true, filterType: 'RANGE_SLIDER', order: 3, placeholder: 'e.g. 10', options: [] },
      { key: 'accepts_appointments', label: 'Online Booking', type: 'BOOLEAN', required: true, isPublic: true, isFilter: true, filterType: 'TOGGLE', order: 4, options: [] },
      { key: 'languages', label: 'Languages Spoken', type: 'MULTISELECT', required: false, isPublic: true, isFilter: true, filterType: 'MULTI_CHECKBOX', order: 5, options: [
        { value: 'english', label: 'English' }, { value: 'yoruba', label: 'Yoruba' }, { value: 'igbo', label: 'Igbo' },
        { value: 'hausa', label: 'Hausa' }, { value: 'pidgin', label: 'Pidgin' }, { value: 'french', label: 'French' },
      ] },
    ],
  },
  {
    id: 'nightlife',
    name: 'Nightlife & Entertainment',
    description: 'Clubs, lounges, bars, and live venues',
    icon: Music,
    color: 'from-violet-400 to-purple-600',
    fields: [
      { key: 'venue_type', label: 'Venue Type', type: 'SELECT', required: true, isPublic: true, isFilter: true, filterType: 'CHECKBOX', order: 0, options: [
        { value: 'club', label: 'Nightclub' }, { value: 'lounge', label: 'Lounge' }, { value: 'bar', label: 'Bar' },
        { value: 'beach_bar', label: 'Beach Bar' }, { value: 'rooftop', label: 'Rooftop Bar' }, { value: 'karaoke', label: 'Karaoke' },
      ] },
      { key: 'music_genres', label: 'Music Genres', type: 'MULTISELECT', required: false, isPublic: true, isFilter: true, filterType: 'MULTI_CHECKBOX', order: 1, options: [
        { value: 'afrobeats', label: 'Afrobeats' }, { value: 'hiphop', label: 'Hip-Hop/R&B' }, { value: 'amapiano', label: 'Amapiano' },
        { value: 'live', label: 'Live Band' }, { value: 'dj', label: 'DJ Sets' }, { value: 'mixed', label: 'Mixed' },
      ] },
      { key: 'entry_fee', label: 'Entry Fee (₦)', type: 'PRICE', required: false, isPublic: true, isFilter: true, filterType: 'RANGE_SLIDER', order: 2, placeholder: 'e.g. 5000 (0 if free)', options: [] },
      { key: 'dress_code', label: 'Dress Code', type: 'SELECT', required: false, isPublic: true, isFilter: true, filterType: 'CHECKBOX', order: 3, options: [
        { value: 'casual', label: 'Casual' }, { value: 'smart_casual', label: 'Smart Casual' }, { value: 'formal', label: 'Formal/Upscale' },
        { value: 'themed', label: 'Themed Nights' },
      ] },
      { key: 'vip_available', label: 'VIP/Table Service', type: 'BOOLEAN', required: true, isPublic: true, isFilter: true, filterType: 'TOGGLE', order: 4, options: [] },
      { key: 'age_restriction', label: 'Minimum Age', type: 'NUMBER', required: false, isPublic: true, isFilter: false, order: 5, placeholder: 'e.g. 18', options: [] },
    ],
  },
  {
    id: 'car_services',
    name: 'Car Services',
    description: 'Car wash, auto repair, and vehicle services',
    icon: Car,
    color: 'from-sky-400 to-blue-500',
    fields: [
      { key: 'service_type', label: 'Service Type', type: 'MULTISELECT', required: true, isPublic: true, isFilter: true, filterType: 'MULTI_CHECKBOX', order: 0, options: [
        { value: 'car_wash', label: 'Car Wash' }, { value: 'detailing', label: 'Detailing' }, { value: 'mechanic', label: 'Mechanic/Repairs' },
        { value: 'tyre', label: 'Tyre Services' }, { value: 'towing', label: 'Towing' }, { value: 'body_work', label: 'Body Work/Painting' },
      ] },
      { key: 'starting_price', label: 'Starting Price (₦)', type: 'PRICE', required: true, isPublic: true, isFilter: true, filterType: 'RANGE_SLIDER', order: 1, placeholder: 'e.g. 2000', options: [] },
      { key: 'mobile_service', label: 'Mobile/On-Site Service', type: 'BOOLEAN', required: true, isPublic: true, isFilter: true, filterType: 'TOGGLE', order: 2, options: [] },
      { key: 'walk_in', label: 'Walk-ins Accepted', type: 'BOOLEAN', required: true, isPublic: true, isFilter: true, filterType: 'TOGGLE', order: 3, options: [] },
      { key: 'vehicle_types', label: 'Vehicle Types Served', type: 'MULTISELECT', required: false, isPublic: true, isFilter: true, filterType: 'MULTI_CHECKBOX', order: 4, options: [
        { value: 'sedan', label: 'Sedan' }, { value: 'suv', label: 'SUV' }, { value: 'truck', label: 'Truck' },
        { value: 'bus', label: 'Bus/Van' }, { value: 'motorcycle', label: 'Motorcycle' },
      ] },
    ],
  },
  {
    id: 'spa_wellness',
    name: 'Spa & Wellness',
    description: 'Spas, massage, and wellness centers',
    icon: Stethoscope,
    color: 'from-rose-400 to-pink-500',
    fields: [
      { key: 'services_offered', label: 'Services Offered', type: 'MULTISELECT', required: true, isPublic: true, isFilter: true, filterType: 'MULTI_CHECKBOX', order: 0, options: [
        { value: 'massage', label: 'Massage' }, { value: 'facial', label: 'Facial' }, { value: 'manicure', label: 'Manicure' },
        { value: 'pedicure', label: 'Pedicure' }, { value: 'body_scrub', label: 'Body Scrub' }, { value: 'sauna', label: 'Sauna/Steam' },
        { value: 'waxing', label: 'Waxing' }, { value: 'makeup', label: 'Makeup' },
      ] },
      { key: 'price_range', label: 'Starting Price (₦)', type: 'PRICE', required: true, isPublic: true, isFilter: true, filterType: 'RANGE_SLIDER', order: 1, placeholder: 'e.g. 5000', options: [] },
      { key: 'gender_focus', label: 'Serves', type: 'SELECT', required: true, isPublic: true, isFilter: true, filterType: 'CHECKBOX', order: 2, options: [
        { value: 'women', label: 'Women Only' }, { value: 'men', label: 'Men Only' }, { value: 'unisex', label: 'Unisex' },
      ] },
      { key: 'accepts_appointments', label: 'Online Booking', type: 'BOOLEAN', required: true, isPublic: true, isFilter: true, filterType: 'TOGGLE', order: 3, options: [] },
      { key: 'home_service', label: 'Home Service Available', type: 'BOOLEAN', required: true, isPublic: true, isFilter: true, filterType: 'TOGGLE', order: 4, options: [] },
      { key: 'couples_service', label: 'Couples Packages', type: 'BOOLEAN', required: false, isPublic: true, isFilter: true, filterType: 'TOGGLE', order: 5, options: [] },
    ],
  },
];
