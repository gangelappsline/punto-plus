import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

/**
 * Botón base de la app: variantes con utilidades de Tailwind v4 (sin clases CSS
 * propias). `cn` fusiona las utilidades para que `className` pueda sobrescribir.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-[9px] min-h-11 rounded-[9px] border border-transparent px-[18px] py-[11px] text-xs font-[650] leading-normal whitespace-nowrap',
  {
    variants: {
      variant: {
        default:
          'bg-brand text-white shadow-[0_3px_5px_#1b7f8615] hover:enabled:bg-brand-dark hover:enabled:shadow-[0_5px_14px_#1b7f8629]',
        outline: 'border-[#d8e1e8] bg-white hover:enabled:bg-[#f2f5f7]',
        secondary: 'bg-[#e3f1f2] text-[#14787f] hover:enabled:bg-[#d3e9eb]',
        ghost: 'hover:enabled:bg-mist',
      },
      size: {
        default: '',
        sm: 'min-h-9 px-3 py-2 text-xs',
        icon: 'size-[42px] p-0',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
