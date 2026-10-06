import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ArrowRight,
  Check,
  Clock3,
  Gift,
  Heart,
  MapPin,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Dialog } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { LoyaltyCard } from '../components/LoyaltyCard';
import { useAction, useLoyalty } from '../lib/queries';
import { api } from '../services/api';
import { isDemo } from '../lib/utils';
import type { LoyaltyCard as Card, Promotion } from '../lib/types';
export function QRDialog({
  open,
  onOpenChange,
  name,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
}) {
  const qr = useQuery({
    queryKey: ['qr'],
    queryFn: api.qr,
    enabled: open,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
  });
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!open) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [open]);
  const expired = qr.data?.expiresAt && new Date(qr.data.expiresAt).getTime() <= now;
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Una visita más cerca"
      description="Muestra este código en el negocio al realizar tu compra."
    >
      <div className="qr-panel">
        <div className="qr-person">
          <span className="avatar">{name.slice(0, 1)}</span>
          <h3>{name}</h3>
          <p>Miembro de la comunidad Punto Plus</p>
        </div>
        <div className="qr-code">
          {qr.isPending || qr.isFetching ? (
            <div className="qr-loading">Preparando tu QR…</div>
          ) : qr.isError ? (
            <p role="alert">No pudimos obtener tu código.</p>
          ) : expired ? (
            <div className="expired-qr">
              <Clock3 size={35} />
              <p>Este código expiró</p>
            </div>
          ) : (
            qr.data && (
              <QRCodeSVG
                value={qr.data.token}
                size={210}
                level="M"
                marginSize={2}
                title="Tu código QR de Punto Plus"
              />
            )
          )}
        </div>
        {(qr.isError || expired) && (
          <Button onClick={() => void qr.refetch()} disabled={qr.isFetching}>
            <RefreshCw size={16} />
            Generar nuevo código
          </Button>
        )}
        <div className="qr-safe">
          <ShieldCheck size={15} />
          {isDemo ? 'QR de demostración · sin datos personales' : 'Código seguro y de uso temporal'}
        </div>
        <div className="notice">
          {isDemo
            ? 'Este código funciona únicamente en el modo demo del panel de negocio.'
            : 'El negocio validará tu compra antes de agregar el sello. No compartas este QR públicamente.'}
        </div>
        <div className="qr-steps">
          <span>
            <b>1</b> Visita
          </span>
          <ArrowRight size={13} />
          <span>
            <b>2</b> Muestra tu QR
          </span>
          <ArrowRight size={13} />
          <span>
            <b>3</b> Suma sellos
          </span>
        </div>
      </div>
    </Dialog>
  );
}
export function CardDialog({
  selected,
  onClose,
  onQR,
}: {
  selected: Card | null;
  onClose: () => void;
  onQR: () => void;
}) {
  const { cards } = useLoyalty();
  const card = cards.data?.find((c) => c.id === selected?.id) || selected;
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    setConfirm(false);
  }, [selected?.id]);
  const join = useAction(
    api.join,
    '¡Un nuevo favorito! La tarjeta ya está en tu colección.',
    onClose,
  );
  const redeem = useAction(
    api.redeem,
    isDemo ? '¡Recompensa canjeada en la demostración!' : '¡Disfruta tu recompensa!',
    onClose,
  );
  if (!card) return null;
  const ready = card.stamps >= card.goal;
  return (
    <Dialog
      open={!!selected}
      onOpenChange={(open) => {
        if (!open && !redeem.isPending && !join.isPending) onClose();
      }}
      title={confirm ? 'Un gusto bien merecido' : card.name}
      description={
        confirm
          ? 'Realiza el canje solo cuando estés en el negocio, frente al personal.'
          : card.tagline
      }
    >
      {confirm ? (
        <div className="confirm-panel">
          <span className="confirm-icon">
            <Gift size={35} />
          </span>
          <h3>{card.reward}</h3>
          <p>
            Se utilizarán {card.goal} sellos de tu tarjeta de {card.name}. Esta acción no se puede
            deshacer.
          </p>
          {isDemo && <div className="notice">Canje de demostración. No tiene valor comercial.</div>}
          <Button
            className="full-width"
            disabled={redeem.isPending}
            onClick={() => redeem.mutate(card.id)}
          >
            <Check size={17} />
            {redeem.isPending ? 'Canjeando…' : 'Confirmar canje'}
          </Button>
          <Button
            variant="ghost"
            className="full-width"
            disabled={redeem.isPending}
            onClick={() => setConfirm(false)}
          >
            Todavía no, seguir guardando
          </Button>
        </div>
      ) : (
        <>
          <LoyaltyCard
            card={card}
            onClick={() =>
              card.joined ? (ready ? setConfirm(true) : onQR()) : join.mutate(card.id)
            }
          />
          <div className="card-detail-location">
            <MapPin size={16} />
            {card.location}
            <span>{card.distance}</span>
          </div>
          <div className="detail-reward">
            <Gift size={22} />
            <div>
              <strong>{card.reward}</strong>
              <p>
                {ready
                  ? 'Tu recompensa está lista. Disfrútala en el negocio.'
                  : `Obtén un sello por cada compra. Completa ${card.goal} para ganar.`}
              </p>
            </div>
          </div>
          <Button
            className="full-width"
            disabled={join.isPending}
            onClick={() =>
              !card.joined ? join.mutate(card.id) : ready ? setConfirm(true) : onQR()
            }
          >
            {!card.joined ? (
              <>
                <Heart size={17} />
                {join.isPending ? 'Agregando…' : 'Agregar a mis tarjetas'}
              </>
            ) : ready ? (
              <>
                <Gift size={17} /> Canjear mi recompensa
              </>
            ) : (
              <>
                <QrCode size={17} /> Mostrar mi QR para sumar sellos
              </>
            )}
          </Button>
          <p className="fine-print">
            {isDemo
              ? 'Negocio ficticio para demostración. No válido en establecimientos.'
              : 'Los sellos y recompensas están sujetos a las condiciones del negocio.'}
          </p>
        </>
      )}
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
  const { favorites } = useLoyalty();
  const favorite = useAction(api.toggleFavorite, 'Tus favoritos se actualizaron');
  if (!promotion) return null;
  const saved = favorites.data?.includes(promotion.id);
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
      <div className="promotion-validity">
        <Clock3 size={16} /> Válida hasta el{' '}
        {format(new Date(promotion.expires + 'T12:00:00'), "d 'de' MMMM 'de' yyyy", { locale: es })}
      </div>
      <Button
        className="full-width"
        variant={saved ? 'outline' : 'default'}
        disabled={favorite.isPending}
        onClick={() => favorite.mutate(promotion.id)}
      >
        <Heart size={17} fill={saved ? 'currentColor' : 'none'} />
        {saved ? 'Quitar de favoritos' : 'Guardar para mi próxima visita'}
      </Button>
      {isDemo && (
        <p className="fine-print">Promoción de demostración. No tiene validez comercial.</p>
      )}
    </Dialog>
  );
}
