import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-slate-900 text-white hover:bg-slate-800 focus-visible:ring-slate-950',
        primary: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-600',
        destructive: 'bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-500',
        outline: 'border border-slate-200 bg-white hover:bg-slate-50 hover:text-slate-900 focus-visible:ring-slate-950',
        secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200 focus-visible:ring-slate-950',
        ghost: 'hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-950',
        link: 'text-slate-900 underline-offset-4 hover:underline focus-visible:ring-slate-950',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-lg px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
