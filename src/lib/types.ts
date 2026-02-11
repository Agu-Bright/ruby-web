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
export type CategoryGroupType = 'TOP_TILES' | 'MORE' | 'HIDDEN';

export interface CategoryGroup {
  _id: string;
  name: string;
  slug: string;
  type: CategoryGroupType;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LocalizedText {
  [languageCode: string]: string;
}

export interface Category {
  _id: string;
  slug: string;
  titles: LocalizedText;
  descriptions?: LocalizedText;
  iconKey?: string;
  iconUrl?: string;
  groupId: string;
  order: number;
  isActive: boolean;
  businessType: 'SHOPPING' | 'SERVICE' | 'BOTH';
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryRequest {
  slug: string;
  titles: LocalizedText;
  descriptions?: LocalizedText;
  iconKey?: string;
  iconUrl?: string;
  groupId: string;
  order?: number;
  isActive?: boolean;
  businessType: 'SHOPPING' | 'SERVICE' | 'BOTH';
}

export interface Subcategory {
  _id: string;
  categoryId: string;
  slug: string;
  titles: LocalizedText;
  order: number;
  isActive: boolean;
  templateId?: string;
  synonyms: string[];
  riskTier?: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubcategoryRequest {
  categoryId: string;
  slug: string;
  titles: LocalizedText;
  order?: number;
  isActive?: boolean;
  templateId?: string;
  synonyms?: string[];
  riskTier?: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface LocationCategoryConfig {
  _id: string;
  locationId: string;
  categoryId: string;
  isActive: boolean;
  orderOverride?: number;
  groupOverride?: string;
  featured: boolean;
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
  featured?: boolean;
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
export type FieldType = 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'SELECT' | 'MULTISELECT' | 'MEDIA' | 'RANGE';
export type FilterType = 'EXACT' | 'RANGE' | 'MULTI' | 'BOOLEAN';

export interface TemplateField {
  key: string;
  label: LocalizedText;
  type: FieldType;
  required: boolean;
  isPublic: boolean;
  isFilter: boolean;
  filterType?: FilterType;
  options?: string[];
  placeholder?: LocalizedText;
  min?: number;
  max?: number;
  order: number;
}

export interface Template {
  _id: string;
  name: string;
  subcategoryId: string;
  version: number;
  fields: TemplateField[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateRequest {
  name: string;
  subcategoryId: string;
  fields: TemplateField[];
}

export interface UpdateTemplateRequest {
  name?: string;
  fields?: TemplateField[];
  isActive?: boolean;
}

// ============================================================
// Business
// ============================================================
export type BusinessStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'LIVE' | 'REJECTED' | 'SUSPENDED';

export interface Business {
  _id: string;
  name: string;
  slug: string;
  ownerId: string;
  locationId: string;
  categoryId: string;
  subcategoryId: string;
  categoryName?: string;
  subcategoryName?: string;
  ownerName?: string;
  status: BusinessStatus;
  description?: string;
  phone?: string;
  email?: string;
  address?: string | { street?: string; city?: string; state?: string; country?: string; postalCode?: string };
  coordinates?: {
    type: 'Point';
    coordinates: [number, number];
  };
  media?: string[];
  templateData?: Record<string, unknown>;
  hours?: BusinessHours;
  rating?: number;
  reviewCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessHours {
  [day: string]: {
    open: string;
    close: string;
    isClosed: boolean;
  };
}

export interface BusinessApprovalAction {
  status: 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  reason?: string;
}

// ============================================================
// Orders
// ============================================================
export type OrderStatus = 'PLACED' | 'ACCEPTED' | 'REJECTED' | 'PREPARING' | 'READY' | 'DISPATCHED' | 'PICKED_UP' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED';
export type FulfillmentType = 'DELIVERY' | 'PICKUP';

export interface Order {
  _id: string;
  orderNumber: string;
  userId: string;
  customerId?: string;
  customerName?: string;
  businessId: string;
  businessName?: string;
  locationId: string;
  status: OrderStatus;
  fulfillmentType: FulfillmentType;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  platformFee: number;
  discount: number;
  total: number;
  totalAmount?: number;
  fees?: { label: string; amount: number }[];
  currency: string;
  deliveryAddress?: string;
  deliveryQuoteId?: string;
  statusHistory: StatusEvent[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  options?: Record<string, string>;
  total: number;
}

export interface StatusEvent {
  status: string;
  timestamp: string;
  actor?: string;
  note?: string;
}

// ============================================================
// Bookings
// ============================================================
export type BookingStatus = 'REQUESTED' | 'CONFIRMED' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
export type FulfillmentMode = 'ON_SITE' | 'AT_HOME';

export interface Booking {
  _id: string;
  bookingNumber: string;
  userId: string;
  customerId?: string;
  customerName?: string;
  businessId: string;
  serviceListingId: string;
  serviceName?: string;
  businessName?: string;
  locationId: string;
  status: BookingStatus;
  fulfillmentMode: FulfillmentMode;
  scheduledAt: string;
  duration: number;
  durationMinutes?: number;
  serviceFee: number;
  travelFee: number;
  platformFee: number;
  total: number;
  fees?: { label: string; amount: number }[];
  currency: string;
  address?: string;
  statusHistory: StatusEvent[];
  safetyEvents?: StatusEvent[];
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
  type: LedgerType;
  direction: 'CREDIT' | 'DEBIT';
  amount: number;
  currency: string;
  referenceType: string;
  referenceId: string;
  description: string;
  balanceBefore: number;
  balanceAfter: number;
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
  locationId?: string;
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
  totalBusinesses: number;
  pendingApprovals: number;
  totalOrders: number;
  totalBookings: number;
  totalRevenue: number;
  totalDisputes: number;
  pendingPayouts: number;
  activeLocations: number;
  recentActivity: AuditLog[];
  ordersByStatus: Record<string, number>;
  bookingsByStatus: Record<string, number>;
  revenueByMonth: { month: string; revenue: number }[];
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
}

export interface BookingFilterParams extends PaginationParams {
  locationId?: string;
  status?: BookingStatus;
  businessId?: string;
  startDate?: string;
  endDate?: string;
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
