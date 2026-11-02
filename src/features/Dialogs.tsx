import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ArrowRight,
  ArrowUpRight,
  Clock3,
  CreditCard,
  Gift,
  MapPin,
  Navigation,
  Sparkles,
  Store,
} from 'lucide-react';
import { Dialog } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { LoyaltyCard } from '../components/LoyaltyCard';
import type { Coordinates } from '../lib/geolocation';
import { formatDistanceKm, isDemo } from '../lib/utils';
import type { LoyaltyCard as Card, NearbyBusiness, Promotion } from '../lib/types';

function promotionTypeText(p: Promotion): string {
  if (p.discountTypeLabel) return p.discountTypeLabel;
  if (p.discountType === 'percentage') return `${p.discountValue ?? 0}% de descuento`;
  if (p.discountType === 'fixed') return `$${p.discountValue ?? 0} de descuento`;
  if (p.discountType === 'gift') return 'Regalo o producto gratis';
  if (p.discountType === 'points') return 'Beneficio por puntos';
  if (p.type === 'simple')
    return `Cada ${p.purchasesRequired ?? 0} compras = ${p.freeQuantity ?? 1} ${p.freeProduct || 'producto'} gratis`;
  if (p.type === 'steps')
    return `Beneficios al alcanzar metas de puntos (${p.tiers?.length ?? 0} niveles)`;
  if (p.type === 'direct')
    return p.appliesAlways
      ? 'Siempre activa, sin condiciones'
      : `Activa ${(p.weekdays ?? []).map((d) => ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][d]).join(', ')} de ${p.startTime ?? ''} a ${p.endTime ?? ''}`;
  return p.description;
}

export function CardDialog({ selected, onClose }: { selected: Card | null; onClose: () => void }) {
  if (!selected) return null;
  const ready = selected.stamps >= selected.goal;
  return (
    <Dialog
      open={!!selected}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={selected.name}
      description={selected.tagline}
    >
      <LoyaltyCard card={selected} onClick={() => undefined} variant="dialog" />
      <div className="mt-5 mb-4 flex items-center gap-[7px] text-[11px] text-[#aeb9c4]">
        <MapPin size={16} />
        {selected.location}
        <span className="ml-auto">{selected.distance}</span>
      </div>
      <div className="flex gap-3 border-t border-line pt-[17px] pb-5 text-[#6f87a0]">
        <Gift size={22} />
        <div>
          <strong className="text-[12px] font-[600] text-navy">{selected.reward}</strong>
          <p className="mt-[5px] text-[11px] leading-[1.8]">
            {ready
              ? 'Tu recompensa está lista. Disfrútala en el negocio.'
              : `Obtén un sello por cada compra. Completa ${selected.goal} para ganar.`}
          </p>
        </div>
      </div>
      <p className="mt-[14px] text-center text-[9px] leading-[1.7] text-[#aeb9c4]">
        {isDemo
          ? 'Tarjeta de demostración. No tiene validez comercial.'
          : 'Consulta las condiciones y registra tus compras directamente en el negocio.'}
      </p>
    </Dialog>
  );
}

