import { getStatusColor } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const colorClass = getStatusColor(status);
  const label = status.replace(/_/g, ' ');

  return <span className={`${colorClass} ${className}`}>{label}</span>;
}
