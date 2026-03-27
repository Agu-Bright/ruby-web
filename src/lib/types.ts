// ============================================================
// Ruby+ API Types — Aligned with NestJS Backend
// ============================================================

// Standard API response shape
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  error?: ApiError | null;
  meta?: ApiMeta | null;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

// ============================================================
// Auth
// ============================================================
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  admin: AdminUser;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

// ============================================================
// Admin Users & RBAC
// ============================================================
// Backend AdminRole enum values (lowercase, matching NestJS schema)
export type AdminRole = 'super_admin' | 'admin' | 'location_admin' | 'support' | 'finance' | 'content';
export type AdminScope = 'GLOBAL' | 'LOCATION';
export type AdminStatus = 'ACTIVE' | 'SUSPENDED';

export interface AdminUser {
  _id: string;
  // Login response uses 'id', listing uses '_id' — support both
  id?: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
  type?: string;
  roles: AdminRole[];
  scope: AdminScope;
  locationIds: (string | { _id: string; name: string; type?: string; status?: string })[];
  isActive?: boolean;
  status?: AdminStatus;
  lastLoginAt?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAdminRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roles: AdminRole[];
  scope: AdminScope;
  locationIds: string[];
}

export interface UpdateAdminRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  password?: string;
  roles?: AdminRole[];
  scope?: AdminScope;
  locationIds?: string[];
  isActive?: boolean;
}

// ============================================================
// Locations
// ============================================================
export type LocationType = 'COUNTRY' | 'STATE' | 'CITY' | 'AREA';
export type LocationStatus = 'ACTIVE' | 'INACTIVE';

export interface DeliveryConfig {
  pricingMode: 'FLAT' | 'DISTANCE_BASED' | 'PROVIDER_QUOTE';
  baseFee?: number;
  perKmFee?: number;
  minFee?: number;
  maxFee?: number;
  freeDeliveryThreshold?: number;
}

export interface PlatformFees {
  orderCommissionPercent: number;
  bookingCommissionPercent: number;
  paymentProcessingPercent: number;
}

export interface Location {
  _id: string;
  name: string;
  slug: string;
  type: LocationType;
  parentId?: string | { _id: string; name: string; slug: string; type: LocationType };
  countryCode: string;
  centerLat: number;
  centerLng: number;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  status: LocationStatus;
  timezone: string;
  defaultCurrency: string;
  supportedCurrencies: string[];
  defaultLanguage: string;
  supportedLanguages: string[];
  deliveryConfig?: DeliveryConfig;
  platformFees?: PlatformFees;
  metadata?: {
    population?: number;
    phoneCode?: string;
    flagEmoji?: string;
    flagUrl?: string;
  };
  displayOrder?: number;
  activatedAt?: string;
  activatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLocationRequest {
  name: string;
  slug: string;
  type: LocationType;
  parentId?: string;
  countryCode: string;
  titles?: Record<string, string>;
  centerLat: number;
  centerLng: number;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  timezone: string;
  defaultCurrency: string;
  supportedCurrencies: string[];
  defaultLanguage: string;
  supportedLanguages: string[];
  deliveryConfig?: DeliveryConfig;
  platformFees?: PlatformFees;
}

export interface CreateLocationResponse {
  location: Location;
  adminCredentials: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    roles: AdminRole[];
  };
}

export interface UpdateLocationRequest {
  name?: string;
  timezone?: string;
  defaultCurrency?: string;
  supportedCurrencies?: string[];
  defaultLanguage?: string;
  supportedLanguages?: string[];
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  centerLat?: number;
  centerLng?: number;
  deliveryConfig?: DeliveryConfig;
  platformFees?: PlatformFees;
  displayOrder?: number;
  metadata?: {
    population?: number;
    phoneCode?: string;
    flagEmoji?: string;
  };
}

// ============================================================
// Taxonomy: Category Groups, Categories, Subcategories
// ============================================================
export type BusinessModel = 'ORDER_DELIVERY' | 'VISIT_ONLY' | 'BOOKING_VISIT';

export type CategoryGroupType = 'TOP_TILES' | 'MORE' | 'FEATURED' | 'SEASONAL';

