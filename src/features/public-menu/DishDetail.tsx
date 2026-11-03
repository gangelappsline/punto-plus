/**
 * Detalle del platillo: `/menu/<slug>/platillo/<platillo>`.
 *
 * Foto grande, descripción, precio, notas, cantidad y sugerencias de la misma
 * categoría. Funciona también con enlaces viejos que usan el id del platillo.
 */
import { useState } from 'react';
import { ArrowLeft, Flame, Minus, Plus, Sparkles, Tag } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  catalogHref,
  categoryHref,
  dishHref,
  findDish,
  formatPrice,
  isOrderable,
  itemAmount,
  itemImage,
  priceParts,
} from '../../lib/publicMenu';
import { usePublicMenu } from './context';
import { Badge, DishCard, EmptyState, Price } from './parts';

export function DishDetail() {
  const { dishSlug: routeDish } = useParams<{ dishSlug?: string }>();
  const { business, slug, items, cart, add, setNote, orderable } = usePublicMenu();
  const navigate = useNavigate();
  const item = routeDish ? findDish(items, routeDish) : undefined;
  const [quantity, setQuantity] = useState(1);
  const [note, setLocalNote] = useState(cart[item?.id ?? '']?.note ?? '');
  const [feedback, setFeedback] = useState('');

  if (!item) {
    return (
      <main className="mx-auto w-full max-w-3xl px-5 pt-8 pb-32 sm:px-8">
        <EmptyState
          title="No encontramos este platillo"
          description="Puede que el negocio lo haya quitado de la carta. Revisa el menú completo."
          action={
            <Link
              to={catalogHref(slug)}
              className="rounded-full bg-[var(--pm-brand)] px-4 py-2.5 text-xs font-bold text-[var(--pm-on-brand)]"
            >
              Ver la carta
            </Link>
          }
        />
      </main>
    );
  }

  const available = orderable && isOrderable(item);
  const total = itemAmount(item) * quantity;
  const related = items
    .filter((candidate) => candidate.id !== item.id && candidate.category === item.category)
    .slice(0, 4);
  const saved = cart[item.id];

  const addToOrder = () => {
    if (!available) return;
    add(item, quantity);
    setNote(item.id, note.trim());
    setFeedback(`Se agregaron ${quantity} ${quantity === 1 ? 'pieza' : 'piezas'} a tu pedido`);
    setQuantity(1);
    setLocalNote('');
  };

  return (
    <main className="pb-32">
      {/* Foto a sangre con regreso y categoría */}
      <div className="relative">
        <img
          src={itemImage(item)}
          alt={item.name}
          className="h-[42dvh] max-h-[420px] min-h-56 w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--pm-surface)] via-[var(--pm-surface)]/20 to-black/40" />
        <div className="absolute inset-x-0 top-0 mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-5 pt-4 sm:px-8">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Regresar"
            className="grid size-10 place-items-center rounded-full border border-white/20 bg-black/35 text-white backdrop-blur hover:bg-black/50"
          >
            <ArrowLeft size={18} />
          </button>
          {item.category && (
            <Link
              to={categoryHref(slug, item.category)}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/35 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur hover:bg-black/50"
            >
              <Tag size={12} /> {item.category}
            </Link>
          )}
        </div>
      </div>

      <div className="mx-auto -mt-10 w-full max-w-3xl px-5 sm:px-8">
        <div className="relative rounded-3xl border border-[var(--pm-line)] bg-[var(--pm-card)] p-5 shadow-xl sm:p-6">
          <div className="flex flex-wrap items-center gap-1.5">
            {item.popular && (
              <Badge>
                <Sparkles size={11} /> Recomendado
              </Badge>
            )}
            {item.isNew && (
              <Badge tone="soft">
                <Flame size={11} /> Nuevo
              </Badge>
            )}
            {!available && <Badge tone="ghost">Agotado</Badge>}
            {available && typeof item.stock === 'number' && item.stock <= 10 && (
              <Badge tone="ghost">Quedan {item.stock}</Badge>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <h1 className="text-balance text-2xl leading-tight font-black tracking-tight text-[var(--pm-ink)] sm:text-3xl">
              {item.name}
            </h1>
            <Price parts={priceParts(item)} className="text-[var(--pm-ink)]" />
          </div>
          {item.description && (
            <p className="mt-3 text-sm leading-6 text-[var(--pm-muted)]">{item.description}</p>
          )}

          {saved && (
            <p className="mt-4 rounded-xl bg-[var(--pm-soft)] px-3 py-2 text-xs font-semibold text-[var(--pm-on-soft)]">
              Ya tienes {saved.quantity} en tu pedido
              {saved.note ? ` · Nota: ${saved.note}` : ''}
            </p>
          )}

          <div className="mt-5 border-t border-[var(--pm-line)] pt-5">
            <label
              htmlFor="dish-note"
              className="mb-1.5 block text-[10px] font-bold tracking-[0.18em] text-[var(--pm-accent)] uppercase"
            >
              Instrucciones especiales
            </label>
            <textarea
              id="dish-note"
              value={note}
              onChange={(event) => setLocalNote(event.target.value)}
              rows={2}
              maxLength={160}
              placeholder="Sin cebolla, término medio, sin azúcar…"
              className="w-full resize-none rounded-xl border border-[var(--pm-line)] bg-[var(--pm-surface)] px-3 py-2.5 text-sm text-[var(--pm-ink)] outline-none placeholder:text-[var(--pm-muted)] focus:border-[var(--pm-brand)]"
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
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
              onClick={addToOrder}
              disabled={!available}
              className="inline-flex min-h-12 flex-1 items-center justify-between gap-3 rounded-full bg-[var(--pm-brand)] px-5 text-sm font-bold text-[var(--pm-on-brand)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span>{available ? 'Agregar al pedido' : 'No disponible'}</span>
              <strong className="tabular-nums">{formatPrice(total)}</strong>
            </button>
          </div>
          <p
            aria-live="polite"
            className="mt-2 min-h-4 text-xs font-semibold text-[var(--pm-accent)]"
          >
            {feedback}
          </p>
          {feedback && (
            <Link
              to={`/menu/${encodeURIComponent(slug)}/carrito`}
              className="text-xs font-bold text-[var(--pm-ink)] underline underline-offset-4"
            >
              Revisar mi pedido →
            </Link>
          )}
        </div>

        {/* Datos del negocio */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--pm-muted)]">
          <Link to={`/menu/${encodeURIComponent(slug)}`} className="font-bold hover:underline">
            {business.name}
          </Link>
          {business.openingHours && <span>{business.openingHours}</span>}
          {business.address && <span>{business.address}</span>}
        </div>

        {related.length > 0 && (
          <section className="mt-9">
            <h2 className="mb-3 text-lg font-black tracking-tight text-[var(--pm-ink)]">
              También te puede gustar
            </h2>
            <div className="grid grid-cols-2 gap-2.5">
              {related.map((candidate) => (
                <DishCard
                  key={candidate.id}
                  item={candidate}
                  href={dishHref(slug, candidate)}
                  variant="grid"
                  ordering={orderable}
                  onAdd={() => orderable && add(candidate)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