export function PromotionDialog({
  promotion,
  onClose,
}: {
  promotion: Promotion | null;
  onClose: () => void;
}) {
  if (!promotion) return null;
  const endDate = (promotion.endsAt ?? promotion.expires ?? '').slice(0, 10);
  const startDate = (promotion.startsAt ?? '').slice(0, 10);
  const hasEndDate = Boolean(
    endDate && !endDate.startsWith('Sin fecha') && !Number.isNaN(Date.parse(endDate)),
  );
  const hasStartDate = Boolean(startDate && !Number.isNaN(Date.parse(startDate)));
  return (
    <Dialog
      open={!!promotion}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={promotion.business}
      description="Un buen motivo para darte una vuelta por el barrio."
    >
      <img
        className="h-[207px] w-full rounded-[11px] object-cover max-[540px]:h-[185px]"
        src={promotion.image}
        alt={`Promoción de ${promotion.business}`}
      />
      <span className="mt-[19px] mb-3 inline-flex items-center gap-[5px] rounded-[5px] bg-[#dceff0] px-[10px] py-[6px] text-[10px] text-[#14787f]">
        <Sparkles size={14} />
        {promotion.badge}
      </span>
      <h2 className="text-[23px] leading-[1.5] max-[540px]:text-[22px]">{promotion.title}</h2>
      <p className="my-[15px] text-[12px] leading-[1.9] text-[#93a5b8] max-[540px]:text-[11px]">
        {promotion.description}
      </p>
      {(promotion.type || promotion.discountType) && (
        <div className="my-[14px] rounded-[10px] border border-line bg-[#f4f6f8] p-[14px]">
          <span className="little-label mb-[6px] block">Beneficio</span>
          <p className="text-[12px] text-[#46617c]">{promotionTypeText(promotion)}</p>
        </div>
      )}
      {promotion.code && (
        <div className="my-[14px] rounded-[10px] border border-line bg-[#f4f6f8] p-[14px]">
          <span className="little-label mb-[6px] block">Código promocional</span>
          <p className="text-[12px] text-[#46617c]">{promotion.code}</p>
        </div>
      )}
      {promotion.terms && (
        <p className="my-[15px] text-[12px] leading-[1.9] text-[#93a5b8] max-[540px]:text-[11px]">
          {promotion.terms}
        </p>
      )}
      <div className="my-5 flex items-center gap-[7px] text-[10px] text-[#aeb9c4] max-[540px]:text-[9px]">
        <Clock3 size={16} />
        {hasEndDate
          ? `Válida hasta el ${format(new Date(`${endDate}T12:00:00`), "d 'de' MMMM 'de' yyyy", { locale: es })}`
          : hasStartDate
            ? `Vigente desde el ${format(new Date(`${startDate}T12:00:00`), "d 'de' MMMM 'de' yyyy", { locale: es })}, sin fecha de término`
            : 'Vigente sin fecha de término'}
      </div>
      {isDemo && (
        <p className="mt-[14px] text-center text-[9px] leading-[1.7] text-[#aeb9c4]">
          Promoción de demostración. No tiene validez comercial.
        </p>
      )}
      <div
        className="mx-0 mt-6 mb-1 flex items-center justify-center gap-2 text-[9px] text-[#93a5b8] max-[540px]:gap-1.5 max-[540px]:text-[8px]"
        aria-label="Cómo disfrutar la promoción"
      >
        <span className="flex items-center gap-1 max-[540px]:gap-[3px]">
          <b className="inline-flex size-5 items-center justify-center rounded-full bg-[#eef2f6] text-[9px] font-[500] max-[540px]:size-[18px]">
            1
          </b>{' '}
          Visita
        </span>
        <ArrowRight size={13} className="text-[#c4cfd9]" />
        <span className="flex items-center gap-1 max-[540px]:gap-[3px]">
          <b className="inline-flex size-5 items-center justify-center rounded-full bg-[#eef2f6] text-[9px] font-[500] max-[540px]:size-[18px]">
            2
          </b>{' '}
          Muestra la promoción
        </span>
      </div>
    </Dialog>
  );
}

/** Información del negocio que se abre al tocar su marcador en "Cerca de mí". */
export function NearbyBusinessDialog({
  business,
  origin,
  onClose,
}: {
  business: NearbyBusiness | null;
  origin: Coordinates | null;
  onClose: () => void;
}) {
  if (!business) return null;
  const coordinates =
    business.latitude !== undefined && business.longitude !== undefined
      ? `${business.latitude},${business.longitude}`
      : null;
  const destination =
    coordinates || `${business.name}, ${business.address || business.location}, Ciudad de México`;
  const routeUrl = origin
    ? `https://www.google.com/maps/dir/?api=1&origin=${origin.latitude},${origin.longitude}&destination=${encodeURIComponent(destination)}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`;
  return (
    <Dialog
      open={!!business}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={business.name}
      description={business.description || business.category}
      className="nearby-dialog"
    >
      <div className="nearby-dialog-hero">
        {business.background ? (
          <img className="nearby-dialog-banner" src={business.background} alt="" />
        ) : (
          <span className="nearby-dialog-banner" aria-hidden="true" />
        )}
        <span className="nearby-dialog-logo">
          {business.logo ? <img src={business.logo} alt="" /> : <Store size={26} />}
        </span>
      </div>
      <div className="nearby-dialog-facts">
        <span>
          <Store size={15} />
          {business.category}
        </span>
        <span>
          <MapPin size={15} />
          {business.address || business.location}
        </span>
        <span>
          <Navigation size={15} />
          {formatDistanceKm(business.distanceKm)}
        </span>
      </div>
      {(business.hasCard ||
        business.activeLoyaltyCardsCount > 0 ||
        business.activePromotionsCount > 0) && (
        <div className="nearby-dialog-badges">
          {(business.hasCard || business.activeLoyaltyCardsCount > 0) && (
            <span>
              <CreditCard size={14} />
              {business.hasCard
                ? 'Ya tienes su tarjeta'
                : `${business.activeLoyaltyCardsCount} tarjeta${business.activeLoyaltyCardsCount === 1 ? ' activa' : 's activas'}`}
            </span>
          )}
          {business.activePromotionsCount > 0 && (
            <span>
              <Gift size={14} />
              {business.activePromotionsCount}{' '}
              {business.activePromotionsCount === 1 ? 'promoción' : 'promociones'}
            </span>
          )}
        </div>
      )}
      <div className="nearby-dialog-actions">
        <Button asChild>
          <a href={routeUrl} target="_blank" rel="noreferrer">
            <Navigation size={16} /> Abrir ruta <ArrowUpRight size={15} />
          </a>
        </Button>
      </div>
    </Dialog>
  );
}