export interface CategoryGroup {
  _id: string;
  name: string;
  slug: string;
  type: CategoryGroupType;
  displayOrder: number;
  description?: string;
  maxItems?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryGroupRequest {
  name: string;
  slug: string;
  type: CategoryGroupType;
  titles?: LocalizedText;
  displayOrder?: number;
  description?: string;
  maxItems?: number;
  isActive?: boolean;
}

export interface LocalizedText {
  [languageCode: string]: string;
}

export interface Category {
  _id: string;
  slug: string;
  name: string;
  titles: LocalizedText;
  descriptions?: LocalizedText;
  description?: string;
  iconKey?: string;
  iconUrl?: string;
  defaultGroupId?: string | CategoryGroup;
  defaultGroupType: CategoryGroupType;
  displayOrder: number;
  keywords?: string[];
  isActive: boolean;
  isShopping?: boolean;
  isService?: boolean;
  defaultRiskTier?: string;
  themeColor?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryRequest {
  name: string;
  slug: string;
  titles?: LocalizedText;
  descriptions?: LocalizedText;
  description?: string;
  iconKey?: string;
  iconUrl?: string;
  defaultGroupId?: string;
  defaultGroupType?: CategoryGroupType;
  displayOrder?: number;
  keywords?: string[];
  isActive?: boolean;
  isShopping?: boolean;
  isService?: boolean;
}

export interface Subcategory {
  _id: string;
  categoryId: string | { _id: string; name: string; slug: string };
  slug: string;
  name: string;
  titles: LocalizedText;
  displayOrder: number;
  isActive: boolean;
  templateId?: string | { _id: string; name: string; version?: number };
  synonyms: string[];
  riskTier?: 'LOW' | 'MEDIUM' | 'HIGH';
  businessModel?: BusinessModel;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubcategoryRequest {
  categoryId: string;
  name: string;
  slug: string;
  titles?: LocalizedText;
  displayOrder?: number;
  isActive?: boolean;
  templateId?: string;
  synonyms?: string[];
  riskTier?: 'LOW' | 'MEDIUM' | 'HIGH';
  businessModel?: BusinessModel;
}

export interface LocationCategoryConfig {
  _id: string;
  locationId: string;
  categoryId: string;
  isActive: boolean;
  orderOverride?: number;
  groupOverride?: string;
  isFeatured?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LocationSubcategoryConfig {
  _id: string;
  locationId: string;
  subcategoryId: string;
  isActive: boolean;
  orderOverride?: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertLocationCategoryConfigRequest {
  locationId: string;
  categoryId: string;
  isActive: boolean;
  orderOverride?: number;
  groupOverride?: string;
  isFeatured?: boolean;
}

export interface UpsertLocationSubcategoryConfigRequest {
  locationId: string;
  subcategoryId: string;
  isActive: boolean;
  orderOverride?: number;
}

// ============================================================
// Templates
// ============================================================
export type FieldType = 'TEXT' | 'TEXTAREA' | 'NUMBER' | 'BOOLEAN' | 'SELECT' | 'MULTISELECT' | 'MEDIA' | 'RANGE' | 'DATE' | 'TIME' | 'PHONE' | 'EMAIL' | 'URL' | 'PRICE' | 'DURATION';
export type FilterType = 'CHECKBOX' | 'RADIO' | 'RANGE_SLIDER' | 'MULTI_CHECKBOX' | 'TOGGLE';

export interface TemplateFieldOption {
  value: string;
  label: string;
  labels?: Record<string, string>;
  order?: number;
}

export interface TemplateFieldValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  patternMessage?: string;
  allowedMimeTypes?: string[];
  maxFileSize?: number;
  maxFiles?: number;
}

export interface TemplateField {
  key: string;
  label: string;
  labels?: Record<string, string>;
  placeholder?: string;
  helpText?: string;
  type: FieldType;
  required: boolean;
  isPublic: boolean;
  isFilter: boolean;
  filterType?: FilterType;
  defaultValue?: unknown;
  options?: TemplateFieldOption[];
  validation?: TemplateFieldValidation;
  order: number;
  section?: string;
}

export interface TemplateSection {
  key: string;
  title: string;
  titles?: Record<string, string>;
  order?: number;
  collapsible?: boolean;
}

export interface Template {
  _id: string;
  name: string;
  description?: string;
  version: number;
  isActive: boolean;
  previousVersionId?: string;
  fields: TemplateField[];
  sections?: TemplateSection[];
  createdBy?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  fields?: TemplateField[];
  sections?: TemplateSection[];
  metadata?: Record<string, unknown>;
}

export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  fields?: TemplateField[];
  sections?: TemplateSection[];
  metadata?: Record<string, unknown>;
}

// ============================================================
// Business
// ============================================================
export type BusinessStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'LIVE' | 'REJECTED' | 'SUSPENDED';
export type CacDocumentStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface BusinessContact {
  phone?: string;
  phone2?: string;
  email?: string;
  website?: string;
  whatsapp?: string;
  instagram?: string;
  facebook?: string;
  twitter?: string;
}

export interface BusinessAddress {
  street?: string;
  street2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  landmark?: string;
}

export interface BusinessMediaItem {
  url: string;
  type: 'IMAGE' | 'VIDEO';
  caption?: string;
  order: number;
  isPrimary: boolean;
}

export interface BusinessHoursEntry {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

// Populated reference types
export interface BusinessOwnerPopulated {
  _id: string;
  id?: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  phone?: string;
  avatarUrl?: string;
}

export interface BusinessLocationPopulated {
  _id: string;
  name: string;
  slug: string;
  type?: string;
}

export interface BusinessCategoryPopulated {
  _id: string;
  slug: string;
  name: string;
}

export interface BusinessSubcategoryPopulated {
  _id: string;
  slug: string;
  name: string;
}

export interface Business {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  tagline?: string;
  // IDs can come as strings or populated objects from API
  ownerId: string | BusinessOwnerPopulated;
  locationId: string | BusinessLocationPopulated;
  categoryId: string | BusinessCategoryPopulated;
  subcategoryId: string | BusinessSubcategoryPopulated;
  templateId?: string;
  templateVersion?: number;
  templateData?: Record<string, unknown>;
  categoryName?: string;
  subcategoryName?: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  status: BusinessStatus;
  type?: 'SHOPPING' | 'SERVICE' | 'BOTH';
  // Location
  address?: BusinessAddress | string;
  geoPoint?: { type: 'Point'; coordinates: [number, number] };
  coordinates?: { type: 'Point'; coordinates: [number, number] };
  // Contact & media
  contact?: BusinessContact;
  phone?: string;
  email?: string;
  hours?: BusinessHoursEntry[];
  timezone?: string;
  media?: BusinessMediaItem[] | string[];
  logoUrl?: string;
  coverImageUrl?: string;
  // Verification
  verificationLevel?: 'NONE' | 'BASIC' | 'ENHANCED' | 'FULL';
  isVerified?: boolean;
  verifiedAt?: string;
  // CAC
  cacDocumentUrl?: string;
  cacNumber?: string;
  cacDocumentStatus?: CacDocumentStatus;
  cacVerifiedAt?: string;
  cacRejectionReason?: string;
  // Ratings
  averageRating?: number;
  totalReviews?: number;
  rating?: number;
  reviewCount?: number;
  // Settings
  acceptsOrders?: boolean;
  acceptsBookings?: boolean;
  minimumOrderValue?: number;
  currency?: string;
  // Budget
  budgetMin?: number;
  budgetMax?: number;
  operationModes?: string[];
  // Merchant Agreement
  merchantAgreementAcceptedAt?: string;
  merchantAgreementVersion?: string;
  // Admin workflow
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  suspensionReason?: string;
  suspendedBy?: string;
  suspendedAt?: string;
  // Flags
  isFeatured?: boolean;
  featuredUntil?: string;
  isPromoted?: boolean;
  // Stats
  viewCount?: number;
  orderCount?: number;
  bookingCount?: number;
  // Claim fields
  isClaimed?: boolean;
  createdByAdminId?: string;
  claimCode?: string;
  claimContactPhone?: string;
  claimContactEmail?: string;
  claimedAt?: string;
  claimedBy?: string;
  // Merchant code
  merchantCode?: string;
  // Multi-branch
  parentBusinessId?: string | { _id: string; name: string; slug: string };
  isParent?: boolean;
  branchLabel?: string;
  catalogMode?: 'INHERIT' | 'INDEPENDENT' | 'MIXED';
  branchCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessApprovalAction {
  status: BusinessStatus;
  reason?: string;
}

export interface BusinessStats {
  total: number;
  draft: number;
  pendingReview: number;
  approved: number;
  live: number;
  rejected: number;
  suspended: number;
}

export interface PayoutStats {
  totalRequested: number;
  totalAmount: number;
  pendingCount: number;
  pendingAmount: number;
  completedCount: number;
  completedAmount: number;
  failedCount: number;
}

export interface CustomerStats {
  total: number;
  active: number;
  inactive: number;
  newThisMonth: number;
}

export interface VerifyCacRequest {
  status: 'VERIFIED' | 'REJECTED';
  rejectionReason?: string;
}

export interface AdminCreateBusinessRequest {
  name: string;
  locationId: string;
  categoryId: string;
  subcategoryId: string;
  longitude: number;
  latitude: number;
  description?: string;
  tagline?: string;
  address?: BusinessAddress;
  contact?: BusinessContact;
  logoUrl?: string;
  coverImageUrl?: string;
  media?: { url: string; type?: string; caption?: string; order?: number; isPrimary?: boolean }[];
  hours?: BusinessHoursEntry[];
  claimContactPhone?: string;
  claimContactEmail?: string;
}

// ============================================================
// Orders
// ============================================================
export type OrderStatus = 'PLACED' | 'ACCEPTED' | 'REJECTED' | 'PREPARING' | 'READY' | 'DISPATCHED' | 'PICKED_UP' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED';
export type FulfillmentType = 'DELIVERY' | 'PICKUP';

export interface Order {
  _id: string;
  orderNumber: string;
  // Populated by backend as objects
  userId: string | { _id: string; firstName?: string; lastName?: string; email?: string; phone?: string };
  customerId?: string;
  customerName?: string;
  businessId: string | { _id: string; name?: string; slug?: string; logoUrl?: string };
  businessName?: string;
  locationId: string | { _id: string; name?: string };
  status: OrderStatus;
  // Backend uses `type`, frontend uses `fulfillmentType` — support both
  type?: FulfillmentType;
  fulfillmentType?: FulfillmentType;
  items: OrderItem[];
  // Backend nests fees as object
  fees?: OrderFees;
  // Legacy flat fields
  subtotal?: number;
  deliveryFee?: number;
  platformFee?: number;
  discount?: number;
  total?: number;
  totalAmount?: number;
  currency: string;
  // Backend sends object, may also be string
  deliveryAddress?: string | OrderDeliveryAddress;
  deliveryQuoteId?: string;
  deliveryJobId?: string;
  // Backend uses `statusHistory`
  statusHistory?: StatusEvent[];
  // Backend uses `customerNote`
  customerNote?: string;
  notes?: string;
  cancellationReason?: string;
  rejectionReason?: string;
  paymentStatus?: string;
  estimatedPrepTime?: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrderFees {
  subtotal?: number;
  deliveryFee?: number;
  platformFee?: number;
  serviceFee?: number;
  tax?: number;
  discount?: number;
  tip?: number;
  total?: number;
}

export interface OrderDeliveryAddress {
  street?: string;
  street2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  contactName?: string;
  contactPhone?: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  // Backend uses basePrice, frontend used price
  basePrice?: number;
  price?: number;
  quantity: number;
  // Backend uses subtotal, frontend used total
  subtotal?: number;
  total?: number;
  options?: Record<string, string>;
  variations?: { name: string; option: string; priceAdjustment?: number }[];
  addOns?: { name: string; price: number; quantity: number; subtotal: number }[];
  specialInstructions?: string;
}

export interface StatusEvent {
  status: string;
  timestamp: string;
  actor?: string;
  updatedBy?: string;
  note?: string;
}

export interface OrderStats {
  total: number;
  totalRevenue: number;
  byStatus: Record<string, { count: number; revenue: number }>;
}

// ============================================================
// Delivery Jobs (Admin)
// ============================================================
export type DeliveryJobStatus = 'CREATED' | 'ASSIGNED' | 'RIDER_ACCEPTED' | 'RIDER_AT_PICKUP' | 'PICKED_UP' | 'IN_TRANSIT' | 'RIDER_AT_DROPOFF' | 'DELIVERED' | 'FAILED' | 'CANCELLED';
export type DeliveryProvider = 'MANUAL' | 'INTERNAL' | 'TOPSHIP' | 'GLOVO';

export interface DeliveryJob {
  _id: string;
  orderId?: string;
  bookingId?: string;
  businessId: string | { _id: string; name?: string; slug?: string };
  userId: string | { _id: string; firstName?: string; lastName?: string };
  locationId: string | { _id: string; name?: string };
  provider: DeliveryProvider;
  externalId?: string;
  pickup: { lat?: number; lng?: number; address: string; city?: string; state?: string; landmark?: string; contactName?: string; contactPhone?: string; instructions?: string };
  dropoff: { lat?: number; lng?: number; address: string; city?: string; state?: string; landmark?: string; contactName?: string; contactPhone?: string; instructions?: string };
  riderInfo?: { name: string; phone: string; vehicleType?: string; vehiclePlate?: string; photoUrl?: string; rating?: number };
  status: DeliveryJobStatus;
  statusTimeline?: StatusEvent[];
  distanceKm?: number;
  deliveryFee?: number;
  currency?: string;
  estimatedPickupAt?: string;
  estimatedDeliveryAt?: string;
  actualPickupAt?: string;
  actualDeliveryAt?: string;
  proofOfDeliveryUrl?: string;
  lastKnownLocation?: { lat: number; lng: number; updatedAt: string };
  failureReason?: string;
  cancellationReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryJobFilterParams extends PaginationParams {
  status?: DeliveryJobStatus;
  provider?: DeliveryProvider;
  locationId?: string;
  startDate?: string;
  endDate?: string;
}

export interface DeliveryStats {
  total: number;
  statusBreakdown: { _id: string; count: number }[];
}

// ============================================================
// Bookings
// ============================================================
export type BookingStatus = 'PENDING' | 'REQUESTED' | 'CONFIRMED' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
export type FulfillmentMode = 'ON_SITE' | 'AT_HOME';

export interface BookingFeeBreakdown {
  serviceFee: number;
  travelFee: number;
  platformFee: number;
  discount: number;
  deposit: number;
  tax: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
}

export interface Booking {
  _id: string;
  // Backend fields
  bookingRef?: string;
  bookingDate?: string;
  startTime?: string;
  endTime?: string;
  feeBreakdown?: BookingFeeBreakdown;
  statusTimeline?: StatusEvent[];
  serviceId?: string | { _id: string; name: string; slug?: string };
  serviceSnapshot?: { name: string; description?: string; pricingType?: string; basePrice?: number };
  isPaid?: boolean;
  // Legacy / computed fields (backward compat)
  bookingNumber?: string;
  userId: string | { _id: string; email?: string; firstName?: string; lastName?: string; fullName?: string };
  customerId?: string;
  customerName?: string;
  businessId: string | { _id: string; name: string; slug?: string };
  serviceListingId?: string;
  serviceName?: string;
  businessName?: string;
  locationId?: string | { _id: string; name: string };
  status: BookingStatus;
  fulfillmentMode: FulfillmentMode;
  scheduledAt?: string;
  duration?: number;
  durationMinutes?: number;
  timezone?: string;
  serviceFee?: number;
  travelFee?: number;
  platformFee?: number;
  total?: number;
  fees?: { label: string; amount: number }[];
  currency: string;
  address?: string;
  statusHistory?: StatusEvent[];
  safetyEvents?: StatusEvent[];
  safetyCheckIns?: unknown[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Disputes
// ============================================================
export type DisputeStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'ESCALATED' | 'CLOSED';
export type DisputeType = 'ORDER' | 'BOOKING';

export interface Dispute {
  _id: string;
  type: DisputeType;
  referenceId: string;
  userId: string;
  filedById?: string;
  filedByName?: string;
  businessId: string;
  againstId?: string;
  againstName?: string;
  locationId: string;
  status: DisputeStatus;
  reason: string;
  description: string;
  amount?: number;
  currency?: string;
  resolution?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  messages?: { sender: string; text: string; createdAt: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface DisputeResolutionRequest {
  status: DisputeStatus;
  resolution: string;
  refundAmount?: number;
}

// ============================================================
// Finance: Wallet, Payouts, Ledger
// ============================================================
export type PayoutStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'REJECTED' | 'FAILED' | 'CANCELLED';
export type LedgerType = 'CREDIT' | 'DEBIT';

export interface Wallet {
  _id: string;
  ownerId: string;
  ownerType: 'USER' | 'BUSINESS';
  balance: number;
  currency: string;
  locationId: string;
  status?: 'ACTIVE' | 'FROZEN' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
}

export interface LedgerEntry {
  _id: string;
  walletId: string;
  transactionRef?: string;
  type: LedgerType;
  direction: 'CREDIT' | 'DEBIT';
  amount: number;
  currency: string;
  referenceType: string;
  referenceId: string;
  description: string;
  balanceBefore: number;
  balanceAfter: number;
  status?: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';
  metadata?: Record<string, unknown>;
  locationId: string;
  createdAt: string;
}

export interface Payout {
  _id: string;
  businessId: string;
  locationId: string;
  amount: number;
  currency: string;
  status: PayoutStatus;
  method?: string;
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
    bankCode?: string;
  };
  processedBy?: string;
  processedAt?: string;
  reason?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayoutActionRequest {
  action: 'APPROVE' | 'DENY' | 'RETRY';
  reason?: string;
}

// ============================================================
// Fee Configuration
// ============================================================
export type FeeType = 'ORDER_PLATFORM_FEE' | 'BOOKING_PLATFORM_FEE' | 'PAYMENT_PROCESSING_FEE' | 'DELIVERY_PLATFORM_FEE';
export type FeeScope = 'GLOBAL' | 'LOCATION' | 'CATEGORY';

export interface FeeConfig {
  _id: string;
  feeType: FeeType;
  scope: FeeScope;
  locationId?: string | { _id: string; name: string };
  categoryId?: string | { _id: string; name: string };
  percentage: number;
  flatFee: number;
  minAmount: number;
  maxAmount: number;
  currency: string;
  isActive: boolean;
  effectiveFrom?: string;
  effectiveUntil?: string;
  description?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Audit Logs
// ============================================================
export interface AuditLog {
  _id: string;
  adminId: string;
  adminEmail: string;
  adminName?: string;
  adminRole?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  locationId?: string | { _id: string; name: string };
  details?: Record<string, unknown>;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  reason?: string;
  ipAddress?: string;
  createdAt: string;
}

// ============================================================
// Analytics
// ============================================================
export interface DashboardAnalytics {
  totalUsers: number;
  newUsers: number;
  totalBusinesses: number;
  liveBusinesses: number;
  pendingBusinesses: number;
  totalOrders: number;
  completedOrders: number;
  orderRevenue: number;
  totalBookings: number;
  completedBookings: number;
  bookingRevenue: number;
  totalDisputes: number;
  openDisputes: number;
  totalPayouts: number;
  payoutAmount: number;
  currency: string;
}

// ============================================================
// Media Upload
// ============================================================
export interface UploadResult {
  key: string;
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
}

// ============================================================
// Pagination & Query params
// ============================================================
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface LocationFilterParams extends PaginationParams {
  status?: LocationStatus;
  type?: LocationType;
  search?: string;
}

export interface BusinessFilterParams extends PaginationParams {
  locationId?: string;
  status?: BusinessStatus;
  categoryId?: string;
  search?: string;
}

export interface OrderFilterParams extends PaginationParams {
  locationId?: string;
  status?: OrderStatus;
  businessId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface BookingFilterParams extends PaginationParams {
  locationId?: string;
  status?: BookingStatus;
  businessId?: string;
  startDate?: string;
  endDate?: string;
  fulfillmentMode?: FulfillmentMode;
  search?: string;
}

export interface BookingStats {
  total: number;
  pending: number;
  confirmed: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  noShow: number;
  totalRevenue: number;
  totalPlatformFee: number;
}

export interface DisputeFilterParams extends PaginationParams {
  locationId?: string;
  status?: DisputeStatus;
  type?: DisputeType;
}

export interface PayoutFilterParams extends PaginationParams {
  locationId?: string;
  status?: PayoutStatus;
}

export interface AuditLogFilterParams extends PaginationParams {
  locationId?: string;
  adminId?: string;
  action?: string;
  resourceType?: string;
  resource?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

// ============================================================
// Customers (End-Users)
// ============================================================
export interface Customer {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  phone?: string;
  avatarUrl?: string;
  authProvider?: 'local' | 'google' | 'apple';
  isActive: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  lastLoginAt?: string;
  preferences?: {
    language?: string;
    currency?: string;
    notifications?: { email?: boolean; push?: boolean; sms?: boolean };
  };
  savedAddresses?: {
    label: string;
    address: string;
    city?: string;
    state?: string;
    isDefault: boolean;
  }[];
  emergencyContacts?: {
    name: string;
    relation: string;
    phone: string;
    email?: string;
  }[];
  favouriteBusinesses?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CustomerFilterParams extends PaginationParams {
  search?: string;
  isActive?: boolean;
}

// ============================================================
// Ad Campaigns
// ============================================================
export type AdType = 'FEATURED_LISTING' | 'SLIDESHOW_AD' | 'EXPLORE_REELS_AD' | 'PUSH_NOTIFICATION' | 'FEATURED_REVIEWS';
export type AdCampaignStatus = 'PENDING_REVIEW' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
export type AdPaymentStatus = 'PENDING' | 'PAID' | 'REFUNDED';
export type AdRateUnit = 'DAY' | 'NOTIFICATION';

export interface AdMedia {
  url: string;
  type?: 'IMAGE' | 'VIDEO';
}

export type AuthorType = 'BUSINESS' | 'CUSTOMER' | 'ADMIN';

export interface AdCampaign {
  _id: string;
  businessId?: string | { _id: string; name: string; slug: string; logoUrl?: string };
  type: AdType;
  name: string;
  status: AdCampaignStatus;
  duration?: number;
  media: AdMedia[];
  caption?: string;
  hashtags: string[];
  notificationMessage?: string;
  targetRadius?: number;
  ratePerUnit: number;
  rateUnit: AdRateUnit;
  totalCost: number;
  currency: string;
  paymentStatus: AdPaymentStatus;
  startDate?: string;
  endDate?: string;
  impressions: number;
  clicks: number;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  locationId?: string | { _id: string; name: string; slug: string };
  reviewIds?: string[];
  // Organic reel fields
  isOrganic?: boolean;
  authorType?: AuthorType;
  userId?: string | { _id: string; firstName: string; lastName: string; avatarUrl?: string };
  adminId?: string | { _id: string; firstName: string; lastName: string };
  // Engagement
  likesCount?: number;
  commentsCount?: number;
  bookmarksCount?: number;
  sharesCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdCampaignStats {
  total: number;
  pendingReview: number;
  active: number;
  completed: number;
  rejected: number;
  totalRevenue: number;
  totalImpressions: number;
  totalClicks: number;
}

export interface AdCampaignFilterParams extends PaginationParams {
  status?: AdCampaignStatus;
  type?: AdType;
  businessId?: string;
  locationId?: string;
  search?: string;
  isOrganic?: boolean;
  authorType?: AuthorType;
}

// ============================================================
// Promos
// ============================================================
export interface Promo {
  _id: string;
  title: string;
  description?: string;
  imageUrl: string;
  linkType: 'BUSINESS' | 'EXTERNAL' | 'IN_APP';
  businessId?: string | { _id: string; name: string; slug: string; logoUrl?: string };
  externalUrl?: string;
  screenRoute?: string;
  locationId?: string | { _id: string; name: string };
  isActive: boolean;
  displayOrder: number;
  startDate?: string;
  endDate?: string;
  impressions: number;
  clicks: number;
  createdAt: string;
  updatedAt: string;
}

export interface PromoFilterParams extends PaginationParams {
  isActive?: boolean;
  locationId?: string;
  search?: string;
}

// ============================================================
// Legal Documents
// ============================================================
export type LegalDocumentType = 'MERCHANT_AGREEMENT' | 'TERMS_OF_SERVICE' | 'PRIVACY_POLICY';

export interface LegalSection {
  number: string;
  title: string;
  items: string[];
}

export interface LegalDocument {
  _id: string;
  type: LegalDocumentType;
  title: string;
  sections: LegalSection[];
  version: string;
  isActive: boolean;
  publishedAt?: string;
  changelog?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LegalDocumentFilterParams extends PaginationParams {
  type?: LegalDocumentType;
  isActive?: string;
  search?: string;
}

// ============================================================
// Ad Products
// ============================================================
export interface AdProduct {
  _id: string;
  type: AdType;
  name: string;
  description: string;
  bulletPoints: string[];
  icon: string;
  ratePerUnit: number;
  rateUnit: AdRateUnit;
  currency: string;
  requiresMedia: boolean;
  requiresDuration: boolean;
  requiresMessage: boolean;
  requiresRadius: boolean;
  minDuration?: number;
  maxDuration?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Admin Notifications
// ============================================================
export type AdminNotificationType =
  | 'ADMIN_BUSINESS_PENDING'
  | 'ADMIN_DISPUTE_FILED'
  | 'ADMIN_PAYOUT_REQUESTED'
  | 'ADMIN_EMERGENCY_SOS';

export interface AdminNotification {
  _id: string;
  recipientId: string;
  recipientType: 'ADMIN';
  type: AdminNotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  isRead: boolean;
  readAt?: string;
  pushSent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminNotificationListResponse {
  items: AdminNotification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================
// Broadcast Notifications
// ============================================================
export type BroadcastTargetAudience = 'ALL' | 'USERS' | 'BUSINESS_OWNERS';
export type BroadcastStatus = 'PENDING' | 'SENDING' | 'COMPLETED' | 'FAILED';

export interface BroadcastNotification {
  _id: string;
  title: string;
  body: string;
  targetAudience: BroadcastTargetAudience;
  locationIds: string[];
  sentBy: string | { _id: string; firstName?: string; lastName?: string };
  totalRecipients: number;
  totalPushSent: number;
  totalFailed: number;
  status: BroadcastStatus;
  data?: Record<string, unknown>;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BroadcastNotificationRequest {
  title: string;
  body: string;
  targetAudience: BroadcastTargetAudience;
  locationIds?: string[];
  data?: Record<string, unknown>;
}

export interface BroadcastHistoryResponse {
  items: BroadcastNotification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================
// Emergency Alerts
// ============================================================
export type EmergencyAlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'FALSE_ALARM';

export interface EmergencyAlert {
  _id: string;
  userId: string | { _id: string; firstName?: string; lastName?: string; email?: string; phone?: string; avatarUrl?: string };
  location: { type: 'Point'; coordinates: [number, number] }; // [lng, lat]
  status: EmergencyAlertStatus;
  contactInfo: { name: string; phone?: string; email?: string };
  emergencyContacts: { name: string; relation: string; phone: string; email?: string }[];
  locationId?: string | { _id: string; name: string };
  message?: string;
  acknowledgedBy?: string | { _id: string; firstName?: string; lastName?: string };
  acknowledgedAt?: string;
  resolvedBy?: string | { _id: string; firstName?: string; lastName?: string };
  resolvedAt?: string;
  notes?: string;
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmergencyAlertStats {
  total: number;
  active: number;
  acknowledged: number;
  resolved: number;
  falseAlarm: number;
}

export interface EmergencyAlertFilterParams extends PaginationParams {
  status?: EmergencyAlertStatus;
  locationId?: string;
}

export interface UpdateEmergencyAlertRequest {
  status: EmergencyAlertStatus;
  notes?: string;
}

// ============================================================
// Products
// ============================================================
export type ProductStatus = 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK' | 'DISCONTINUED';

export interface ProductImage {
  url: string;
  alt?: string;
  order: number;
  isPrimary: boolean;
}

export interface ProductVariationOption {
  name: string;
  priceAdjustment: number;
  isAvailable: boolean;
  sku?: string;
}

export interface ProductVariation {
  name: string;
  type: 'SINGLE' | 'MULTIPLE';
  required: boolean;
  options: ProductVariationOption[];
  order: number;
}

export interface ProductAddOn {
  name: string;
  price: number;
  isAvailable: boolean;
  maxQuantity: number;
  order: number;
}

export interface ProductNutritionalInfo {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  allergens?: string[];
}

export interface Product {
  _id: string;
  businessId: string;
  locationId: string;
  name: string;
  description?: string;
  basePrice: number;
  compareAtPrice?: number;
  currency: string;
  sku?: string;
  barcode?: string;
  category?: string;
  status: ProductStatus;
  variations: ProductVariation[];
  addOns: ProductAddOn[];
  images: ProductImage[];
  trackInventory: boolean;
  stockQuantity: number;
  allowBackorder: boolean;
  isAvailable: boolean;
  availableDays?: number[];
  availableFrom?: string;
  availableTo?: string;
  prepTimeMinutes?: number;
  tags: string[];
  nutritionalInfo?: ProductNutritionalInfo;
  displayOrder: number;
  isFeatured: boolean;
  orderCount: number;
  viewCount: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ProductFilterParams extends PaginationParams {
  businessId?: string;
  search?: string;
  category?: string;
  status?: ProductStatus;
  isAvailable?: boolean;
  isFeatured?: boolean;
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  basePrice?: number;
  compareAtPrice?: number;
  category?: string;
  status?: ProductStatus;
  isAvailable?: boolean;
  isFeatured?: boolean;
  stockQuantity?: number;
  tags?: string[];
}

// ============================================================
// Service Listings
// ============================================================
export type ServiceStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type PricingType = 'FIXED' | 'STARTS_FROM' | 'QUOTE_REQUIRED';
export type ServiceFulfillmentMode = 'ON_SITE' | 'AT_HOME' | 'BOTH';

export interface ServicePricing {
  type: PricingType;
  basePrice?: number;
  currency: string;
  displayText?: string;
  depositPercent: number;
}

export interface ServiceDuration {
  minutes: number;
  isFlexible: boolean;
  minMinutes?: number;
  maxMinutes?: number;
}

export interface ServiceMedia {
  url: string;
  type: 'IMAGE' | 'VIDEO';
  caption?: string;
  order: number;
}

export interface ServiceAvailabilitySlot {
  dayOfWeek: number;
  slots: string[];
  isAvailable: boolean;
  capacityPerSlot: number;
}

export interface ServiceCancellationPolicy {
  freeCancellationHours?: number;
  cancellationFeePercent?: number;
}

export interface ServiceListing {
  _id: string;
  businessId: string;
  locationId: string;
  categoryId: string | { _id: string; name: string; slug: string };
  subcategoryId?: string;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  category?: string;
  pricing: ServicePricing;
  duration: ServiceDuration;
  fulfillmentMode: ServiceFulfillmentMode;
  status: ServiceStatus;
  media: ServiceMedia[];
  coverImageUrl?: string;
  availability: ServiceAvailabilitySlot[];
  useBusinessHours: boolean;
  cancellationPolicy?: ServiceCancellationPolicy;
  requirements: string[];
  includes: string[];
  excludes: string[];
  tags: string[];
  templateData?: Record<string, unknown>;
  averageRating: number;
  totalReviews: number;
  totalBookings: number;
  viewCount: number;
  isFeatured: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceFilterParams extends PaginationParams {
  businessId?: string;
  locationId?: string;
  categoryId?: string;
  status?: ServiceStatus;
  fulfillmentMode?: ServiceFulfillmentMode;
  search?: string;
}

export interface UpdateServiceRequest {
  name?: string;
  description?: string;
  pricing?: Partial<ServicePricing>;
  duration?: Partial<ServiceDuration>;
  fulfillmentMode?: ServiceFulfillmentMode;
  status?: ServiceStatus;
  isFeatured?: boolean;
}
