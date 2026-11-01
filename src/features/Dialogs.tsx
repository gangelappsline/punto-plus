import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowRight, Clock3, Gift, MapPin, Sparkles } from 'lucide-react';
import { Dialog } from '../components/ui/dialog';
import { LoyaltyCard } from '../components/LoyaltyCard';
import { isDemo } from '../lib/utils';
import type { LoyaltyCard as Card, Promotion } from '../lib/types';

function promotionTypeText(p: Promotion): string {
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
      {promotion.type && (
        <div className="promotion-type-detail">
          <span className="little-label">Tipo de promoción</span>
          <p>{promotionTypeText(promotion)}</p>
        </div>
      )}
      <div className="promotion-validity">
        <Clock3 size={16} /> Válida hasta el{' '}
        {format(new Date(promotion.expires + 'T12:00:00'), "d 'de' MMMM 'de' yyyy", { locale: es })}
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
