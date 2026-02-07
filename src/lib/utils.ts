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
  };
  return colors[status] || 'badge-neutral';
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}
