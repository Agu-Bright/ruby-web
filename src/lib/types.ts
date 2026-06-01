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

export interface CustomFieldOption {
  value: string;
  label: string;
  order?: number;
}

export interface CustomFieldValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
}

export interface CustomField {
  key: string;
  label: string;
  type: 'TEXT' | 'TEXTAREA' | 'NUMBER' | 'BOOLEAN' | 'SELECT' | 'MULTISELECT';
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  order?: number;
  options?: CustomFieldOption[];
  validation?: CustomFieldValidation;
}

export interface Subcategory {
  _id: string;
  categoryId: string | { _id: string; name: string; slug: string };
  slug: string;
  name: string;
  titles: LocalizedText;
  iconKey?: string;
  iconUrl?: string;
  displayOrder: number;
  isActive: boolean;
  featureOnHome?: boolean;
  templateId?: string | { _id: string; name: string; version?: number };
  synonyms: string[];
  riskTier?: 'LOW' | 'MEDIUM' | 'HIGH';
  businessModel?: BusinessModel;
  productFields?: CustomField[];
  serviceFields?: CustomField[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubcategoryRequest {
  categoryId: string;
  name: string;
  slug: string;
  titles?: LocalizedText;
  iconKey?: string;
  iconUrl?: string;
  displayOrder?: number;
  isActive?: boolean;
  featureOnHome?: boolean;
  templateId?: string;
  synonyms?: string[];
  riskTier?: 'LOW' | 'MEDIUM' | 'HIGH';
  businessModel?: BusinessModel;
  productFields?: CustomField[];
  serviceFields?: CustomField[];
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
  // Pandago / Glovo outlet registration
  pandagoOutlet?: {
    status: 'NOT_REGISTERED' | 'PENDING' | 'ACTIVE' | 'FAILED' | 'STALE';
    isLegacy: boolean;
    registeredAt?: string;
    registeredCoordinates?: { lat: number; lng: number };
    lastAttemptAt?: string;
    lastError?: string;
    attemptCount: number;
  };
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
// Home sections (admin-managed customer-app home layout)
// ============================================================
export type HomeSectionType =
  | 'REVIEWS'
  | 'WHATS_HOT'
  | 'CATEGORY'
  | 'CURATED'
  // Phase 40 — "Events near you" admin-controllable section. Backend
  // hydrates items from the public events feed.
  | 'EVENTS';

export interface HomeSection {
  _id: string;
  type: HomeSectionType;
  title: string;
  subtitle?: string;
  /** Populated as { _id, name, slug, iconKey } when set. Only meaningful for CATEGORY rows. */
  categoryId?: string | { _id: string; name: string; slug: string; iconKey?: string };
  /**
   * Optional subcategory drill-down for CATEGORY rows (e.g. only "Plumbers"
   * within Home Services). Populated as { _id, name, slug } when set.
   */
  subcategoryId?: string | { _id: string; name: string; slug: string };
  /** Curated business IDs (CURATED only). Order is significant — preserved at render time. */
  businessIds?: string[];
  /** Populated as { _id, name, slug } when set. Null = global. */
  locationId?: string | { _id: string; name: string; slug: string };
  displayOrder: number;
  isActive: boolean;
  bannerUrl?: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHomeSectionRequest {
  /**
   * Admin-creatable section types. Backend rejects creation of REVIEWS and
   * WHATS_HOT (those are seed-only). Per-type required fields are
   * enforced server-side:
   *  - CURATED  → businessIds required
   *  - CATEGORY → categoryId required (subcategoryId optional drill-down)
   */
  type: 'CURATED' | 'CATEGORY';
  title: string;
  subtitle?: string;
  businessIds?: string[];
  categoryId?: string;
  subcategoryId?: string;
  locationId?: string;
  displayOrder?: number;
  isActive?: boolean;
  bannerUrl?: string;
}

export interface UpdateHomeSectionRequest {
  title?: string;
  subtitle?: string;
  categoryId?: string;
  /** Pass `null` to clear an existing subcategory drill-down. The
   *  backend service treats null OR a valid ObjectId; empty string
   *  was previously used but trips the DTO's IsMongoId validator. */
  subcategoryId?: string | null;
  businessIds?: string[];
  locationId?: string | null;
  displayOrder?: number;
  isActive?: boolean;
  bannerUrl?: string;
}

export interface ReorderHomeSectionsRequest {
  items: Array<{ id: string; displayOrder: number }>;
}

/** Public feed shape returned by GET /public/home-sections. */
export interface HomeSectionFeedItem {
  _id: string;
  type: HomeSectionType;
  title: string;
  subtitle?: string;
  bannerUrl?: string;
  categoryId?: { _id: string; name: string; slug: string; iconKey?: string };
  locationId?: { _id: string; name: string; slug: string };
  /** First ~10 items hydrated inline (Business or Review shape depending on type). */
  items: any[];
  hasMore: boolean;
}

// ============================================================
// Auto-payouts (direct-to-merchant settlement)
// ============================================================
export type AutoPayoutSourceType = 'ORDER' | 'BOOKING' | 'QR_PAYMENT';
export type AutoPayoutStatus =
  | 'QUEUED'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED_TRANSIENT'
  | 'FAILED_PERMANENT'
  | 'DEFERRED_NEGATIVE_BALANCE';

/**
 * Backend `list()` populates `businessId` as a sub-document. Older
 * code paths or rows from the queued table may still surface it as a
 * raw ObjectId string, so the type allows both forms.
 */
export type AutoPayoutBusiness =
  | string
  | { _id: string; name?: string; slug?: string; logoUrl?: string };

export interface AutoPayout {
  _id: string;
  sourceType: AutoPayoutSourceType;
  sourceId: string;
  businessId: AutoPayoutBusiness;
  walletId: string;
  bankAccountId?: string;
  earnedAmount: number;
  transferAmount: number;
  currency: string;
  status: AutoPayoutStatus;
  providerTransferCode?: string;
  providerReference?: string;
  lastError?: string;
  attemptCount: number;
  lastAttemptAt?: string;
  nextRetryAt?: string;
  completedAt?: string;
  walletBalanceBefore?: number;
  walletBalanceAfter?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Detail-view response for the dashboard drill-down modal. Includes the
 * resolved bank-account snapshot at processing time and a brief reference
 * to the source booking/order for navigation.
 */
export interface AutoPayoutDetail {
  payout: AutoPayout;
  bank: {
    _id: string;
    accountName?: string;
    accountNumber?: string;
    accountNumberLast4?: string;
    bankName?: string;
    bankCode?: string;
    status?: string;
    isPrimary?: boolean;
    providerRecipientCode?: string;
  } | null;
  source: {
    type: AutoPayoutSourceType;
    ref?: string;
    status?: string;
  } | null;
}

export interface AutoPayoutStats {
  queued: number;
  processing: number;
  /** Rows in PROCESSING for >5 min — likely stuck */
  stuckProcessing: number;
  succeededToday: number;
  failedToday: number;
  /** Total FAILED_PERMANENT rows ever — money waiting on ops attention */
  failedPermanent: number;
  deferred: number;
  /** Sum of transferAmount for SUCCEEDED rows today (NGN) */
  amountSucceededToday: number;
  /** Sum of earnedAmount for FAILED_PERMANENT rows (NGN) */
  amountStuckPermanent: number;
  /** Sum of earnedAmount for DEFERRED_NEGATIVE_BALANCE rows (NGN) */
  amountInDeferred: number;
}

export interface SwitchoverSweepResult {
  scanned: number;
  succeeded: number;
  failed: number;
  skipped: number;
  errors: Array<{ businessId: string; businessName?: string; reason: string }>;
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
  /** @deprecated — legacy placeholder, always 0. Use `vat` instead. */
  tax?: number;
  /** Phase 16: VAT (7.5%) on Ruby+ platform fees. */
  vat?: number;
  /** Snapshot of the VAT rate applied (%). */
  vatRate?: number;
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
  /** @deprecated — legacy placeholder, always 0. Use `vat` instead. */
  tax: number;
  /** Phase 16: VAT (7.5%) on the booking's platformFee. */
  vat?: number;
  /** Snapshot of the VAT rate applied (%). */
  vatRate?: number;
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
export type DisputeStatus =
  | 'OPEN'
  | 'UNDER_REVIEW'
  | 'AWAITING_RESPONSE'
  | 'RESOLVED'
  | 'ESCALATED'
  | 'CLOSED';

export type DisputeType =
  | 'ORDER'
  | 'BOOKING'
  | 'PAYMENT'
  | 'PAYOUT'
  | 'WALLET'
  | 'DELIVERY'
  | 'RIDE'
  | 'AD'
  | 'GENERAL';

export interface DisputeMessage {
  _id?: string;
  senderId: string;
  senderRole?: 'CUSTOMER' | 'BUSINESS' | 'ADMIN';
  /** @deprecated — older documents use `sender`/`text`. Keep for compat. */
  sender?: string;
  message?: string;
  /** @deprecated — older documents use `text`. */
  text?: string;
  attachments?: string[];
  isInternal?: boolean;
  createdAt: string;
}

export interface Dispute {
  _id: string;
  disputeRef?: string;
  type: DisputeType;
  // Legacy FKs
  orderId?: string | { _id: string; orderNumber?: string };
  bookingId?: string | { _id: string; bookingRef?: string };
  // Generic reference
  referenceId?: string;
  referenceLabel?: string;
  transactionRef?: string;
  referenceAmount?: number;
  isAdminOnly?: boolean;
  userId: string | { _id: string; firstName?: string; lastName?: string; email?: string };
  filedById?: string;
  filedByName?: string;
  filedByRole?: 'CUSTOMER' | 'BUSINESS';
  businessId?: string | { _id: string; name?: string };
  againstId?: string;
  againstName?: string;
  locationId?: string;
  status: DisputeStatus;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  reason: string;
  description: string;
  /** @deprecated — prefer `disputedAmount` / `referenceAmount`. */
  amount?: number;
  disputedAmount?: number;
  currency?: string;
  resolution?: string;
  resolutionNotes?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  messages?: DisputeMessage[];
  assignedTo?: string;
  assignedAt?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Resolution outcome enum — mirrors the backend `DisputeResolution`
 * enum in `dispute.schema.ts`. The 8 values cover every way ops can
 * close a ticket: financial (refund / credit / replacement), neutral
 * (no_action), and judgement-based (business_favor / customer_favor /
 * mutual_agreement).
 */
export type DisputeResolution =
  | 'FULL_REFUND'
  | 'PARTIAL_REFUND'
  | 'REPLACEMENT'
  | 'CREDIT_ISSUED'
  | 'NO_ACTION'
  | 'BUSINESS_FAVOR'
  | 'CUSTOMER_FAVOR'
  | 'MUTUAL_AGREEMENT';

/**
 * Body for `POST /admin/disputes/:id/resolve`. Keep field names + types
 * in sync with the backend `ResolveDisputeDto` — the API uses
 * `whitelist: true`, so any extra keys you send will be silently
 * stripped (or rejected, depending on the ValidationPipe config).
 *
 * NOTE: there used to be a `status` field here that conflated resolve
 * with escalate/close — but those have their own dedicated endpoints
 * (`/escalate`, `/close`). The resolve endpoint is for the 8 resolution
 * outcomes only.
 */
export interface DisputeResolutionRequest {
  resolution: DisputeResolution;
  resolutionNotes: string;
  refundAmount?: number;
}

export interface AddDisputeMessageRequest {
  message: string;
  attachments?: string[];
  isInternal?: boolean;
}

// ============================================================
// Dispute notification recipients (Phase 14)
// ============================================================
/**
 * Which lifecycle event a recipient is subscribed to. Mirrors the
 * `events` sub-object on the backend `DisputeNotificationRecipient`
 * schema — keep keys in sync verbatim.
 */
export type DisputeNotificationEvent =
  | 'filed'
  | 'messageAdded'
  | 'statusChanged'
  | 'resolved';

/** Display labels for the 4 events, in the order admins typically read them. */
export const DISPUTE_NOTIFICATION_EVENT_LABELS: Record<
  DisputeNotificationEvent,
  string
> = {
  filed: 'New dispute filed',
  messageAdded: 'New message added',
  statusChanged: 'Status changed',
  resolved: 'Resolved',
};

export interface DisputeNotificationRecipient {
  _id: string;
  email: string;
  label?: string;
  isActive: boolean;
  events: Record<DisputeNotificationEvent, boolean>;
  createdByAdminId?: string;
  updatedByAdminId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDisputeRecipientRequest {
  email: string;
  label?: string;
  /** Partial — any omitted flag defaults to true server-side. */
  events?: Partial<Record<DisputeNotificationEvent, boolean>>;
}

export interface UpdateDisputeRecipientRequest {
  label?: string;
  isActive?: boolean;
  /** Partial — only provided flags are updated server-side. */
  events?: Partial<Record<DisputeNotificationEvent, boolean>>;
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

export interface AppVersion {
  _id: string;
  app: 'BUSINESS' | 'CUSTOMER';
  platform: 'IOS' | 'ANDROID';
  minVersion: string;
  latestVersion?: string;
  storeUrl?: string;
  forceUpdate: boolean;
  updateMessage?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PayoutActionRequest {
  action: 'APPROVE' | 'DENY' | 'RETRY';
  reason?: string;
}

// ============================================================
// Fee Configuration
// ============================================================
export type FeeType =
  | 'ORDER_PLATFORM_FEE'
  | 'BOOKING_PLATFORM_FEE'
  | 'PAYMENT_PROCESSING_FEE'
  | 'DELIVERY_PLATFORM_FEE'
  | 'PLATFORM_DISCOUNT'
  // Phase 16: Nigerian VAT (7.5%) on Ruby+ platform fees
  | 'VAT'
  // Phase 40: Ruby+ commission on event ticket sales
  | 'EVENT_TICKET_PLATFORM_FEE';

// ============================================================
// VAT report (Phase 16)
// ============================================================
export interface VatReportRow {
  type: 'ORDER' | 'BOOKING' | 'EVENT_TICKET';
  count: number;
  collected: number;
  refunded: number;
  net: number;
}

export interface VatReport {
  totalCollected: number;
  totalRefunded: number;
  netVat: number;
  currency: string;
  transactionCount: number;
  byType: VatReportRow[];
  startDate: string;
  endDate: string;
  locationId: string | null;
}

export interface FeeConfig {
  _id: string;
  name: string;
  scope: 'GLOBAL' | 'LOCATION' | 'CATEGORY';
  locationId?: string;
  categoryId?: string;
  platformFeePercent: number;
  deliveryFeeConfig?: {
    mode: 'FLAT' | 'DISTANCE_BASED' | 'PROVIDER_QUOTE';
    flatFee?: number;
    baseFee?: number;
    perKmFee?: number;
  };
  servicePlatformFeePercent?: number;
  currency?: string;
  // Flat/simple fee shape used by the admin Finance page (per-feeType rows)
  feeType?: FeeType;
  flatFee?: number;
  percentage?: number;
  isActive: boolean;
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
  // Phase 44 — filter to a single owner. Used by the admin customers
  // page when an admin clicks "View businesses" on a customer who owns
  // multiple, AND by the new ?ownerId= URL param on the businesses page.
  ownerId?: string;
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
  // Phase 44 — surfaced from the customers list / detail endpoints via
  // a $lookup against the businesses collection. Lets the admin
  // identify customers who are ALSO business owners at-a-glance and
  // jump straight to their business detail from a customer row.
  hasBusiness?: boolean;
  businessCount?: number;
  /**
   * The owner's "primary" business — parent if they own a multi-branch
   * brand, else the most recently created. Used to deep-link the row's
   * "Business owner" badge into the right business detail modal.
   */
  primaryBusiness?: SlimBusiness;
  /** All businesses this customer owns. Populated on both the list and
   *  detail responses so the Businesses tab in the detail modal renders
   *  without a second round-trip. */
  ownedBusinesses?: SlimBusiness[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Phase 44 — slim projection of a Business returned alongside Customer
 * records. Only the fields the customers page needs to render the badge
 * + Businesses tab. Full Business detail still fetched separately when
 * the admin opens a business in the businesses page modal.
 */
export interface SlimBusiness {
  _id: string;
  name: string;
  slug?: string;
  logoUrl?: string;
  status?: string;
  isParent?: boolean;
  parentBusinessId?: string;
  branchLabel?: string;
  locationId?: string | { _id: string; name?: string };
  createdAt?: string;
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

export interface AdCampaign {
  _id: string;
  businessId: string | { _id: string; name: string; slug: string; logoUrl?: string };
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
  isOrganic?: boolean;
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

/**
 * One photo OR one video attached to a broadcast. Stored on the
 * broadcast doc and on each recipient's in-app notification so the
 * mobile feed can render it inline. URLs point at our own R2 bucket
 * (uploaded via `POST /admin/media/upload`).
 */
export interface BroadcastAttachment {
  url: string;
  type: 'image' | 'video';
  mimeType?: string;
  fileName?: string;
  sizeBytes?: number;
  thumbnailUrl?: string;
}

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
  attachment?: BroadcastAttachment;
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
  // Optional — single photo OR single video. Build the object after
  // uploading the file to `/admin/media/upload` so this carries a URL.
  attachment?: BroadcastAttachment;
}

/**
 * Dry-run audience preview — `GET /admin/notifications/broadcast/preview`.
 * Returns how many users/devices a real send would actually reach,
 * without sending anything. Surfaced near the Send button so admins
 * can spot empty-audience problems before clicking.
 */
export interface BroadcastPreviewResponse {
  recipientCount: number;
  activeDeviceTokenCount: number;
  audienceBreakdown: {
    users: number;
    businessOwners: number;
  };
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

// ─────────────────────────────────────────────────────────────────────
// Marketers / referral codes
// ─────────────────────────────────────────────────────────────────────

export type MarketerType = 'INFLUENCER' | 'MARKETER' | 'PARTNER';
export type MarketerStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface Marketer {
  _id: string;
  name: string;
  email: string;
  phone: string;
  type: MarketerType;
  status: MarketerStatus;
  customerCommission: number;
  businessCommission: number;
  bankAccountId?: string;
  walletId?: string;
  totalCustomerSignups: number;
  totalBusinessSignups: number;
  totalCustomerActivations: number;
  totalBusinessActivations: number;
  totalCommissionEarned: number;
  totalCommissionPaid: number;
  notes?: string;
  /**
   * Opaque token used to share a read-only public stats URL with the
   * marketer (`/m/:viewToken`). Regenerate to revoke a leaked link.
   */
  viewToken: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Slim, privacy-preserving snapshot returned by
 * `GET /public/marketers/by-token/:token`. Powers the public marketer
 * stats page; never includes referred-user PII or internal IDs.
 */
export interface PublicMarketerView {
  marketer: {
    name: string;
    type: MarketerType;
    status: MarketerStatus;
    totalCustomerSignups: number;
    totalCustomerActivations: number;
    totalBusinessSignups: number;
    totalBusinessActivations: number;
    totalCommissionEarned: number;
    totalCommissionPaid: number;
    memberSince: string;
  };
  codes: Array<{
    code: string;
    type: ReferralCodeType;
    status: ReferralCodeStatus;
    usesCount: number;
    maxUses?: number;
    campaignTag?: string;
    expiresAt?: string;
  }>;
  recentAttributions: Array<{
    type: 'CUSTOMER' | 'BUSINESS';
    status: ReferralAttributionStatus;
    referredAt: string;
    activatedAt?: string;
    commissionAmount: number;
  }>;
}

export type ReferralCodeType = 'CUSTOMER' | 'BUSINESS' | 'BOTH';
export type ReferralCodeStatus = 'ACTIVE' | 'DISABLED' | 'EXPIRED';

export interface ReferralCode {
  _id: string;
  code: string;
  marketerId: string;
  type: ReferralCodeType;
  status: ReferralCodeStatus;
  expiresAt?: string;
  maxUses?: number;
  usesCount: number;
  customCustomerCommission?: number;
  customBusinessCommission?: number;
  campaignTag?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type ReferralAttributionType = 'CUSTOMER' | 'BUSINESS';
export type ReferralAttributionStatus =
  | 'PENDING'
  | 'COMMISSION_OWED'
  | 'PAID'
  | 'VOIDED';

export interface ReferralAttribution {
  _id: string;
  codeId: string | { _id: string; code: string; campaignTag?: string };
  marketerId: string;
  referredUserId:
    | string
    | { _id: string; firstName?: string; lastName?: string; email?: string; phone?: string };
  referredBusinessId?: string | { _id: string; name: string; slug?: string };
  type: ReferralAttributionType;
  status: ReferralAttributionStatus;
  referredAt: string;
  activatedAt?: string;
  commissionAmount: number;
  commissionPaidAt?: string;
  commissionLedgerEntryId?: string;
  signupIp?: string;
  signupUserAgent?: string;
  voidReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMarketerRequest {
  name: string;
  email: string;
  phone: string;
  type?: MarketerType;
  customerCommission?: number;
  businessCommission?: number;
  notes?: string;
}

export interface UpdateMarketerRequest {
  name?: string;
  phone?: string;
  type?: MarketerType;
  status?: MarketerStatus;
  customerCommission?: number;
  businessCommission?: number;
  bankAccountId?: string;
  notes?: string;
}

export interface GenerateCodeRequest {
  code?: string; // optional vanity
  type?: ReferralCodeType;
  expiresAt?: string;
  maxUses?: number;
  customCustomerCommission?: number;
  customBusinessCommission?: number;
  campaignTag?: string;
  notes?: string;
}

export interface UpdateCodeRequest {
  status?: 'ACTIVE' | 'DISABLED';
  expiresAt?: string;
  maxUses?: number;
  customCustomerCommission?: number;
  customBusinessCommission?: number;
  campaignTag?: string;
  notes?: string;
}

export interface MarketerFilterParams {
  page?: number;
  limit?: number;
  status?: MarketerStatus;
  type?: MarketerType;
  search?: string;
}

export interface AttributionFilterParams {
  page?: number;
  limit?: number;
  status?: ReferralAttributionStatus;
  type?: ReferralAttributionType;
}

// ============================================================
// Events (Phase 6 ticketing). Mirrors backend
// ruby-plus-backend/src/modules/events/schemas/*.
// ============================================================

// Phase 40: PENDING_REVIEW + REJECTED added for the business-side approval
// workflow. Admin-created events skip PENDING_REVIEW and go straight from
// DRAFT → PUBLISHED via the admin direct-publish endpoint.
export type EventStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "REJECTED"
  | "PUBLISHED"
  | "SOLD_OUT"
  | "CANCELLED"
  | "COMPLETED";

export interface EventTicketTier {
  name: string;
  description?: string;
  priceNgn: number;
  quantityAvailable: number;
  quantitySold: number;
  perks: string[];
  /** Phase 66 — optional per-tier image; shown on the customer's tier
   *  picker + buy review + ticket detail. */
  imageUrl?: string;
}

export interface RubyEvent {
  _id: string;
  title: string;
  description: string;
  /** Populated by /admin/events when an organiser is set. */
  organizerBusinessId?:
    | string
    | { _id: string; name: string; slug: string; logoUrl?: string };
  venueName: string;
  venueAddress: string;
  locationId:
    | string
    | { _id: string; name: string; slug: string };
  geoPoint?: { type: "Point"; coordinates: [number, number] };
  startsAt: string;
  endsAt: string;
  coverImageUrl: string;
  galleryUrls: string[];
  ticketTiers: EventTicketTier[];
  status: EventStatus;
  askRubyTags: string[];
  // Phase 40 — approval workflow fields. Set when an event passes through
  // the admin queue. Always present for business-created events; null/undefined
  // for admin-direct-published events.
  submittedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  createdByBusinessOwnerId?:
    | string
    | { _id: string; firstName?: string; lastName?: string; email?: string };
  // Phase 42 — popularity signals from the events map. Returned by the
  // public + admin endpoints.
  viewCount?: number;
  interestedCount?: number;
  lastViewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Phase 40 — Notification recipient shape exposed by
// /admin/events/notification-recipients. Mirrors the dispute pattern.
export interface EventNotificationRecipient {
  _id: string;
  email: string;
  label?: string;
  isActive: boolean;
  events: {
    submitted: boolean;
    approved: boolean;
    rejected: boolean;
    salesMilestone: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventRecipientRequest {
  email: string;
  label?: string;
  events?: Partial<EventNotificationRecipient["events"]>;
}

export interface UpdateEventRecipientRequest {
  label?: string;
  isActive?: boolean;
  events?: Partial<EventNotificationRecipient["events"]>;
}

// Phase 40 P7 — analytics shapes
export interface EventAnalytics {
  event: { id: string; title: string; status: string; startsAt: string };
  sales: {
    totalTicketsSold: number;
    totalRevenueNgn: number;
    totalFeesNgn: number;
    totalVatNgn: number;
    netToOrganizerNgn: number;
    scannedCount: number;
    refundedCount: number;
    tierBreakdown: Array<{
      name: string;
      sold: number;
      available: number;
      revenueNgn: number;
    }>;
    paymentMethodBreakdown: { wallet: number; paystack: number };
  };
  timeSeries: Array<{ date: string; ticketsSold: number; revenueNgn: number }>;
}

export interface AdminEventsSalesReport {
  totals: {
    totalTicketsSold: number;
    totalRevenueNgn: number;
    totalFeesNgn: number;
    totalVatNgn: number;
    eventCount: number;
  };
  events: Array<{
    id: string;
    title: string;
    startsAt: string;
    status: string;
    ticketsSold: number;
    revenueNgn: number;
    feesNgn: number;
  }>;
}

export interface CreateEventRequest {
  title: string;
  description: string;
  organizerBusinessId?: string;
  venueName: string;
  venueAddress: string;
  locationId: string;
  // Phase 42 — REQUIRED. Customer events map needs every event to have a
  // pinpoint. Admin form collects via VenueMapPicker (lat/lng inputs +
  // Google Maps helper); business mobile uses a proper interactive map.
  geoCoordinates: [number, number];
  startsAt: string;
  endsAt: string;
  coverImageUrl: string;
  galleryUrls?: string[];
  ticketTiers: {
    name: string;
    description?: string;
    priceNgn: number;
    quantityAvailable: number;
    perks?: string[];
    imageUrl?: string;
  }[];
}

export interface UpdateEventRequest extends Partial<CreateEventRequest> {
  status?: EventStatus;
  askRubyTags?: string[];
}

// ============================================================
// Deolu admin health dashboard (renamed from "Ask Ruby" in Phase 12a).
// Mirrors the response of GET /admin/ask-ruby/health (route preserved
// for backward compat).
// ============================================================

export interface DeoluHealthMetrics {
  window: { hours: number; since: string };
  usage: {
    dauToday: number;
    conversationsToday: number;
    conversationsInWindow: number;
    messagesInWindow: number;
    avgTurnsPerConvo: number;
    usersAtCapToday: number;
    freeTierDailyLimit: number;
  };
  quality: {
    successfulConversations: number;
    successRatePct: number;
    totalAssistantMessages: number;
    avgLatencyMs: number;
    maxLatencyMs: number;
  };
  cost: {
    todayKobo: number;
    todayNgn: number;
    monthToDateKobo: number;
    monthToDateNgn: number;
    monthlyBudgetKobo: number;
    monthlyBudgetNgn: number;
    budgetUsedPct: number;
    circuitBreakerState: "HEALTHY" | "WARNING" | "HALTED";
  };
  rollout: { percent: number };
  // Phase 13.9 — quality-gate telemetry
  qualityGates?: {
    voiceFilter: {
      totalAssistantMessages: number;
      firstTryPassRatePct: number;
      rewriteCount: number;
      scriptedFallbackCount: number;
    };
    hallucinationGuard: {
      flaggedAssistantMessages: number;
    };
    fallbackTemplatesByName: Record<string, number>;
  };
  atlasVectorIndex?: {
    name?: string;
    present?: boolean;
    queryable?: boolean;
    status?: string;
    error?: string;
  } | null;
}

// ──────────────────── Phase 50: Ruby+ Select ────────────────────

export type RubySelectPostStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export interface RubySelectPost {
  _id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  ctaUrl?: string;
  ctaLabel?: string;
  /** Empty array = global; non-empty = scoped to these cities */
  locationIds: string[];
  startsAt: string;
  endsAt?: string;
  displayPriority: number;
  status: RubySelectPostStatus;
  createdByAdminId: string;
  updatedByAdminId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRubySelectPostRequest {
  title: string;
  subtitle?: string;
  imageUrl: string;
  ctaUrl?: string;
  ctaLabel?: string;
  locationIds?: string[];
  startsAt?: string;
  endsAt?: string;
  displayPriority?: number;
  status?: RubySelectPostStatus;
}

export interface UpdateRubySelectPostRequest extends Partial<CreateRubySelectPostRequest> {}

/**
 * Public aggregator feed item (POST | AD | BUSINESS). Same shape the
 * mobile carousel consumes — keep in sync with the backend
 * `RubySelectFeedItem` discriminated union.
 */
export type RubySelectFeedItem =
  | {
      kind: 'POST';
      id: string;
      title: string;
      subtitle?: string;
      imageUrl: string;
      ctaUrl?: string;
      ctaLabel?: string;
      badge: 'announcement';
    }
  | {
      kind: 'AD';
      id: string;
      campaignId: string;
      businessId: string;
      title: string;
      subtitle?: string;
      imageUrl: string;
      deepLink: string;
      badge: 'sponsored';
    }
  | {
      kind: 'BUSINESS';
      id: string;
      businessId: string;
      title: string;
      subtitle?: string;
      imageUrl: string;
      distanceKm?: number;
      deepLink: string;
    };
