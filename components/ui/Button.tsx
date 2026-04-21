import React from 'react';
import { Loader2 } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'relative inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-violet-600 hover:bg-violet-700 text-white',
        secondary: 'border border-white/[0.08] bg-white/[0.04] text-white/80 hover:bg-white/[0.06]',
        ghost: 'text-white/60 hover:text-white hover:bg-white/[0.04]',
        danger: 'border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20',
      },
      size: {
        xs: 'px-3 py-1.5 text-xs rounded-md',
        sm: 'px-4 py-2 text-sm rounded-lg',
        md: 'px-5 py-2.5 text-sm rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  icon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, icon, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {loading && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}

        {!loading && icon && (
          <span className="mr-2">{icon}</span>
        )}

        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };