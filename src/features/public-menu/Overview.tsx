/**
 * Portada del menú público: `/menu/<slug>`.
 *
 * Saludo según la hora, identidad del negocio, recomendación del día,
 * categorías, los más pedidos y el bloque para ordenar por WhatsApp.
 */
import { useMemo } from 'react';
import { ArrowRight, ChevronRight, Clock3, MapPin, Sparkles, Utensils } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  cartHref,
  catalogHref,
  categoryHref,
  dishHref,
  greetingFor,
  popularItems,
} from '../../lib/publicMenu';
import { usePublicMenu } from './context';
import { ContactButtons } from './PublicMenuLayout';
import { DishCard, SectionHeading } from './parts';

export function Overview() {
  const { business, slug, items, categories, add, openDish, orderable } = usePublicMenu();
  const featured = useMemo(
    () => items.find((item) => item.popular || item.isPopular) ?? items[0],
    [items],
  );
  const popular = useMemo(() => popularItems(items, 8), [items]);
  const categoryPreview = useMemo(
    () =>
      categories.map((category) => ({
        ...category,
        items: items.filter((item) => item.category === category.name),
      })),
    [categories, items],
  );
  const greeting = greetingFor();
  const phone = business.phoneNumbers?.length ? business.phoneNumbers.length : 0;

  return (
    <main className="pb-32">
      {/* Portada */}
      <header className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10" style={{ background: 'var(--pm-hero)' }} />
        {business.banner && (
          <img
            src={business.banner}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 -z-10 size-full object-cover opacity-25"
          />
        )}
        <div className="absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-black/40 to-transparent" />

        <div className="mx-auto w-full max-w-3xl px-5 pt-6 pb-8 sm:px-8 sm:pt-8">
          <div className="flex items-center justify-between gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-bold tracking-wide text-white/80 backdrop-blur transition hover:bg-white/10"
            >
              PUNTO PLUS
            </Link>
            <a
              href={cartHref(slug)}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-white/80 backdrop-blur transition hover:bg-white/10"
            >
              Mi pedido
            </a>
          </div>

          <p className="mt-7 text-xs font-semibold tracking-[0.2em] text-white/55 uppercase">
            {greeting}
          </p>
          <div className="mt-3 flex items-center gap-4">
            <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/20 bg-white/10 shadow-2xl backdrop-blur sm:size-18">
              {business.logo ? (
                <img
                  src={business.logo}
                  alt={`Logo de ${business.name}`}
                  className="size-full object-cover"
                />
              ) : (
                <span className="text-3xl" aria-hidden="true">
                  🍽️
                </span>
              )}
            </span>
            <div className="min-w-0">
              <h1 className="text-balance text-3xl leading-[1.05] font-black tracking-tight text-white sm:text-4xl">
                {business.name}
              </h1>
              {(business.description || business.businessType) && (
                <p className="mt-1.5 line-clamp-2 text-sm text-white/70">
                  {business.description || business.businessType}
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-white/65">
            {business.openingHours && (
              <span className="inline-flex items-center gap-1.5">
                <Clock3 size={13} /> {business.openingHours}
              </span>
            )}
            {(business.address || business.location) && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={13} /> {business.address || business.location}
              </span>
            )}
            {business.deliveryAvailable && <span>· Reparto a domicilio</span>}
            {phone > 0 && (
              <span>
                · {phone} {phone === 1 ? 'teléfono' : 'teléfonos'}
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl px-5 sm:px-8">
        {/* Recomendación del día */}
        {featured && (
          <section className="-mt-4">
            <DishCard
              item={featured}
              href={dishHref(slug, featured)}
              variant="hero"
              priority
              ordering={orderable}
              onAdd={() => openDish(featured)}
            />
          </section>
        )}

        {business.menuPromo?.text && (
          <section
            aria-label="Promoción del menú"
            className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--pm-line)] bg-[var(--pm-soft)] px-4 py-3 text-[var(--pm-on-soft)]"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/40">
              <Sparkles size={17} />
            </span>
            <div className="min-w-0 flex-1">
              {business.menuPromo.note && (
                <p className="text-[10px] font-bold tracking-[0.14em] uppercase opacity-70">
                  {business.menuPromo.note}
                </p>
              )}
              <p className="text-sm font-bold">{business.menuPromo.text}</p>
            </div>
            {business.menuPromo.price && (
              <strong className="text-lg font-black">
                {business.menuPromo.price.startsWith('$')
                  ? business.menuPromo.price
                  : `$${business.menuPromo.price}`}
              </strong>
            )}
          </section>
        )}

        {/* Categorías */}
        {categories.length > 0 && (
          <section className="mt-8">
            <SectionHeading
              title="Categorías"
              action={
                <Link
                  to={catalogHref(slug)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[var(--pm-accent)] hover:underline"
                >
                  Ver todo <ChevronRight size={14} />
                </Link>
              }
            />
            <div className="-mx-5 grid grid-cols-3 gap-2 sm:mx-0 sm:grid-cols-4 lg:grid-cols-6">
              {categoryPreview.map((category) => (
                <Link
                  key={category.name}
                  to={categoryHref(slug, category.name)}
                  className="group flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-[var(--pm-line)] bg-[var(--pm-card)] px-2 py-3.5 text-center transition hover:-translate-y-0.5 hover:border-[var(--pm-brand)]"
                >
                  <span className="text-2xl transition group-hover:scale-110" aria-hidden="true">
                    {category.emoji}
                  </span>
                  <span className="line-clamp-2 text-[11px] leading-tight font-bold text-[var(--pm-ink)]">
                    {category.name}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Populares */}
        {popular.length > 0 && (
          <section className="mt-9">
            <SectionHeading
              eyebrow="Los favoritos"
              title="🔥 Populares"
              action={
                <Link
                  to={catalogHref(slug)}
                  className="text-xs font-bold text-[var(--pm-accent)] hover:underline"
                >
                  Ver más
                </Link>
              }
            />
            <div className="grid gap-2.5 sm:grid-cols-2">
              {popular.map((item, index) => (
                <DishCard
                  key={item.id}
                  item={item}
                  href={dishHref(slug, item)}
                  variant="row"
                  priority={index < 2}
                  ordering={orderable}
                  onAdd={() => add(item)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Carta por categoría */}
        {categoryPreview
          .filter((category) => category.items.length > 0)
          .map((category) => (
            <section key={category.name} className="mt-9">
              <SectionHeading
                title={`${category.emoji} ${category.name}`}
                action={
                  <Link
                    to={categoryHref(slug, category.name)}
                    className="text-xs font-bold text-[var(--pm-accent)] hover:underline"
                  >
                    Ver {category.items.length}
                  </Link>
                }
              />
              <div className="grid gap-2.5 sm:grid-cols-2">
                {category.items.slice(0, 4).map((item) => (
                  <DishCard
                    key={item.id}
                    item={item}
                    href={dishHref(slug, item)}
                    variant="row"
                    ordering={orderable}
                    onAdd={() => add(item)}
                  />
                ))}
              </div>
              {category.items.length > 4 && (
                <Link
                  to={categoryHref(slug, category.name)}
                  className="mt-2.5 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--pm-line)] py-2.5 text-xs font-bold text-[var(--pm-muted)] hover:border-[var(--pm-brand)] hover:text-[var(--pm-accent)]"
                >
                  Ver {category.items.length - 4} más en {category.name}
                  <ArrowRight size={13} />
                </Link>
              )}
            </section>
          ))}

        {/* Pedido por WhatsApp */}
        <section className="mt-10 overflow-hidden rounded-3xl border border-[var(--pm-line)] bg-[var(--pm-card)]">
          <div className="p-5 sm:p-6">
            <p className="text-[10px] font-bold tracking-[0.2em] text-[var(--pm-accent)] uppercase">
              Sin apps, sin registro
            </p>
            <h2 className="mt-1.5 text-2xl font-black tracking-tight text-[var(--pm-ink)]">
              ¿Listo para ordenar?
            </h2>
            <p className="mt-1.5 max-w-md text-sm leading-6 text-[var(--pm-muted)]">
              Arma tu pedido y envíalo directo a WhatsApp de {business.name}.
            </p>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-[var(--pm-muted)]">
              {business.openingHours && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 size={13} /> {business.openingHours}
                </span>
              )}
              {(business.address || business.location) && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={13} /> {business.address || business.location}
                </span>
              )}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {orderable ? (
                <Link
                  to={catalogHref(slug)}
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--pm-brand)] px-5 py-3 text-sm font-bold text-[var(--pm-on-brand)] transition hover:brightness-110"
                >
                  <Utensils size={16} /> Armar mi pedido
                </Link>
              ) : (
                <span className="rounded-full border border-[var(--pm-line)] px-4 py-2.5 text-xs font-bold text-[var(--pm-muted)]">
                  Pedidos cerrados por ahora
                </span>
              )}
              <ContactButtons />
            </div>
          </div>
        </section>

        {/* Pie */}
        <footer className="mt-10 mb-4 flex flex-col items-center gap-2 border-t border-[var(--pm-line)] pt-6 text-center text-[11px] text-[var(--pm-muted)]">
          <span className="flex items-center gap-1.5 font-bold tracking-[0.16em] text-[var(--pm-ink)]">
            {business.logo ? (
              <img src={business.logo} alt="" className="size-5 rounded-md object-cover" />
            ) : null}
            {business.name.toUpperCase()}
          </span>
          <span>
            {business.businessType ? `${business.businessType} · ` : ''}Menú digital de Punto Plus
          </span>
        </footer>
      </div>
    </main>
  );
}
