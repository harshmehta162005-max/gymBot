import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  color?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  trendUp,
  color = 'brand',
}) => {
  const colorMap: Record<string, string> = {
    brand: 'from-brand-500/20 to-brand-600/5 border-brand-500/20 text-brand-400',
    blue: 'from-blue-500/20 to-blue-600/5 border-blue-500/20 text-blue-400',
    amber: 'from-amber-500/20 to-amber-600/5 border-amber-500/20 text-amber-400',
    rose: 'from-rose-500/20 to-rose-600/5 border-rose-500/20 text-rose-400',
  };

  return (
    <article
      className={`bg-gradient-to-br ${colorMap[color] || colorMap.brand} border rounded-xl p-4 sm:p-6 transition-transform duration-200 hover:scale-[1.02]`}
    >
      <div className="flex items-center justify-between mb-2 sm:mb-4">
        <span className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-gray-400 leading-tight">
          {title}
        </span>
        <Icon size={18} className="opacity-60 shrink-0" aria-hidden="true" />
      </div>
      <p className="text-2xl sm:text-3xl font-bold text-white">{value}</p>
      {trend && (
        <p className={`text-xs mt-1.5 sm:mt-2 ${trendUp ? 'text-green-400' : 'text-red-400'}`}>
          {trendUp ? '↑' : '↓'} {trend}
        </p>
      )}
    </article>
  );
};

export default StatsCard;
