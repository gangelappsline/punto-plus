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
      <LoyaltyCard card={selected} onClick={() => undefined} />
      <div className="card-detail-location">
        <MapPin size={16} />
        {selected.location}
        <span>{selected.distance}</span>
      </div>
      <div className="detail-reward">
        <Gift size={22} />
        <div>
          <strong>{selected.reward}</strong>
          <p>
            {ready
              ? 'Tu recompensa está lista. Disfrútala en el negocio.'
              : `Obtén un sello por cada compra. Completa ${selected.goal} para ganar.`}
          </p>
        </div>
      </div>
      <p className="fine-print">
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
        className="promotion-detail-image"
        src={promotion.image}
        alt={`Promoción de ${promotion.business}`}
      />
      <span className="detail-promo-badge">
        <Sparkles size={14} />
        {promotion.badge}
      </span>
      <h2 className="promotion-detail-title">{promotion.title}</h2>
      <p className="promotion-description">{promotion.description}</p>
      {(promotion.type || promotion.discountType) && (
        <div className="promotion-type-detail">
          <span className="little-label">Beneficio</span>
          <p>{promotionTypeText(promotion)}</p>
        </div>
      )}
      {promotion.code && (
        <div className="promotion-type-detail">
          <span className="little-label">Código promocional</span>
          <p>{promotion.code}</p>
        </div>
      )}
      {promotion.terms && <p className="promotion-description">{promotion.terms}</p>}
      <div className="promotion-validity">
        <Clock3 size={16} />
        {hasEndDate
          ? `Válida hasta el ${format(new Date(`${endDate}T12:00:00`), "d 'de' MMMM 'de' yyyy", { locale: es })}`
          : hasStartDate
            ? `Vigente desde el ${format(new Date(`${startDate}T12:00:00`), "d 'de' MMMM 'de' yyyy", { locale: es })}, sin fecha de término`
            : 'Vigente sin fecha de término'}
      </div>
      {isDemo && (
        <p className="fine-print">Promoción de demostración. No tiene validez comercial.</p>
      )}
      <div className="qr-steps" aria-label="Cómo disfrutar la promoción">
        <span>
          <b>1</b> Visita
        </span>
        <ArrowRight size={13} />
        <span>
          <b>2</b> Muestra la promoción
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
