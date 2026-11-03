/**
 * Hoja inferior «agregar al pedido»: cantidad, instrucciones especiales y
 * total. Se abre desde cualquier tarjeta del menú público para no perder de
 * vista la carta, y guarda la nota por platillo en el carrito.
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, X } from 'lucide-react';
import type { MenuItem } from '../../lib/types';
import {
  dishHref,
  formatPrice,
  isOrderable,
  itemAmount,
  itemImage,
  priceParts,
} from '../../lib/publicMenu';
import { usePublicMenu } from './context';
import { Price } from './parts';

export function DishSheet({
  item,
  open,
  onOpenChange,
}: {
  item: MenuItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { slug, items, cart, add, setNote, orderable, theme } = usePublicMenu();
  const navigate = useNavigate();
  const saved = cart[item.id];
  const [quantity, setQuantity] = useState(1);
  const [note, setLocalNote] = useState('');

  useEffect(() => {
    setQuantity(1);
    setLocalNote(cart[item.id]?.note ?? '');
    // La nota se reinicia solo al cambiar de platillo, no en cada tecla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onOpenChange]);

  if (!open) return null;

  // Solo se bloquea si está agotado o el negocio no recibe pedidos: los
  // platillos sin precio (o marcados como no disponibles) se pueden consultar.
  const available = orderable && isOrderable(item);
  const total = itemAmount(item) * quantity;
  const related = items
    .filter((candidate) => candidate.id !== item.id && candidate.category === item.category)
    .slice(0, 3);

  const confirm = () => {
    if (!available) return;
    add(item, quantity);
    setNote(item.id, note.trim());
    onOpenChange(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Cerrar"
        onClick={() => onOpenChange(false)}
        className="absolute inset-0 animate-fade-in bg-black/65 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dish-sheet-title"
        className="relative z-10 max-h-[92dvh] w-full max-w-lg animate-dialog-in overflow-y-auto overscroll-contain rounded-t-[28px] border border-[var(--pm-line)] bg-[var(--pm-card-strong)] pb-[max(1rem,env(safe-area-inset-bottom))] text-[var(--pm-ink)] shadow-2xl sm:max-h-[85dvh] sm:rounded-[28px]"
      >
        <h2 id="dish-sheet-title" className="sr-only">
          {item.name}
        </h2>
        <div className="relative">
          <img
            src={itemImage(item)}
            alt={item.name}
            className="h-44 w-full object-cover sm:h-52"
            style={{ backgroundColor: theme.card }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Cerrar"
            className="absolute top-3 right-3 grid size-9 place-items-center rounded-full bg-black/45 text-white backdrop-blur hover:bg-black/60"
          >
            <X size={18} />
          </button>
          <div className="absolute inset-x-0 bottom-0 p-4">
            {item.category && (
              <p className="text-[10px] font-bold tracking-[0.2em] text-white/75 uppercase">
                {item.category}
              </p>
            )}
            <p aria-hidden="true" className="text-xl font-black text-white sm:text-2xl">
              {item.name}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-white/95 px-2.5 py-1">
                <Price parts={priceParts(item)} className="text-slate-900" />
              </span>
              {saved && (
                <span className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur">
                  Ya tienes {saved.quantity} en tu pedido
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-5 p-4 sm:p-5">
          {item.description && (
            <p className="text-sm leading-6 text-[var(--pm-muted)]">{item.description}</p>
          )}
          {!available && (
            <p className="rounded-xl border border-amber-300/40 bg-amber-300/10 px-3 py-2 text-xs font-semibold text-amber-600">
              {item.stock === 0
                ? 'Este platillo se agotó por hoy.'
                : 'Este negocio no recibe pedidos desde el menú digital.'}
            </p>
          )}

          <div>
            <label
              htmlFor="dish-sheet-note"
              className="mb-1.5 block text-[10px] font-bold tracking-[0.18em] text-[var(--pm-accent)] uppercase"
            >
              Instrucciones especiales
            </label>
            <textarea
              id="dish-sheet-note"
              value={note}
              onChange={(event) => setLocalNote(event.target.value)}
              rows={2}
              maxLength={160}
              placeholder="Sin cebolla, término medio, sin azúcar…"
              className="w-full resize-none rounded-xl border border-[var(--pm-line)] bg-[var(--pm-surface)] px-3 py-2.5 text-sm text-[var(--pm-ink)] outline-none placeholder:text-[var(--pm-muted)] focus:border-[var(--pm-brand)]"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-1 rounded-full border border-[var(--pm-line)] p-1">
              <button
                type="button"
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                aria-label="Quitar uno"
                disabled={quantity <= 1}
                className="grid size-9 place-items-center rounded-full hover:bg-[var(--pm-surface)] disabled:opacity-40"
              >
                <Minus size={16} />
              </button>
              <span aria-live="polite" className="w-7 text-center text-sm font-black tabular-nums">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((value) => Math.min(99, value + 1))}
                aria-label="Agregar uno"
                disabled={!available}
                className="grid size-9 place-items-center rounded-full hover:bg-[var(--pm-surface)] disabled:opacity-40"
              >
                <Plus size={16} />
              </button>
            </div>
            <button
              type="button"
              onClick={confirm}
              disabled={!available}
              className="inline-flex min-h-12 flex-1 items-center justify-between gap-3 rounded-full bg-[var(--pm-brand)] px-4 text-sm font-bold text-[var(--pm-on-brand)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:min-w-52"
            >
              <span>Agregar al pedido</span>
              <strong className="tabular-nums">{formatPrice(total)}</strong>
            </button>
          </div>

          {related.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] font-bold tracking-[0.18em] text-[var(--pm-accent)] uppercase">
                Va bien con
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {related.map((candidate) => (
                  <Link
                    key={candidate.id}
                    to={dishHref(slug, candidate)}
                    onClick={() => onOpenChange(false)}
                    className="flex w-40 shrink-0 items-center gap-2 rounded-xl border border-[var(--pm-line)] bg-[var(--pm-surface)] p-1.5"
                  >
                    <img
                      src={itemImage(candidate)}
                      alt=""
                      className="size-11 shrink-0 rounded-lg object-cover"
                    />
                    <span className="min-w-0">
                      <span className="line-clamp-2 block text-[11px] leading-tight font-bold text-[var(--pm-ink)]">
                        {candidate.name}
                      </span>
                      <span className="text-[10px] font-semibold text-[var(--pm-muted)]">
                        {formatPrice(itemAmount(candidate))}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              navigate(dishHref(slug, item));
            }}
            className="w-full text-center text-xs font-semibold text-[var(--pm-muted)] underline-offset-4 hover:underline"
          >
            Ver la ficha completa del platillo
          </button>
        </div>
      </div>
    </div>
  );
}
