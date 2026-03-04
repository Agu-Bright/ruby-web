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

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  });
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
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

