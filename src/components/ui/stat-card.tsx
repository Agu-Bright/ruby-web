import { type LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  className?: string;
}

export function StatCard({ title, value, icon: Icon, trend, trendUp, className = '' }: StatCardProps) {
  return (
    <div className={`card p-5 hover:shadow-md transition-all duration-200 group ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{title}</p>
          <p className="mt-2.5 text-2xl font-bold text-gray-900">{value}</p>
          {trend && (
            <p className={`mt-1.5 text-[11px] font-medium ${trendUp === undefined ? 'text-gray-400' : trendUp ? 'text-emerald-600' : 'text-red-600'}`}>
              {trend}
            </p>
          )}
        </div>
        <div className="p-2.5 bg-ruby-50 rounded-xl ring-1 ring-ruby-100 group-hover:scale-110 transition-transform">
          <Icon className="w-5 h-5 text-ruby-600" />
        </div>
      </div>
    </div>
  );
}
