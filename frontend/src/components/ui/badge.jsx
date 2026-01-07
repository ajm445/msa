import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-slate-900 text-slate-50 hover:bg-slate-800',
        secondary: 'border-transparent bg-slate-100 text-slate-900 hover:bg-slate-200',
        destructive: 'border-transparent bg-red-500 text-slate-50 hover:bg-red-600',
        outline: 'text-slate-950 border-slate-200',
        core: 'border-transparent bg-blue-100 text-blue-800',
        supporting: 'border-transparent bg-green-100 text-green-800',
        generic: 'border-transparent bg-slate-100 text-slate-700',
        info: 'border-transparent bg-sky-100 text-sky-800',
        warning: 'border-transparent bg-amber-100 text-amber-800',
        success: 'border-transparent bg-emerald-100 text-emerald-800',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
