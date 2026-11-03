/**
 * Carta completa: `/menu/<slug>/menu`.
 *
 * Lista todos los platillos agrupados por categoría, con búsqueda instantánea
 * y accesos rápidos a cada sección. La categoría activa se guarda en la URL
 * (`?cat=`) para que el enlace sea compartible, igual que en la referencia.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Search, X } from 'lucide-react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { catalogHref, categorySlug, dishHref } from '../../lib/publicMenu';
import { usePublicMenu } from './context';
import { DishCard, EmptyState } from './parts';

export function Catalog() {
  const { business, slug, items, categories, add, orderable } = usePublicMenu();
  const navigate = useNavigate();
  const { categorySlug: routeCategory } = useParams<{ categorySlug?: string }>();
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') ?? '');
  const activeSlug = routeCategory || params.get('cat') || '';
  const active =
    categories.find((category) => categorySlug(category.name) === activeSlug)?.name ?? '';
  const sections = useRef<Record<string, HTMLElement | null>>({});

  const visible = useMemo(() => {
    const search = query.trim().toLocaleLowerCase('es-MX');
    const byCategory = active ? items.filter((item) => item.category === active) : items;
    if (!search) return byCategory;
    return byCategory.filter((item) =>
      `${item.name} ${item.description ?? ''} ${item.category ?? ''}`
        .toLocaleLowerCase('es-MX')
        .includes(search),
    );
  }, [active, items, query]);

  const groups = useMemo(() => {
    const names = active ? [active] : categories.map((category) => category.name);
    return names
      .map((name) => ({
        name,
        emoji: categories.find((category) => category.name === name)?.emoji ?? '🍴',
        items: visible.filter((item) => (item.category ?? '') === name),
      }))
      .filter((group) => group.items.length > 0);
  }, [active, categories, visible]);

  const withoutCategory = useMemo(
    () =>
      visible.filter((item) => !item.category || !categories.some((c) => c.name === item.category)),
    [categories, visible],
  );

  useEffect(() => {
    if (!active) return;
    const node = sections.current[active];
    if (node && typeof node.scrollIntoView === 'function') {
      node.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }, [active]);

  const select = (name: string) => {
    const search = query ? `?q=${encodeURIComponent(query)}` : '';
    navigate(
      `/menu/${encodeURIComponent(slug)}/menu${name ? `/categoria/${categorySlug(name)}` : ''}${search}`,
    );
  };

  return (
    <main className="min-h-dvh pb-32">
      <header className="sticky top-0 z-20 border-b border-[var(--pm-line)] bg-[var(--pm-surface)]/90 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-3xl px-5 pt-4 pb-3 sm:px-8">
          <div className="flex items-center gap-3">
            <Link
              to={`/menu/${encodeURIComponent(slug)}`}
              aria-label="Volver a la portada del menú"
              className="grid size-10 shrink-0 place-items-center rounded-full border border-[var(--pm-line)] bg-[var(--pm-card)] text-[var(--pm-ink)]"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-semibold tracking-wide text-[var(--pm-muted)] uppercase">
                {business.name}
              </p>
              <p className="truncate text-lg font-black tracking-tight text-[var(--pm-ink)]">
                {active
                  ? `${categories.find((c) => c.name === active)?.emoji} ${active}`
                  : 'La carta'}
              </p>
              <h1 className="sr-only">
                {active ? `${active} · ${business.name}` : `La carta de ${business.name}`}
              </h1>
            </div>
            <span className="rounded-full border border-[var(--pm-line)] px-2.5 py-1 text-[11px] font-bold text-[var(--pm-muted)]">
              {visible.length}
            </span>
          </div>

          <div
            role="search"
            className="mt-3 flex h-11 items-center gap-2 rounded-full border border-[var(--pm-line)] bg-[var(--pm-card)] px-4 focus-within:border-[var(--pm-brand)]"
          >
            <Search size={17} className="shrink-0 text-[var(--pm-muted)]" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar en la carta"
              aria-label="Buscar platillos"
              className="min-w-0 flex-1 bg-transparent text-sm text-[var(--pm-ink)] outline-none placeholder:text-[var(--pm-muted)]"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Limpiar búsqueda"
                className="grid size-6 place-items-center rounded-full text-[var(--pm-muted)] hover:bg-[var(--pm-surface)]"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="scrollbar-none -mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 sm:-mx-8 sm:px-8">
            <button
              type="button"
              onClick={() => select('')}
              aria-pressed={!active}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold whitespace-nowrap transition ${
                !active
                  ? 'border-[var(--pm-brand)] bg-[var(--pm-brand)] text-[var(--pm-on-brand)]'
                  : 'border-[var(--pm-line)] bg-[var(--pm-card)] text-[var(--pm-ink)]'
              }`}
            >
              Todo
            </button>
            {categories.map((category) => (
              <button
                key={category.name}
                type="button"
                onClick={() => select(category.name)}
                aria-pressed={active === category.name}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold whitespace-nowrap transition ${
                  active === category.name
                    ? 'border-[var(--pm-brand)] bg-[var(--pm-brand)] text-[var(--pm-on-brand)]'
                    : 'border-[var(--pm-line)] bg-[var(--pm-card)] text-[var(--pm-ink)]'
                }`}
              >
                <span aria-hidden="true">{category.emoji}</span> {category.name}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl px-5 pt-5 sm:px-8">
        {groups.length === 0 && withoutCategory.length === 0 ? (
          <EmptyState
            icon={<Search size={22} />}
            title="No encontramos platillos"
            description={
              items.length
                ? 'Prueba con otra búsqueda o cambia de categoría.'
                : 'El negocio todavía no publica sus productos. Vuelve pronto.'
            }
            action={
              <Link
                to={catalogHref(slug)}
                onClick={() => {
                  setQuery('');
                  select('');
                }}
                className="rounded-full bg-[var(--pm-brand)] px-4 py-2.5 text-xs font-bold text-[var(--pm-on-brand)]"
              >
                Ver toda la carta
              </Link>
            }
          />
        ) : (
          <div className="space-y-9">
            {groups.map((group) => (
              <section
                key={group.name}
                ref={(node) => {
                  sections.current[group.name] = node;
                }}
                className="scroll-mt-44"
              >
                <div className="mb-3 flex items-end justify-between gap-3">
                  <h2 className="text-xl font-black tracking-tight text-[var(--pm-ink)]">
                    {group.emoji} {group.name}{' '}
                    <span className="ml-1 text-sm font-bold text-[var(--pm-muted)]">
                      {group.items.length}
                    </span>
                  </h2>
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {group.items.map((item) => (
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
              </section>
            ))}

            {withoutCategory.length > 0 && (
              <section>
                <h2 className="mb-3 text-xl font-black tracking-tight text-[var(--pm-ink)]">
                  🍴 Otros
                </h2>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {withoutCategory.map((item) => (
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
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
