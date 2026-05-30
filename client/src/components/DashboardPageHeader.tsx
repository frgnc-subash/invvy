import type { ReactNode } from 'react';
import { cn } from '../lib/utils';
import { SidebarTrigger } from './ui/sidebar';

type DashboardPageHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
};

export default function DashboardPageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: DashboardPageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-lg border border-stone-200 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-start sm:justify-between dark:border-stone-800 dark:bg-stone-900',
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <SidebarTrigger className="mt-0.5 size-10 shrink-0 rounded-lg border border-stone-200 bg-white text-stone-700 shadow-sm transition-colors hover:bg-stone-100 hover:text-stone-950 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-200 dark:hover:bg-stone-800 dark:hover:text-white" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-blue-700 dark:text-blue-300">{eyebrow}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950 dark:text-stone-100">{title}</h1>
          {description ? <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div> : null}
    </div>
  );
}
