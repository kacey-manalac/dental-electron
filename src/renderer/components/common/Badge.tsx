import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'gray' | 'green' | 'yellow' | 'red' | 'blue' | 'purple' | 'orange';
  size?: 'sm' | 'md';
}

const dotColors = {
  gray: 'bg-gray-400',
  green: 'bg-emerald-400',
  yellow: 'bg-amber-400',
  red: 'bg-red-400',
  blue: 'bg-sky-400',
  purple: 'bg-violet-400',
  orange: 'bg-orange-400',
};

const variantStyles = {
  gray: 'bg-gray-100 text-gray-700 ring-gray-200 dark:bg-gray-500/30 dark:text-gray-300 dark:ring-gray-500/30',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/30 dark:text-emerald-400 dark:ring-emerald-500/30',
  yellow: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/30 dark:text-amber-400 dark:ring-amber-500/30',
  red: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/30 dark:text-red-400 dark:ring-red-500/30',
  blue: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/30 dark:text-sky-400 dark:ring-sky-500/30',
  purple: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/30 dark:text-violet-400 dark:ring-violet-500/30',
  orange: 'bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-500/30 dark:text-orange-400 dark:ring-orange-500/30',
};

export default function Badge({ children, variant = 'gray', size = 'sm' }: BadgeProps) {
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full ring-1 ring-inset ${variantStyles[variant]} ${sizes[size]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotColors[variant]}`} />
      {children}
    </span>
  );
}
