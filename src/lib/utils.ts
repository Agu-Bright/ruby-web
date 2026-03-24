import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amount: number, currency = 'NGN'): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date | undefined | null, options?: Intl.DateTimeFormatOptions): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  });
}

export function formatDateTime(date: string | Date | undefined | null): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(date: string | Date | undefined | null): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(d);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '…';
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ACTIVE: 'badge-success',
    LIVE: 'badge-success',
    APPROVED: 'badge-success',
    COMPLETED: 'badge-success',
    DELIVERED: 'badge-success',
    RESOLVED: 'badge-success',
    INACTIVE: 'badge-neutral',
    DRAFT: 'badge-neutral',
    CLOSED: 'badge-neutral',
    PENDING_REVIEW: 'badge-warning',
    PENDING: 'badge-warning',
    PROCESSING: 'badge-warning',
    PREPARING: 'badge-warning',
    REQUESTED: 'badge-warning',
    CONFIRMED: 'badge-info',
    IN_PROGRESS: 'badge-info',
    DISPATCHED: 'badge-info',
    UNDER_REVIEW: 'badge-info',
    OPEN: 'badge-info',
    PLACED: 'badge-info',
    ACCEPTED: 'badge-info',
    OUT_OF_STOCK: 'badge-warning',
    DISCONTINUED: 'badge-neutral',
    ARCHIVED: 'badge-neutral',
    REJECTED: 'badge-danger',
    SUSPENDED: 'badge-danger',
    CANCELLED: 'badge-danger',
    ESCALATED: 'badge-danger',
    NO_SHOW: 'badge-danger',
    FAILED: 'badge-danger',
    // Delivery statuses
    CREATED: 'badge-neutral',
    ASSIGNED: 'badge-info',
    RIDER_ACCEPTED: 'badge-info',
    RIDER_AT_PICKUP: 'badge-warning',
    PICKED_UP: 'badge-warning',
    IN_TRANSIT: 'badge-info',
    RIDER_AT_DROPOFF: 'badge-warning',
    READY: 'badge-success',
    ACKNOWLEDGED: 'badge-warning',
    FALSE_ALARM: 'badge-neutral',
  };
  return colors[status] || 'badge-neutral';
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/** Extract a raw string ID from a locationId entry that may be populated or raw */
export function toLocationId(loc: string | { _id: string; [key: string]: unknown }): string {
  return typeof loc === 'object' && loc !== null ? loc._id : loc;
}

// ============================================================
// Business Field Helpers — Handle Populated & String Fields
// ============================================================

