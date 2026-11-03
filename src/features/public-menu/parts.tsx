/**
 * Piezas visuales del menú público `/menu/<slug>`.
 *
 * Todas leen el tema desde variables CSS (`--pm-*`) para que cambien de tono
 * claro a oscuro sin duplicar clases, y ninguna depende de la sesión: el menú
 * se comparte con clientes que llegan desde un QR o un enlace de WhatsApp.
 */
import { Clock3, Flame, Plus, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import type { MenuItem } from '../../lib/types';
import { isOrderable, itemImage, priceParts, type PriceParts } from '../../lib/publicMenu';

/** Precio con los centavos en pequeño, como en una carta impresa. */
export function Price({ parts, className }: { parts: PriceParts | null; className?: string }) {
  if (!parts) return <span className={cn('text-sm font-bold', className)}>Consultar</span>;
  return (
    <span className={cn('inline-flex items-start gap-0.5 font-black tabular-nums', className)}>
      <span className="text-lg leading-none">{parts.whole}</span>
      {parts.cents && <span className="mt-0.5 text-[10px] leading-none">{parts.cents}</span>}
    </span>
  );
}

export function priceLabel(item: MenuItem) {
  const parts = priceParts(item);
  return parts ? `${parts.whole}${parts.cents ? `.${parts.cents}` : ''}` : 'Consultar';
}

/** Distintivo compacto (Recomendado, Nuevo, Quedan N). */
export function Badge({
  children,
  tone = 'brand',
  className,
}: {
  children: React.ReactNode;
  tone?: 'brand' | 'soft' | 'ghost';
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase',
        tone === 'brand' && 'bg-[var(--pm-brand)] text-[var(--pm-on-brand)]',
        tone === 'soft' && 'bg-[var(--pm-soft)] text-[var(--pm-on-soft)]',
        tone === 'ghost' &&
          'border border-[var(--pm-line)] bg-[var(--pm-card)]/80 text-[var(--pm-ink)]',
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-1 text-[10px] font-bold tracking-[0.2em] text-[var(--pm-accent)] uppercase">
            {eyebrow}
          </p>
        )}
        <h2 className="text-xl font-black tracking-tight text-[var(--pm-ink)] sm:text-2xl">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

/** Abre la ficha del platillo. */
function DetailLink({
  item,
  href,
  className,
  children,
}: {
  item: MenuItem;
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link to={href} aria-label={`Ver detalles de ${item.name}`} className={className}>
      {children}
    </Link>
  );
}

/** Botón circular para sumar un platillo desde cualquier vista. */
export function AddButton({
  item,
  onAdd,
  disabled,
  className,
  label,
}: {
  item: MenuItem;
  onAdd: () => void;
  disabled?: boolean;
  className?: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onAdd();
      }}
      disabled={disabled}
      aria-label={label ?? `Agregar ${item.name} al pedido`}
      className={cn(
        'grid size-10 place-items-center rounded-full shadow-lg transition active:scale-90 disabled:cursor-not-allowed disabled:opacity-50',
        'bg-[var(--pm-brand)] text-[var(--pm-on-brand)] hover:brightness-110',
        className,
      )}
    >
      <Plus size={18} strokeWidth={2.6} />
    </button>
  );
}

function MetaChip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--pm-line)] bg-[var(--pm-card)]/70 px-2.5 py-1 text-[11px] font-semibold text-[var(--pm-muted)] backdrop-blur">
      {icon}
      {children}
    </span>
  );
}

/** Etiquetas y datos de preparación del platillo. */
export function DishMeta({ item, className }: { item: MenuItem; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {(item.popular || item.isPopular) && (
        <MetaChip
          icon={<Star size={12} className="fill-[var(--pm-accent)] text-[var(--pm-accent)]" />}
        >
          Recomendado
        </MetaChip>
      )}
      {item.isNew && (
        <MetaChip icon={<Flame size={12} className="text-[var(--pm-accent)]" />}>Nuevo</MetaChip>
      )}
      {typeof item.stock === 'number' && item.stock <= 10 && item.stock > 0 && (
        <MetaChip icon={<Clock3 size={12} />}>Quedan {item.stock}</MetaChip>
      )}
      {item.stock === 0 && <MetaChip icon={<Clock3 size={12} />}>Agotado</MetaChip>}
    </div>
  );
}

/**
 * Tarjeta de platillo.
 *
 * - `hero`: portada grande de la recomendación del día.
 * - `grid`: cuadrícula del catálogo, con foto, descripción y botón de suma.
 * - `row`: lista compacta con miniatura (populares y búsquedas).
 */
