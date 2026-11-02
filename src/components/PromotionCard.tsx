import { ArrowUpRight, Heart, MapPin } from 'lucide-react';
import type { Promotion } from '../lib/types';
import { cn } from '../lib/utils';

const imageAlt: Record<string, string> = {
  Cafetería: 'Cappuccinos con arte latte en una mesa de café',
  Panadería: 'Pan artesanal recién horneado',
};

export function PromotionCard({
  promotion: p,
  favorite = false,
  onFavorite,
  onClick,
  pending,
}: {
  promotion: Promotion;
  favorite?: boolean;
  onFavorite?: () => void;
  onClick: () => void;
  pending?: boolean;
}) {
  return (
    <article
      className="min-w-0 overflow-hidden rounded-[10px] border border-[#e2e9ef] bg-white"
      data-promotion-card
    >
      <div className="relative h-[153px] overflow-hidden bg-[#e8edf2] min-[1600px]:h-[186px] max-[1200px]:h-[145px] max-[768px]:h-[137px] max-[540px]:h-[190px]">
        <button
          className="group/image block size-full"
          onClick={onClick}
          aria-label={`Ver promoción de ${p.business}`}
        >
          <img
            src={p.image}
            alt={imageAlt[p.category] ?? 'Matcha helado en una cafetería'}
            loading="lazy"
            className="size-full object-cover object-[center_58%] transition-transform duration-500 group-hover/image:scale-[1.06]"
          />
        </button>
        <span className="pointer-events-none absolute bottom-3 left-3 rounded-[4px] bg-[#fdfcf8ee] px-[9px] py-[6px] text-[8px] font-[600] text-[#46617c] shadow-[0_2px_7px_#0001] min-[1001px]:text-[9px] max-[768px]:bottom-[10px] max-[768px]:left-[9px] max-[768px]:px-[7px] max-[768px]:py-[5px] max-[768px]:text-[7px] max-[540px]:bottom-[14px] max-[540px]:left-[15px] max-[540px]:px-[10px] max-[540px]:py-[7px] max-[540px]:text-[9px]">
          {p.badge}
        </span>
        {onFavorite && (
          <button
            className={cn(
              'absolute top-[11px] right-[11px] flex size-[29px] items-center justify-center rounded-full bg-[#fbfbfae8] text-[#7d90a3] backdrop-blur-[5px] transition-colors hover:bg-[#f0f7f8] hover:text-brand-deep max-[768px]:top-[9px] max-[768px]:right-[9px] max-[768px]:size-[26px] max-[540px]:top-3 max-[540px]:right-[13px] max-[540px]:size-8',
              favorite && 'bg-[#f0f7f8] text-brand-deep',
              pending && 'opacity-60',
            )}
            onClick={onFavorite}
            aria-label={`${favorite ? 'Quitar de' : 'Guardar en'} favoritos: ${p.business}`}
            aria-pressed={favorite}
            disabled={pending}
          >
            <Heart
              size={17}
              fill={favorite ? 'currentColor' : 'none'}
              className="size-3.5 max-[540px]:size-4"
            />
          </button>
        )}
      </div>
      <button
        className="block w-full px-[15px] pt-[14px] pb-[15px] text-left max-[1200px]:p-3 max-[768px]:p-3 max-[540px]:px-[18px] max-[540px]:py-[17px]"
        onClick={onClick}
      >
        <div className="flex items-center justify-between text-[10px] font-[650] text-navy min-[1001px]:text-[12px] max-[768px]:text-[9px] max-[540px]:text-[13px]">
          {p.business}
          <ArrowUpRight
            size={17}
            className="w-3.5 text-[#aeb9c4] max-[540px]:w-[17px]"
            aria-hidden
          />
        </div>
        <h3 className="mt-[5px] font-sans text-[9.5px] leading-[1.7] font-[400] tracking-normal text-[#93a5b8] min-[1001px]:text-[11px] max-[768px]:text-[9px] max-[540px]:mt-[5px] max-[540px]:text-[12px]">
          {p.title}
        </h3>
        <span className="mt-[11px] flex items-center gap-1 text-[7px] text-[#c2cdd6] min-[1001px]:text-[9px] max-[768px]:text-[6px] max-[540px]:mt-[13px] max-[540px]:gap-[5px] max-[540px]:text-[9px]">
          <MapPin size={12} className="size-2.5 max-[540px]:size-3" aria-hidden /> Ciudad de México{' '}
          <i className="mx-[2px] h-0.5 w-0.5 rounded-full bg-[#c9d2da]" /> {p.category}
        </span>
      </button>
    </article>
  );
}