/**
 * Safely extract owner ID from potentially populated ownerId
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getOwnerId(owner: any): string {
  if (!owner) return '';
  return typeof owner === 'object' && owner !== null ? owner._id : owner;
}

/**
 * Safely extract owner name from potentially populated ownerId
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getOwnerName(owner: any): string {
  if (!owner) return '';
  if (typeof owner === 'string') return '';
  return owner?.fullName || `${owner?.firstName || ''} ${owner?.lastName || ''}`.trim() || '';
}

/**
 * Safely extract owner email from potentially populated ownerId
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getOwnerEmail(owner: any): string {
  if (!owner) return '';
  if (typeof owner === 'string') return '';
  return owner?.email || '';
}

/**
 * Safely extract category ID from potentially populated categoryId
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getCategoryId(category: any): string {
  if (!category) return '';
  return typeof category === 'object' && category !== null ? category._id : category;
}

/**
 * Safely extract category name from potentially populated categoryId
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getCategoryName(category: any): string {
  if (!category) return '';
  if (typeof category === 'string') return '';
  return category?.name || '';
}

/**
 * Safely extract subcategory ID from potentially populated subcategoryId
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSubcategoryId(subcategory: any): string {
  if (!subcategory) return '';
  return typeof subcategory === 'object' && subcategory !== null ? subcategory._id : subcategory;
}

/**
 * Safely extract subcategory name from potentially populated subcategoryId
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSubcategoryName(subcategory: any): string {
  if (!subcategory) return '';
  if (typeof subcategory === 'string') return '';
  return subcategory?.name || '';
}

/**
 * Safely extract location ID from potentially populated locationId
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getLocationId(location: any): string {
  if (!location) return '';
  return typeof location === 'object' && location !== null ? location._id : location;
}

/**
 * Safely extract location name from potentially populated locationId
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getLocationName(location: any): string {
  if (!location) return '';
  if (typeof location === 'string') return '';
  return location?.name || '';
}

const AD_TYPE_LABELS: Record<string, string> = {
  FEATURED_LISTING: 'Featured Listing',
  SLIDESHOW_AD: 'Slideshow Ad',
  EXPLORE_REELS_AD: 'Explore Reels Ad',
  PUSH_NOTIFICATION: 'Push Notification',
  FEATURED_REVIEWS: 'Featured Reviews',
};

export function getAdTypeName(type: string): string {
  return AD_TYPE_LABELS[type] || type;
}

const AD_STATUS_LABELS: Record<string, string> = {
  PENDING_REVIEW: 'Pending Review',
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

export function getAdStatusLabel(status: string): string {
  return AD_STATUS_LABELS[status] || status;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getBusinessName(business: any): string {
  if (!business) return '';
  if (typeof business === 'string') return '';
  return business?.name || '';
}

// ── Order helpers (handle backend populated fields + field name mismatches) ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getOrderBusinessName(order: any): string {
  if (order.businessName) return order.businessName;
  if (typeof order.businessId === 'object' && order.businessId?.name) return order.businessId.name;
  return '';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getOrderBusinessLogo(order: any): string {
  if (typeof order.businessId === 'object' && order.businessId?.logoUrl) return order.businessId.logoUrl;
  return '';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getOrderCustomerName(order: any): string {
  if (order.customerName) return order.customerName;
  if (typeof order.userId === 'object' && order.userId?.firstName) {
    return `${order.userId.firstName} ${order.userId.lastName || ''}`.trim();
  }
  return '';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getOrderCustomerEmail(order: any): string {
  if (typeof order.userId === 'object' && order.userId?.email) return order.userId.email;
  return '';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getOrderCustomerPhone(order: any): string {
  if (typeof order.userId === 'object' && order.userId?.phone) return order.userId.phone;
  return '';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getOrderFulfillmentType(order: any): string {
  return order.fulfillmentType || order.type || 'DELIVERY';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getOrderTotal(order: any): number {
  return order.totalAmount ?? order.fees?.total ?? order.total ?? 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getOrderSubtotal(order: any): number {
  return order.fees?.subtotal ?? order.subtotal ?? 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getOrderDeliveryFee(order: any): number {
  return order.fees?.deliveryFee ?? order.deliveryFee ?? 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getOrderPlatformFee(order: any): number {
  return order.fees?.platformFee ?? order.platformFee ?? 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getOrderDiscount(order: any): number {
  return order.fees?.discount ?? order.discount ?? 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getOrderNotes(order: any): string {
  return order.customerNote || order.notes || '';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getOrderDeliveryAddressStr(order: any): string {
  const addr = order.deliveryAddress;
  if (!addr) return '';
  if (typeof addr === 'string') return addr;
  const parts = [addr.street, addr.street2, addr.landmark, addr.city, addr.state].filter(Boolean);
  return parts.join(', ');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getItemPrice(item: any): number {
  return item.basePrice ?? item.price ?? 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getItemTotal(item: any): number {
  return item.subtotal ?? item.total ?? (getItemPrice(item) * (item.quantity || 1));
}

// ── Delivery job helpers ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getDeliveryBusinessName(job: any): string {
  if (typeof job.businessId === 'object' && job.businessId?.name) return job.businessId.name;
  return '';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getDeliveryCustomerName(job: any): string {
  if (typeof job.userId === 'object' && job.userId?.firstName) {
    return `${job.userId.firstName} ${job.userId.lastName || ''}`.trim();
  }
  return '';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getEntityId(field: any): string {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return field._id || '';
}

/** Normalize media URLs — pass through as-is, handles both old R2 and custom domain */
export function normalizeMediaUrl(url?: string | null): string {
  if (!url) return '';
  return url;
}