export function DishCard({
  item,
  href,
  onAdd,
  variant = 'grid',
  ordering = true,
  priority = false,
  className,
}: {
  item: MenuItem;
  href: string;
  onAdd?: () => void;
  variant?: 'hero' | 'grid' | 'row';
  ordering?: boolean;
  priority?: boolean;
  className?: string;
}) {
  const orderable = ordering && isOrderable(item);
  const soldOut = item.stock === 0 || item.available === false;

  if (variant === 'row') {
    return (
      <article
        className={cn(
          'group relative flex items-center gap-3 rounded-2xl border border-[var(--pm-line)] bg-[var(--pm-card)] p-2.5',
          className,
        )}
      >
        <DetailLink item={item} href={href} className="flex min-w-0 flex-1 items-center gap-3">
          <span className="relative block size-20 shrink-0 overflow-hidden rounded-xl bg-[var(--pm-card-strong)]">
            <img
              src={itemImage(item)}
              alt=""
              loading={priority ? 'eager' : 'lazy'}
              decoding="async"
              className={cn(
                'size-full object-cover transition duration-500 group-hover:scale-105',
                soldOut && 'grayscale',
              )}
            />
          </span>
          <span className="min-w-0 flex-1 py-1">
            <span className="flex items-center gap-1.5">
              {item.popular && (
                <Star
                  size={11}
                  className="shrink-0 fill-[var(--pm-accent)] text-[var(--pm-accent)]"
                />
              )}
              <strong className="truncate text-sm font-bold text-[var(--pm-ink)]">
                {item.name}
              </strong>
            </span>
            {item.description && (
              <span className="mt-0.5 line-clamp-1 block text-xs text-[var(--pm-muted)]">
                {item.description}
              </span>
            )}
            <Price parts={priceParts(item)} className="mt-1.5 text-[var(--pm-ink)]" />
          </span>
        </DetailLink>
        {orderable && onAdd && (
          <AddButton item={item} onAdd={onAdd} className="mr-1 size-9 shrink-0 shadow-none" />
        )}
      </article>
    );
  }

  if (variant === 'hero') {
    return (
      <article
        className={cn(
          'group relative isolate overflow-hidden rounded-[26px] border border-[var(--pm-line)] bg-[var(--pm-card)]',
          className,
        )}
      >
        <DetailLink item={item} href={href} className="block">
          <div className="relative aspect-[16/11] w-full overflow-hidden sm:aspect-[16/9]">
            <img
              src={itemImage(item)}
              alt={item.name}
              loading={priority ? 'eager' : 'lazy'}
              decoding="async"
              className="size-full object-cover transition duration-700 group-hover:scale-[1.04]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
            <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
              <Badge className="shadow-lg">
                <Star size={11} className="fill-current" /> Recomendado
              </Badge>
              {soldOut && <Badge tone="ghost">Agotado</Badge>}
            </div>
            <div className="absolute inset-x-0 bottom-0 p-4 pr-16 sm:p-5 sm:pr-20">
              {item.category && (
                <p className="text-[10px] font-bold tracking-[0.2em] text-white/70 uppercase">
                  {item.category}
                </p>
              )}
              <h3 className="mt-1 text-2xl leading-tight font-black tracking-tight text-white sm:text-3xl">
                {item.name}
              </h3>
              {item.description && (
                <p className="mt-1 line-clamp-2 max-w-md text-sm text-white/80">
                  {item.description}
                </p>
              )}
              <div className="mt-3 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-slate-900">
                  <span className="text-[10px] font-bold uppercase">solo</span>
                  <Price parts={priceParts(item)} className="text-slate-900" />
                </span>
              </div>
            </div>
          </div>
        </DetailLink>
        {orderable && onAdd && (
          <AddButton
            item={item}
            onAdd={onAdd}
            className="absolute right-4 bottom-4 size-12 sm:right-5 sm:bottom-5"
          />
        )}
      </article>
    );
  }

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border border-[var(--pm-line)] bg-[var(--pm-card)] transition hover:-translate-y-0.5 hover:shadow-xl',
        soldOut && 'opacity-80',
        className,
      )}
    >
      <DetailLink item={item} href={href} className="flex min-w-0 flex-1 flex-col">
        <span className="relative block aspect-[4/3] w-full overflow-hidden bg-[var(--pm-card-strong)]">
          <img
            src={itemImage(item)}
            alt=""
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            className={cn(
              'size-full object-cover transition duration-500 group-hover:scale-105',
              soldOut && 'grayscale',
            )}
          />
          <span className="absolute top-2 left-2 flex flex-wrap gap-1">
            {item.popular && <Badge className="shadow">★ Top</Badge>}
            {item.isNew && <Badge tone="soft">Nuevo</Badge>}
            {soldOut && <Badge tone="ghost">Agotado</Badge>}
            {!soldOut && typeof item.stock === 'number' && item.stock <= 10 && (
              <Badge tone="ghost">Quedan {item.stock}</Badge>
            )}
          </span>
        </span>
        <span className="flex flex-1 flex-col gap-1 p-3">
          <strong className="line-clamp-1 text-sm font-bold text-[var(--pm-ink)]">
            {item.name}
          </strong>
          {item.description && (
            <span className="line-clamp-2 text-xs leading-5 text-[var(--pm-muted)]">
              {item.description}
            </span>
          )}
          <span className="mt-auto pt-1.5">
            <Price parts={priceParts(item)} className="text-[var(--pm-ink)]" />
          </span>
        </span>
      </DetailLink>
      {orderable && onAdd && (
        <AddButton item={item} onAdd={onAdd} className="absolute right-2.5 bottom-2.5 size-9" />
      )}
    </article>
  );
}

/** Fila de categorías con emoji, desplazable en horizontal. */
export function CategoryChips({
  categories,
  active,
  onSelect,
  className,
}: {
  categories: { name: string; emoji: string }[];
  active?: string;
  onSelect?: (name: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0',
        className,
      )}
    >
      {categories.map((category) => {
        const selected = active === category.name;
        return (
          <button
            key={category.name}
            type="button"
            onClick={() => onSelect?.(category.name)}
            aria-pressed={selected}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-bold whitespace-nowrap transition',
              selected
                ? 'border-[var(--pm-brand)] bg-[var(--pm-brand)] text-[var(--pm-on-brand)]'
                : 'border-[var(--pm-line)] bg-[var(--pm-card)] text-[var(--pm-ink)] hover:border-[var(--pm-brand)]',
            )}
          >
            <span aria-hidden="true">{category.emoji}</span>
            {category.name}
          </button>
        );
      })}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--pm-line)] bg-[var(--pm-card)]/60 px-6 py-14 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-[var(--pm-soft)] text-[var(--pm-on-soft)]">
        {icon ?? <Flame size={22} />}
      </span>
      <h3 className="mt-4 text-base font-bold text-[var(--pm-ink)]">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-[var(--pm-muted)]">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
