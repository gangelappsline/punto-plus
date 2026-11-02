import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className = '',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] animate-fade-in bg-[#022f5366] backdrop-blur-[5px]" />
        <DialogPrimitive.Content
          className={cn(
            'fixed top-1/2 left-1/2 z-[61] max-h-[90dvh] w-[calc(100%-36px)] max-w-[460px] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-[17px] border border-line bg-white p-[26px] shadow-[0_24px_80px_#022f5333] animate-dialog-in',
            'max-[768px]:max-h-[calc(100dvh-24px)] max-[768px]:w-[min(560px,calc(100%-24px))] max-[768px]:p-[clamp(16px,4vw,22px)] max-[768px]:overscroll-contain',
            'max-[540px]:max-h-[90dvh] max-[540px]:rounded-[15px] max-[540px]:p-[22px]',
            className,
          )}
          aria-describedby={description ? 'dialog-description' : undefined}
        >
          <div className="mb-[7px] flex items-center justify-between gap-[10px]">
            <DialogPrimitive.Title className="text-[19px] leading-[1.45] max-[540px]:text-[17px]">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              className="inline-flex size-[30px] shrink-0 items-center justify-center rounded-full text-[#b0bcc7] transition-colors hover:bg-mist"
              aria-label="Cerrar ventana"
            >
              <X size={20} />
              <span className="sr-only">Cerrar</span>
            </DialogPrimitive.Close>
          </div>
          {description && (
            <DialogPrimitive.Description
              id="dialog-description"
              className="mb-[22px] pr-3 text-[12px] leading-[1.8] text-[#93a5b8] max-[540px]:mb-[18px] max-[540px]:text-[11px] max-[540px]:leading-[1.9]"
            >
              {description}
            </DialogPrimitive.Description>
          )}
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
