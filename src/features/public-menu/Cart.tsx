/**
 * Pedido: `/menu/<slug>/carrito`.
 *
 * Cantidades, notas por platillo, forma de entrega y total. Al enviar se abre
 * WhatsApp con el pedido ya escrito y luego se muestra la confirmación en la
 * misma pantalla (`?enviado=1`), así el cliente puede volver a enviarlo si el
 * navegador no abrió la app.
 */
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, MessageCircle, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { orderModes } from '../../lib/types';
import type { OrderMode } from '../../lib/types';
import {
  businessPhone,
  cartHref,
  catalogHref,
  deliveryFeeFor,
  formatPrice,
  itemImage,
  orderMessage,
  orderModeLabels,
  priceParts,
  whatsAppHref,
} from '../../lib/publicMenu';
import { usePublicMenu } from './context';
import { EmptyState, Price } from './parts';

const modeIcons: Record<OrderMode, string> = {
  pickup: '🛍️',
  delivery: '🛵',
  dinein: '🍽️',
};

export function Cart() {
  const { business, slug, lines, subtotal, cart, setQuantity, setNote, remove, clear, orderable } =
    usePublicMenu();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const phone = businessPhone(business);
  const sent = params.get('enviado') === '1';
  const [sentAt, setSentAt] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [mode, setMode] = useState<OrderMode | null>(null);

  const modes = useMemo(
    () => business.orderModes?.filter(Boolean) ?? [...orderModes],
    [business.orderModes],
  );
  const fee = deliveryFeeFor(business, mode);
  const total = subtotal + fee;
  const message = orderMessage({ business, lines, mode, customerName, deliveryFee: fee });
  const waHref = phone ? whatsAppHref(phone, message) : null;

  useEffect(() => {
    if (!sent || sentAt) return;
    setSentAt(
      new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false }),
    );
    // El pedido ya salió del dispositivo: se vacía para no enviarlo dos veces.
    clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sent]);

  if (sent) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col items-center justify-center px-6 pb-20 text-center">
        <span className="grid size-20 place-items-center rounded-full bg-[var(--pm-brand)] text-[var(--pm-on-brand)] shadow-xl">
          <Check size={36} strokeWidth={3} />
        </span>
        <h1 className="mt-6 text-2xl font-black tracking-tight text-[var(--pm-ink)]">
          ¡Pedido enviado!
        </h1>
        <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--pm-muted)]">
          Tu pedido se abrió en WhatsApp a las {sentAt}. Envíalo en la conversación para que{' '}
          {business.name} lo reciba. Si no se abrió, usa el botón de abajo.
        </p>
        <div className="mt-6 flex w-full flex-col gap-2">
          {waHref && (
            <a
              href={waHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--pm-brand)] px-5 py-3 text-sm font-bold text-[var(--pm-on-brand)]"
            >
              <MessageCircle size={17} /> Reenviar por WhatsApp
            </a>
          )}
          <button
            type="button"
            onClick={() => navigate(catalogHref(slug), { replace: true })}
            className="rounded-full border border-[var(--pm-line)] px-5 py-3 text-sm font-bold text-[var(--pm-ink)]"
          >
            Seguir viendo la carta
          </button>
        </div>
        <Link
          to={`/menu/${encodeURIComponent(slug)}`}
          className="mt-6 text-xs font-semibold text-[var(--pm-muted)] underline-offset-4 hover:underline"
        >
          Volver a la portada
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-5 pt-4 pb-40 sm:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Regresar"
          className="grid size-10 shrink-0 place-items-center rounded-full border border-[var(--pm-line)] bg-[var(--pm-card)] text-[var(--pm-ink)]"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-semibold tracking-wide text-[var(--pm-muted)] uppercase">
            {business.name}
          </p>
          <h1 className="text-lg font-black tracking-tight text-[var(--pm-ink)]">Tu pedido</h1>
        </div>
        {lines.length > 0 && (
          <button
            type="button"
            onClick={clear}
            className="text-[11px] font-bold text-[var(--pm-muted)] hover:text-red-500"
          >
            Vaciar
          </button>
        )}
      </div>

      {lines.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={<ShoppingBag size={22} />}
            title="Tu pedido está vacío"
            description="Explora la carta y agrega tus antojos."
            action={
              <Link
                to={catalogHref(slug)}
                className="rounded-full bg-[var(--pm-brand)] px-4 py-2.5 text-xs font-bold text-[var(--pm-on-brand)]"
              >
                Ver la carta
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {lines.map((line) => (
            <article
              key={line.item.id}
              className="rounded-2xl border border-[var(--pm-line)] bg-[var(--pm-card)] p-3"
            >
              <div className="flex gap-3">
                <img
                  src={itemImage(line.item)}
                  alt=""
                  className="size-18 shrink-0 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-bold text-[var(--pm-ink)]">
                        {line.item.name}
                      </h2>
                      <p className="mt-0.5 text-[11px] text-[var(--pm-muted)]">
                        {line.item.category}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(line.item.id)}
                      aria-label={`Quitar ${line.item.name} del pedido`}
                      className="grid size-7 shrink-0 place-items-center rounded-full text-[var(--pm-muted)] hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-1 rounded-full border border-[var(--pm-line)] p-0.5">
                      <button
                        type="button"
                        onClick={() => setQuantity(line.item.id, line.quantity - 1)}
                        aria-label={`Quitar uno de ${line.item.name}`}
                        className="grid size-7 place-items-center rounded-full hover:bg-[var(--pm-surface)]"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-6 text-center text-xs font-black tabular-nums">
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity(line.item.id, line.quantity + 1)}
                        aria-label={`Agregar uno de ${line.item.name}`}
                        className="grid size-7 place-items-center rounded-full hover:bg-[var(--pm-surface)]"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <Price parts={priceParts(line.item)} className="text-[var(--pm-ink)]" />
                  </div>
                </div>
              </div>
              <input
                type="text"
                value={cart[line.item.id]?.note ?? ''}
                onChange={(event) => setNote(line.item.id, event.target.value)}
                placeholder="Nota para este platillo (opcional)"
                aria-label={`Nota para ${line.item.name}`}
                maxLength={160}
                className="mt-2.5 w-full rounded-lg border border-[var(--pm-line)] bg-[var(--pm-surface)] px-3 py-2 text-xs text-[var(--pm-ink)] outline-none placeholder:text-[var(--pm-muted)] focus:border-[var(--pm-brand)]"
              />
            </article>
          ))}

          {/* Entrega */}
          <section className="rounded-2xl border border-[var(--pm-line)] bg-[var(--pm-card)] p-4">
            <h2 className="text-[10px] font-bold tracking-[0.18em] text-[var(--pm-accent)] uppercase">
              ¿Cómo lo quieres?
            </h2>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {modes.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMode(mode === option ? null : option)}
                  aria-pressed={mode === option}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold transition ${
                    mode === option
                      ? 'border-[var(--pm-brand)] bg-[var(--pm-brand)] text-[var(--pm-on-brand)]'
                      : 'border-[var(--pm-line)] text-[var(--pm-ink)]'
                  }`}
                >
                  <span aria-hidden="true">{modeIcons[option]}</span>
                  {orderModeLabels[option]}
                  {option === 'delivery' && business.deliveryFee
                    ? ` · ${formatPrice(deliveryFeeFor(business, 'delivery'))}`
                    : ''}
                </button>
              ))}
            </div>
            <label className="mt-3 block">
              <span className="sr-only">Tu nombre</span>
              <input
                type="text"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Tu nombre (opcional)"
                maxLength={60}
                className="w-full rounded-lg border border-[var(--pm-line)] bg-[var(--pm-surface)] px-3 py-2.5 text-sm text-[var(--pm-ink)] outline-none placeholder:text-[var(--pm-muted)] focus:border-[var(--pm-brand)]"
              />
            </label>
          </section>

          {/* Resumen */}
          <section className="rounded-2xl border border-[var(--pm-line)] bg-[var(--pm-card)] p-4 text-sm">
            <div className="flex justify-between text-[var(--pm-muted)]">
              <span>Subtotal</span>
              <span className="font-semibold tabular-nums text-[var(--pm-ink)]">
                {formatPrice(subtotal)}
              </span>
            </div>
            {fee > 0 && (
              <div className="mt-1.5 flex justify-between text-[var(--pm-muted)]">
                <span>Envío</span>
                <span className="font-semibold tabular-nums text-[var(--pm-ink)]">
                  {formatPrice(fee)}
                </span>
              </div>
            )}
            <div className="mt-3 flex items-end justify-between border-t border-[var(--pm-line)] pt-3">
              <span>
                <span className="block font-bold text-[var(--pm-ink)]">Total</span>
                <span className="text-[10px] text-[var(--pm-muted)]">
                  Pago al recibir tu pedido
                </span>
              </span>
              <strong className="text-xl font-black tabular-nums text-[var(--pm-ink)]">
                {formatPrice(total)}
              </strong>
            </div>
            {business.paymentMethods?.length ? (
              <p className="mt-2 text-[11px] text-[var(--pm-muted)]">
                Pagas con: {business.paymentMethods.join(' · ')}
              </p>
            ) : null}
          </section>
        </div>
      )}

      {lines.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--pm-line)] bg-[var(--pm-card)]/95 px-4 pt-3 pb-[max(0.9rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
          <div className="mx-auto w-full max-w-3xl">
            {waHref ? (
              <a
                href={waHref}
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  if (!orderable) return;
                  // La navegación a `?enviado=1` ocurre aunque WhatsApp abra otra pestaña.
                  window.setTimeout(
                    () => navigate(`${cartHref(slug)}?enviado=1`, { replace: true }),
                    0,
                  );
                }}
                className="flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl bg-[var(--pm-brand)] px-5 text-[var(--pm-on-brand)] transition active:scale-[0.99]"
              >
                <span className="inline-flex items-center gap-2 text-sm font-bold">
                  <MessageCircle size={18} /> Enviar pedido por WhatsApp
                </span>
                <strong className="text-base font-black tabular-nums">{formatPrice(total)}</strong>
              </a>
            ) : (
              <p className="rounded-xl bg-[var(--pm-soft)] px-4 py-3 text-center text-xs font-bold text-[var(--pm-on-soft)]">
                Este negocio no tiene WhatsApp registrado. Llámalo para completar tu pedido.
              </p>
            )}
            {!orderable && (
              <p className="mt-2 text-center text-[11px] font-semibold text-amber-600">
                El negocio no recibe pedidos desde el menú digital.
              </p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
