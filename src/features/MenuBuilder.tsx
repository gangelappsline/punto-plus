import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  Copy,
  ExternalLink,
  ImagePlus,
  Eye,
  Hand,
  Layers,
  MapPin,
  Palette,
  PencilLine,
  Phone,
  Plus,
  Rocket,
  Settings,
  Sparkles,
  Star,
  Trash2,
  Utensils,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { fontStack } from '../components/LoyaltyCard';
import { Button } from '../components/ui/button';
import { useBusiness, usePublishBusinessMenu } from '../lib/queries';
import { useAuth } from '../stores/auth';
import { readImage } from '../lib/image';
import { businessSlug, isDemo, publicMenuUrl } from '../lib/utils';
import {
  cardStyleClass,
  logoShapeClass,
  menuCardStyleOptions,
  menuLayoutOptions,
  menuLogoShapeOptions,
  menuNavStyleOptions,
  menuSurfaceOptions,
  menuTemplateGroups,
  menuTemplates,
  menuTemplateValues,
  menuTheme,
} from '../lib/menuStyles';
import type {
  MenuCardStyle,
  MenuFontFamily,
  MenuLayout,
  MenuLogoShape,
  MenuNavStyle,
  MenuSurface,
} from '../lib/types';
import {
  applyBusinessType,
  builderCategories,
  builderItemId,
  builderPopularItems,
  builderSaves,
  builderStateFromConfig,
  builderStepError,
  builderToConfig,
  builderWhatsAppLink,
  businessTypes,
  emptyBuilderState,
  itemsOfCategory,
  openingHoursLabel,
  orderModeOptions,
  seedCatalog,
  paymentMethodOptions,
  type BuilderItem,
  type BuilderState,
  type OrderMode,
} from '../lib/menuBuilder';

/** Pasos del creador, en el orden en que se arma el menú. */
const builderSteps = [
  {
    title: 'Diseño',
    hint: 'Plantillas, colores y tipografía',
    icon: Palette,
    preview: 'Elige un estilo y míralo al instante en tu menú.',
  },
  {
    title: 'Logo y banner',
    hint: 'Tu marca en la portada del menú',
    icon: ImagePlus,
    preview: 'Tu logo y tu banner ya se ven en la portada.',
  },
  {
    title: 'Categorías',
    hint: 'Las secciones de tu carta',
    icon: Layers,
    preview: 'Cada sección aparece como filtro en tu menú.',
  },
  {
    title: 'Productos',
    hint: 'Precios, fotos y existencias',
    icon: Utensils,
    preview: 'Cada producto se suma a la sección elegida.',
  },
  {
    title: 'Configuración',
    hint: 'Datos, horario, entrega y pago',
    icon: Settings,
    preview: 'Nombre, horario y pagos se reflejan en tu menú.',
  },
] as const;

const fieldClass =
  'w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10';

const dayShort = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/**
 * «Crea tu menú en un minuto».
 *
 * Pantalla de armado rápido pensada para el celular: el formulario ocupa todo
 * el ancho del teléfono y, en pantallas grandes, se dibuja dentro de un marco
 * de 500 px que simula un móvil. Cualquiera puede armarlo (`/crear-menu`);
 * publicarlo requiere una cuenta con negocio, y el código de invitación
 * (`?codigo=…`) viaja con el enlace hasta el registro.
 */
export function MenuBuilder({ publicRoute = false }: { publicRoute?: boolean }) {
  const publish = usePublishBusinessMenu();
  const [searchParams] = useSearchParams();
  const inviteCode = (searchParams.get('codigo') ?? '').trim();
  const location = useLocation();
  const navigate = useNavigate();
  const authenticated = useAuth((s) => Boolean(s.accessToken));
  // En la ruta pública y sin sesión no hay negocio que pedir: se arranca en blanco.
  const needsBusiness = !publicRoute || authenticated || isDemo;
  const business = useBusiness({ enabled: needsBusiness });
  const [state, setState] = useState<BuilderState>(() => emptyBuilderState());
  const [loaded, setLoaded] = useState(false);
  const [step, setStep] = useState(0);
  const [activeCategory, setActiveCategory] = useState('');
  const [published, setPublished] = useState(false);
  const [importedImage, setImportedImage] = useState('');
  // La hoja de configuración se pliega para dejar ver el menú completo.
  const [sheetOpen, setSheetOpen] = useState(true);
  const fileInput = useRef<HTMLInputElement>(null);

  // La pantalla es pública: si no hay sesión (o la API falla) se arranca en
  // blanco en vez de bloquear el creador con un error.
  useEffect(() => {
    if (loaded) return;
    if (!needsBusiness) {
      setLoaded(true);
      return;
    }
    if (business.isSuccess) {
      if (business.data) setState(builderStateFromConfig(business.data));
      setLoaded(true);
      return;
    }
    if (business.isError) setLoaded(true);
  }, [needsBusiness, business.isSuccess, business.isError, business.data, loaded]);

  useEffect(() => {
    if (!publicRoute) return;
    document.title = 'Crea el menú de tu negocio · Punto Plus';
  }, [publicRoute]);

  useEffect(() => {
    // Solo se corrige la sección activa si desapareció de la lista: así una
    // sección recién creada (todavía sin productos) se queda seleccionada.
    if (!state.categories.length) {
      if (activeCategory) setActiveCategory('');
      return;
    }
    if (!state.categories.includes(activeCategory)) setActiveCategory(state.categories[0]);
  }, [state.categories, activeCategory]);

  const categories = useMemo(() => builderCategories(state), [state]);
  const popular = useMemo(() => builderPopularItems(state), [state]);
  const design = state.design;
  const theme = useMemo(() => menuTheme(design), [design]);
  const previewSlug = publicMenuUrl(state.name.trim() ? businessSlug(state.name) : 'mi-menu');
  const guest = publicRoute && !business.data;
  // Cuánto del menú ya tiene forma: es el medidor que ve el usuario.
  const draftChecks = [
    state.name.trim().length > 1,
    state.categories.length > 0,
    state.items.length > 0,
    Boolean(state.logo || state.banner),
    state.orderModes.length > 0,
  ];
  const progress = Math.round((draftChecks.filter(Boolean).length / draftChecks.length) * 100);
  const loginHref = `/login${inviteCode ? `?codigo=${encodeURIComponent(inviteCode)}` : ''}`;
  const registerHref = `/registro${inviteCode ? `?codigo=${encodeURIComponent(inviteCode)}` : ''}`;

  const update = <K extends keyof BuilderState>(key: K, value: BuilderState[K]) =>
    setState((current) => ({ ...current, [key]: value }));

  function updateItem(id: string, patch: Partial<BuilderItem>) {
    setState((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  }

  function removeItem(id: string) {
    setState((current) => ({ ...current, items: current.items.filter((item) => item.id !== id) }));
  }

  function addItem(category = activeCategory) {
    if (!category) {
      toast.error('Primero elige una categoría.');
      return;
    }
    setState((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          id: builderItemId('custom'),
          name: '',
          price: '',
          description: '',
          category,
          popular: false,
          stock: null,
          isNew: true,
          source: 'custom',
        },
      ],
    }));
  }

  function addCategory(rawName: string) {
    const clean = rawName.trim();
    if (!clean) return;
    if (state.categories.some((category) => category.toLowerCase() === clean.toLowerCase())) {
      toast.error('Esa sección ya existe.');
      return;
    }
    setState((current) => ({ ...current, categories: [...current.categories, clean] }));
    setActiveCategory(clean);
  }

  function removeCategory(category: string) {
    if (state.items.some((item) => item.category === category)) {
      toast.error('Mueve o elimina los productos de esa sección antes de quitarla.');
      return;
    }
    setState((current) => ({
      ...current,
      categories: current.categories.filter((item) => item !== category),
    }));
  }

  function seedType(typeId: string) {
    const seeded = seedCatalog(typeId);
    setState((current) => applyBusinessType(current, typeId));
    setActiveCategory(seeded.categories[0] ?? '');
    setImportedImage('');
    toast.success('Armamos un menú de ejemplo: ajústalo a tu gusto.');
  }

  async function chooseBrandImage(key: 'logo' | 'banner', file?: File) {
    if (!file) return;
    try {
      update(key, await readImage(file));
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  async function importFromPhoto(file?: File) {
    if (!file) return;
    try {
      const image = await readImage(file);
      setImportedImage(image);
      toast.success('Foto cargada. Copia los productos de tu carta en la lista.');
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  function goToStep(index: number) {
    setStep(index);
    setSheetOpen(true);
  }

  function next() {
    const error = builderStepError(state, step);
    if (error) {
      toast.error(error);
      return;
    }
    setSheetOpen(true);
    setStep((current) => Math.min(current + 1, builderSteps.length - 1));
  }

  async function publishMenu() {
    for (let index = 0; index < builderSteps.length; index += 1) {
      const error = builderStepError(state, index);
      if (error) {
        setStep(index);
        toast.error(error);
        return;
      }
    }
    if (!business.data) {
      toast.error('Crea tu cuenta para publicar el menú que armaste.');
      navigate(registerHref, {
        state: { from: `${location.pathname}${location.search}` },
      });
      return;
    }
    const config = builderToConfig(business.data, state);
    try {
      await publish.mutateAsync({ saves: builderSaves(config), config });
      setPublished(true);
      toast.success('¡Tu menú está publicado!');
    } catch {
      // La mutación ya muestra el error.
    }
  }

  if (!loaded)
    return (
      <PhoneShell>
        <div
          className="grid flex-1 place-content-center gap-3 p-6 text-center text-sm text-slate-500"
          role="status"
        >
          Preparando tu menú…
        </div>
      </PhoneShell>
    );

  if (!publicRoute && (business.isError || !business.data)) {
    return (
      <section className="mx-auto grid min-h-56 max-w-lg content-center justify-items-center gap-3 px-6 text-center text-slate-600">
        <h2 className="text-xl font-bold text-slate-900">No pudimos cargar tu negocio</h2>
        <p className="text-sm">Comprueba tu conexión e inténtalo de nuevo.</p>
        <Button variant="outline" onClick={() => void business.refetch()}>
          Volver a intentar
        </Button>
      </section>
    );
  }

  if (published)
    return (
      <PhoneShell>
        <div className="flex-1 overflow-y-auto bg-slate-50 p-3">
          <PublishedPanel
            name={state.name}
            link={previewSlug}
            itemCount={state.items.length}
            categoryCount={categories.length}
            onKeepEditing={() => setPublished(false)}
          />
        </div>
      </PhoneShell>
    );

  const ActiveIcon = builderSteps[step].icon;
  const lastStep = step === builderSteps.length - 1;
  return (
    <PhoneShell>
      {/* El menú en borrador ocupa la pantalla: es el protagonista. */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-950">
        <div className="absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 bg-gradient-to-b from-slate-950/85 via-slate-950/45 to-transparent px-3 pt-3 pb-8">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-300 px-2 py-0.5 text-[9px] font-extrabold tracking-[0.14em] text-amber-950 uppercase">
              <PencilLine size={10} /> Borrador
            </span>
            {inviteCode && (
              <span
                data-testid="builder-invite-code"
                className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-semibold text-white backdrop-blur"
              >
                <Sparkles size={10} className="shrink-0" />
                Invitación <span className="font-mono">{inviteCode}</span>
              </span>
            )}
            <span className="w-full truncate text-[11px] font-semibold text-white/85">
              Así se verá tu menú para tus clientes
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {publicRoute ? (
              authenticated ? (
                <Link
                  to="/business/mi-menu"
                  className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur transition hover:bg-white/25"
                >
                  Mi menú
                </Link>
              ) : (
                <Link
                  to={loginHref}
                  className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur transition hover:bg-white/25"
                >
                  Entrar
                </Link>
              )
            ) : (
              <Link
                to="/business/mi-menu"
                aria-label="Ir al editor completo"
                className="grid size-7 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25"
              >
                <ArrowLeft size={13} />
              </Link>
            )}
          </div>
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col" data-testid="builder-canvas">
          <MenuPreview
            state={state}
            popular={popular}
            theme={theme}
            onCategory={setActiveCategory}
            activeCategory={activeCategory}
          />
        </div>

        {/* Pista que conecta lo que se edita con el menú que se ve. */}
        {sheetOpen && (
          <p className="pointer-events-none absolute inset-x-0 bottom-0 z-10 mx-auto w-fit max-w-[88%] -translate-y-1 rounded-full bg-slate-950/70 px-2.5 py-1 text-center text-[10px] font-semibold text-white/90 backdrop-blur">
            {builderSteps[step].preview}
          </p>
        )}
      </div>

      {/* Hoja de configuración: se pliega para ver el menú completo. */}
      <section
        data-testid="builder-sheet"
        data-open={sheetOpen}
        className="relative z-30 flex max-h-[68%] min-h-0 shrink-0 flex-col rounded-t-3xl bg-white shadow-[0_-18px_40px_rgba(15,23,42,0.35)]"
      >
        <button
          type="button"
          aria-label={sheetOpen ? 'Ver el menú completo' : 'Seguir configurando'}
          aria-expanded={sheetOpen}
          className="flex w-full shrink-0 flex-col items-center gap-1 pt-2 pb-1"
          onClick={() => setSheetOpen((current) => !current)}
        >
          <span aria-hidden="true" className="h-1.5 w-10 rounded-full bg-slate-300" />
        </button>

        <div className="flex shrink-0 items-center gap-2 px-3 pb-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
            <ActiveIcon size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-extrabold text-slate-900">
              {builderSteps[step].title}
            </h2>
            <p className="truncate text-[11px] text-slate-500">{builderSteps[step].hint}</p>
          </div>
          <span
            data-testid="builder-progress"
            data-progress={progress}
            className="shrink-0 text-[10px] font-bold text-slate-400"
          >
            {progress}% listo
          </span>
          <button
            type="button"
            aria-expanded={sheetOpen}
            aria-label={sheetOpen ? 'Ver el menú' : 'Seguir editando'}
            className="grid size-8 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50"
            onClick={() => setSheetOpen((current) => !current)}
          >
            {sheetOpen ? <Eye size={15} /> : <Hand size={15} />}
          </button>
        </div>

        <div className="shrink-0 px-3 pb-2">
          <div aria-hidden="true" className="h-1 w-full overflow-hidden rounded-full bg-slate-100">
            <span
              className="block h-full rounded-full bg-emerald-500 transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <ol
          className="flex shrink-0 items-stretch gap-1 overflow-x-auto px-3 pb-2"
          aria-label="Pasos del creador de menús"
        >
          {builderSteps.map((item, index) => {
            const active = index === step;
            const done = index < step;
            return (
              <li key={item.title} className="min-w-0 flex-1">
                <button
                  type="button"
                  className={`flex h-full w-full flex-col items-center gap-1 rounded-xl border px-1 py-1.5 transition ${
                    active
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                      : done
                        ? 'border-emerald-200 bg-white text-emerald-700'
                        : 'border-slate-200 bg-white text-slate-400 hover:bg-slate-50'
                  }`}
                  aria-current={active ? 'step' : undefined}
                  onClick={() => goToStep(index)}
                >
                  <span className="w-full truncate text-center text-[10px] leading-3 font-bold">
                    {item.title}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        {sheetOpen && (
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto border-t border-slate-100 px-3.5 py-3">
            {step === 0 && (
              <DesignStep
                design={design}
                onChange={(key, value) => update('design', { ...design, [key]: value })}
                onTemplate={(template) => update('design', menuTemplateValues(template))}
              />
            )}

            {step === 1 && (
              <BrandStep
                state={state}
                onLogo={(file) => void chooseBrandImage('logo', file)}
                onBanner={(file) => void chooseBrandImage('banner', file)}
                onClear={(key) => update(key, '')}
              />
            )}

            {step === 2 && (
              <CategoriesStep
                state={state}
                categories={state.categories}
                activeCategory={activeCategory}
                onSelectCategory={setActiveCategory}
                onAddCategory={addCategory}
                onRemoveCategory={removeCategory}
                onSeedType={seedType}
              />
            )}

            {step === 3 && (
              <ProductsStep
                state={state}
                // Las secciones recién creadas se muestran aunque estén vacías.
                categories={state.categories}
                activeCategory={activeCategory}
                setActiveCategory={setActiveCategory}
                onAddItem={addItem}
                onUpdateItem={updateItem}
                onRemoveItem={removeItem}
                onImport={() => fileInput.current?.click()}
                importedImage={importedImage}
                onClearImage={() => setImportedImage('')}
              />
            )}

            {step === 4 && (
              <SettingsStep state={state} onChange={update} categories={categories} guest={guest} />
            )}
          </div>
        )}

        <footer className="flex shrink-0 items-center gap-2 border-t border-slate-200 bg-white px-3 py-2.5">
          <Button
            variant="outline"
            type="button"
            className="shrink-0"
            disabled={step === 0}
            onClick={() => setStep((current) => Math.max(current - 1, 0))}
          >
            <ArrowLeft size={15} /> Atrás
          </Button>
          <span className="min-w-0 flex-1 truncate text-[10px] text-slate-500">
            {state.items.length} productos · {state.categories.length} secciones
          </span>
          {lastStep ? (
            <Button
              type="button"
              className="shrink-0"
              disabled={publish.isPending}
              onClick={() => void publishMenu()}
            >
              <Rocket size={15} />{' '}
              {publish.isPending
                ? 'Publicando…'
                : guest
                  ? 'Crear cuenta y publicar'
                  : 'Publicar mi menú'}
            </Button>
          ) : (
            <Button type="button" className="shrink-0" onClick={next}>
              Continuar <ArrowRight size={15} />
            </Button>
          )}
        </footer>
      </section>

      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        aria-label="Subir foto de tu carta"
        onChange={(event) => {
          void importFromPhoto(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
    </PhoneShell>
  );
}

/**
 * Marco de teléfono: en el celular ocupa toda la pantalla; en pantallas
 * grandes se centra en un contenedor de 500 px con biseles de móvil.
 */
function PhoneShell({ children }: { children: ReactNode }) {
  return (
    <div
      data-testid="builder-shell"
      className="flex min-h-screen w-full justify-center bg-slate-200"
    >
      <div
        data-testid="builder-phone"
        className="relative flex min-h-screen w-full max-w-[450px] flex-col overflow-hidden bg-white sm:h-[min(94vh,940px)] sm:rounded-[42px] sm:border-[8px] sm:border-slate-900 sm:shadow-2xl"
      >
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}

/** Paso 2: logo y banner del negocio. */
function BrandStep({
  state,
  onLogo,
  onBanner,
  onClear,
}: {
  state: BuilderState;
  onLogo: (file?: File) => void;
  onBanner: (file?: File) => void;
  onClear: (key: 'logo' | 'banner') => void;
}) {
  return (
    <>
      <div>
        <h3 className="text-sm font-extrabold text-slate-900">Logo y banner</h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          El logo encabeza tu menú y el banner es la foto de portada. Si los dejas vacíos usamos el
          emoji de tu giro con tus colores.
        </p>
      </div>
      <BrandUpload
        label="Logo"
        hint="Cuadrado · 512 × 512 px"
        previewClass="size-24 rounded-2xl"
        value={state.logo}
        onPick={onLogo}
        onClear={() => onClear('logo')}
      />
      <BrandUpload
        label="Banner"
        hint="Horizontal · 1200 × 600 px"
        previewClass="h-28 w-full rounded-2xl"
        value={state.banner}
        onPick={onBanner}
        onClear={() => onClear('banner')}
      />
      <p className="rounded-xl bg-slate-50 px-3 py-2 text-[11px] leading-4 text-slate-500">
        Las fotos se recortan solas para que se vean bien en el celular de tus clientes.
      </p>
    </>
  );
}

function BrandUpload({
  label,
  hint,
  previewClass,
  value,
  onPick,
  onClear,
}: {
  label: string;
  hint: string;
  previewClass: string;
  value: string;
  onPick: (file?: File) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border border-slate-200 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-1">
        <span className="text-sm font-bold text-slate-800">{label}</span>
        <span className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
          {hint}
        </span>
      </div>
      <div
        className={`grid place-items-center overflow-hidden bg-slate-100 text-slate-400 ${previewClass}`}
      >
        {value ? (
          <img src={value} alt="" className="size-full object-cover" />
        ) : (
          <ImagePlus size={20} />
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <label className="cursor-pointer rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50">
          {value ? 'Cambiar imagen' : 'Subir imagen'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            aria-label={`Subir ${label.toLowerCase()}`}
            onChange={(event) => {
              onPick(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </label>
        {value && (
          <button
            type="button"
            aria-label={`Quitar ${label.toLowerCase()}`}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-50"
            onClick={onClear}
          >
            <Trash2 size={13} /> Quitar
          </button>
        )}
      </div>
    </div>
  );
}

/** Paso 3: secciones de la carta, con un menú de arranque por giro. */
function CategoriesStep({
  state,
  categories,
  activeCategory,
  onSelectCategory,
  onAddCategory,
  onRemoveCategory,
  onSeedType,
}: {
  state: BuilderState;
  categories: string[];
  activeCategory: string;
  onSelectCategory: (category: string) => void;
  onAddCategory: (name: string) => void;
  onRemoveCategory: (category: string) => void;
  onSeedType: (typeId: string) => void;
}) {
  const [newCategory, setNewCategory] = useState('');
  return (
    <>
      <div>
        <h3 className="text-sm font-extrabold text-slate-900">Secciones de tu carta</h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Agrupa tus productos como en tu carta: tacos, bebidas, postres… Los productos se agregan
          en el siguiente paso.
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          {categories.map((category) => {
            const count = itemsOfCategory(state, category).length;
            const active = category === activeCategory;
            return (
              <li
                key={category}
                className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 ${
                  active ? 'border-emerald-300 bg-emerald-50/60' : 'border-slate-200 bg-white'
                }`}
              >
                <button
                  type="button"
                  aria-pressed={active}
                  className={`min-w-0 flex-1 truncate text-left text-xs font-bold ${
                    active ? 'text-emerald-800' : 'text-slate-700'
                  }`}
                  onClick={() => onSelectCategory(category)}
                >
                  {category}
                </button>
                <span className="shrink-0 text-[10px] text-slate-400">
                  {count === 1 ? '1 producto' : `${count} productos`}
                </span>
                <button
                  type="button"
                  aria-label={`Quitar la sección ${category}`}
                  className="grid size-7 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
                  onClick={() => onRemoveCategory(category)}
                >
                  <Trash2 size={13} />
                </button>
              </li>
            );
          })}
          {!categories.length && (
            <li className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-center text-xs text-slate-500">
              Aún no hay secciones: escribe el nombre y crea la primera.
            </li>
          )}
        </ul>
        <form
          className="mt-2 flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            onAddCategory(newCategory);
            setNewCategory('');
          }}
        >
          <input
            className={fieldClass}
            value={newCategory}
            placeholder="Nueva sección"
            aria-label="Nombre de la nueva sección"
            onChange={(event) => setNewCategory(event.target.value)}
          />
          <button
            type="submit"
            className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-600 transition hover:border-emerald-400 hover:text-emerald-700"
            aria-label="Agregar sección"
          >
            <Plus size={14} />
          </button>
        </form>
      </div>

      <div>
        <h3 className="text-sm font-extrabold text-slate-900">Menú de arranque</h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Elige tu giro y llenamos las secciones con productos y precios de ejemplo; luego ajustas
          lo que quieras.
        </p>
        <div
          className="mt-3 grid grid-cols-3 gap-2"
          role="group"
          aria-label="Menú de arranque por giro"
        >
          {businessTypes.map((type) => {
            const selected = state.typeId === type.id;
            return (
              <button
                key={type.id}
                type="button"
                aria-pressed={selected}
                aria-label={type.label}
                className={`flex min-w-0 flex-col items-center gap-1 rounded-xl border p-2 text-center transition ${
                  selected
                    ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
                }`}
                onClick={() => onSeedType(type.id)}
              >
                <span className="text-lg leading-none" aria-hidden="true">
                  {type.emoji}
                </span>
                <span className="w-full truncate text-[10px] font-bold text-slate-700">
                  {type.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

/** Paso 4: productos de la sección activa, con precio, stock y destacados. */
function ProductsStep({
  state,
  categories,
  activeCategory,
  setActiveCategory,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onImport,
  importedImage,
  onClearImage,
}: {
  state: BuilderState;
  categories: string[];
  activeCategory: string;
  setActiveCategory: (category: string) => void;
  onAddItem: (category?: string) => void;
  onUpdateItem: (id: string, patch: Partial<BuilderItem>) => void;
  onRemoveItem: (id: string) => void;
  onImport: () => void;
  importedImage: string;
  onClearImage: () => void;
}) {
  const items = activeCategory ? itemsOfCategory(state, activeCategory) : [];
  return (
    <>
      {categories.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-slate-700">Sección</span>
          <div
            className="flex gap-1.5 overflow-x-auto pb-1"
            role="group"
            aria-label="Secciones con productos"
          >
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                aria-pressed={category === activeCategory}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                  category === activeCategory
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-center text-xs text-slate-500">
          Primero crea una sección en el paso de categorías.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <article key={item.id} className="rounded-xl border border-slate-200 p-2.5">
            <div className="flex items-center gap-1.5">
              <input
                className={`${fieldClass} min-w-0 flex-1 font-semibold`}
                value={item.name}
                placeholder="Nombre del producto"
                aria-label={`Nombre de ${item.name || 'el producto'}`}
                onChange={(event) => onUpdateItem(item.id, { name: event.target.value })}
              />
              <div className="flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 px-1.5">
                <span className="text-xs font-bold text-slate-400">$</span>
                <input
                  className="w-14 border-0 bg-transparent py-2 text-sm font-bold text-slate-800 outline-none"
                  value={item.price}
                  inputMode="decimal"
                  placeholder="0"
                  aria-label={`Precio de ${item.name || 'el producto'}`}
                  onChange={(event) => onUpdateItem(item.id, { price: event.target.value })}
                />
              </div>
            </div>
            <input
              className={`${fieldClass} mt-1.5`}
              value={item.description}
              placeholder="Descripción breve (opcional)"
              aria-label={`Descripción de ${item.name || 'el producto'}`}
              onChange={(event) => onUpdateItem(item.id, { description: event.target.value })}
            />
            <div className="mt-1.5 flex items-center gap-1.5">
              <label className="flex min-w-0 flex-1 items-center gap-1.5 rounded-xl border border-slate-200 px-2 py-1.5 text-[11px] font-semibold text-slate-500">
                Quedan
                <input
                  className="w-12 border-0 bg-transparent text-sm font-bold text-slate-800 outline-none"
                  value={item.stock ?? ''}
                  inputMode="numeric"
                  placeholder="∞"
                  aria-label={`Existencias de ${item.name || 'el producto'}`}
                  onChange={(event) => {
                    const digits = event.target.value.replace(/\D/g, '');
                    onUpdateItem(item.id, { stock: digits ? Number(digits) : null });
                  }}
                />
              </label>
              <button
                type="button"
                aria-pressed={item.popular}
                aria-label={`Marcar ${item.name || 'el producto'} como lo más pedido`}
                className={`grid size-8 shrink-0 place-items-center rounded-xl border transition ${
                  item.popular
                    ? 'border-amber-300 bg-amber-50 text-amber-600'
                    : 'border-slate-200 text-slate-400 hover:bg-slate-50'
                }`}
                onClick={() => onUpdateItem(item.id, { popular: !item.popular })}
              >
                <Star size={15} />
              </button>
              <button
                type="button"
                aria-pressed={item.isNew}
                aria-label={`Marcar ${item.name || 'el producto'} como nuevo`}
                className={`shrink-0 rounded-xl border px-1.5 py-1.5 text-[10px] font-extrabold transition ${
                  item.isNew
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 text-slate-400 hover:bg-slate-50'
                }`}
                onClick={() => onUpdateItem(item.id, { isNew: !item.isNew })}
              >
                NUEVO
              </button>
              <button
                type="button"
                className="grid size-8 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-400 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
                aria-label={`Eliminar ${item.name || 'el producto'}`}
                onClick={() => onRemoveItem(item.id)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </article>
        ))}
        {!items.length && categories.length > 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-center text-xs text-slate-500">
            {activeCategory
              ? `Aún no hay productos en ${activeCategory}.`
              : 'Elige una sección para ver sus productos.'}
          </p>
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => onAddItem(activeCategory)}
      >
        <Plus size={15} /> Agregar producto{activeCategory ? ` a ${activeCategory}` : ''}
      </Button>

      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-slate-500 shadow-sm">
            <ImagePlus size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <strong className="block text-xs font-bold text-slate-800">¿Ya tienes tu carta?</strong>
            <p className="text-[11px] leading-4 text-slate-500">
              Súbela como referencia y copia los productos aquí arriba.
            </p>
          </div>
        </div>
        <Button type="button" variant="outline" className="mt-2 w-full" onClick={onImport}>
          <ImagePlus size={15} /> Subir foto de mi carta
        </Button>
        {importedImage && (
          <div className="mt-2 flex items-start gap-2">
            <img
              src={importedImage}
              alt="Carta subida"
              className="max-h-44 w-full max-w-40 rounded-xl border border-slate-200 object-contain"
            />
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-600 hover:bg-white"
              onClick={onClearImage}
            >
              <X size={12} /> Quitar
            </button>
          </div>
        )}
      </div>
    </>
  );
}

/** Paso 5: datos del negocio, horario, pedidos y promoción. */
function SettingsStep({
  state,
  onChange,
  categories,
  guest,
}: {
  state: BuilderState;
  onChange: <K extends keyof BuilderState>(key: K, value: BuilderState[K]) => void;
  categories: string[];
  guest: boolean;
}) {
  return (
    <>
      <section className="flex flex-col gap-2.5">
        <h3 className="text-sm font-extrabold text-slate-900">Datos del negocio</h3>
        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-slate-700">
          Nombre del negocio
          <input
            className={fieldClass}
            value={state.name}
            placeholder="Tacos El Güero"
            onChange={(event) => onChange('name', event.target.value)}
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-slate-700">
          WhatsApp para pedidos
          <input
            className={fieldClass}
            value={state.whatsapp}
            inputMode="tel"
            placeholder="52 729 875 5283"
            onChange={(event) => onChange('whatsapp', event.target.value)}
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-slate-700">
          Dirección
          <input
            className={fieldClass}
            value={state.address}
            placeholder="Av. Morelos 214, Centro"
            onChange={(event) => onChange('address', event.target.value)}
          />
        </label>
      </section>

      <section className="flex flex-col gap-2.5">
        <h3 className="text-sm font-extrabold text-slate-900">Horario</h3>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-xs font-semibold text-slate-700">Días de servicio</legend>
          <div className="grid grid-cols-7 gap-1">
            {dayShort.map((day, index) => (
              <button
                key={day}
                type="button"
                aria-pressed={state.serviceDays.includes(index)}
                className={`min-w-0 rounded-lg border py-2 text-[11px] font-bold transition ${
                  state.serviceDays.includes(index)
                    ? 'border-emerald-700 bg-emerald-700 text-white'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
                onClick={() =>
                  onChange(
                    'serviceDays',
                    state.serviceDays.includes(index)
                      ? state.serviceDays.filter((item) => item !== index)
                      : [...state.serviceDays, index],
                  )
                }
              >
                {day}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-slate-700">
            Apertura
            <input
              className={fieldClass}
              type="time"
              value={state.openingTime}
              onChange={(event) => onChange('openingTime', event.target.value)}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-slate-700">
            Cierre
            <input
              className={fieldClass}
              type="time"
              value={state.closingTime}
              onChange={(event) => onChange('closingTime', event.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="flex flex-col gap-2.5">
        <h3 className="text-sm font-extrabold text-slate-900">Pedidos y pagos</h3>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-xs font-semibold text-slate-700">¿Cómo te piden?</legend>
          <div className="flex flex-col gap-2">
            {orderModeOptions.map((mode) => {
              const selected = state.orderModes.includes(mode.value);
              return (
                <label
                  key={mode.value}
                  className={`flex cursor-pointer items-start gap-2 rounded-xl border p-2.5 transition ${
                    selected
                      ? 'border-emerald-300 bg-emerald-50'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 accent-emerald-700"
                    checked={selected}
                    aria-label={mode.label}
                    onChange={() =>
                      onChange(
                        'orderModes',
                        selected
                          ? state.orderModes.filter((item) => item !== mode.value)
                          : [...state.orderModes, mode.value as OrderMode],
                      )
                    }
                  />
                  <span className="min-w-0">
                    <strong className="block text-xs font-bold text-slate-800">{mode.label}</strong>
                    <small className="text-[11px] leading-4 text-slate-500">
                      {mode.description}
                    </small>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {state.orderModes.includes('delivery') && (
          <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-slate-700">
            Costo de envío
            <input
              className={fieldClass}
              value={state.deliveryFee}
              inputMode="decimal"
              placeholder="35"
              onChange={(event) => onChange('deliveryFee', event.target.value)}
            />
          </label>
        )}

        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-xs font-semibold text-slate-700">Formas de pago</legend>
          <div className="flex flex-wrap gap-1.5">
            {paymentMethodOptions.map((method) => {
              const selected = state.paymentMethods.includes(method);
              return (
                <button
                  key={method}
                  type="button"
                  aria-pressed={selected}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                    selected
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                  onClick={() =>
                    onChange(
                      'paymentMethods',
                      selected
                        ? state.paymentMethods.filter((item) => item !== method)
                        : [...state.paymentMethods, method],
                    )
                  }
                >
                  {method}
                </button>
              );
            })}
          </div>
        </fieldset>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
        <label className="flex items-center justify-between gap-3">
          <span className="min-w-0">
            <strong className="block text-sm font-bold text-slate-800">Promoción destacada</strong>
            <small className="text-[11px] leading-4 text-slate-500">
              Aparece arriba de tu menú: 3×2, descuento o combo del día.
            </small>
          </span>
          <input
            type="checkbox"
            className="size-5 shrink-0 accent-emerald-700"
            checked={state.promo.enabled}
            aria-label="Mostrar promoción en el menú"
            onChange={(event) =>
              onChange('promo', { ...state.promo, enabled: event.target.checked })
            }
          />
        </label>
        {state.promo.enabled && (
          <div className="mt-2.5 flex flex-col gap-2">
            <input
              className={fieldClass}
              value={state.promo.text}
              placeholder="Solo los martes 3 tacos de pastor"
              aria-label="Texto de la promoción"
              onChange={(event) => onChange('promo', { ...state.promo, text: event.target.value })}
            />
            <input
              className={fieldClass}
              value={state.promo.price}
              inputMode="decimal"
              placeholder="$36"
              aria-label="Precio de la promoción"
              onChange={(event) => onChange('promo', { ...state.promo, price: event.target.value })}
            />
            <input
              className={fieldClass}
              value={state.promo.note}
              placeholder="Paga 2, llévate 3 (opcional)"
              aria-label="Nota de la promoción"
              onChange={(event) => onChange('promo', { ...state.promo, note: event.target.value })}
            />
          </div>
        )}
      </section>

      <p className="text-[11px] leading-4 text-slate-500">
        {categories.length
          ? `Tu menú se publica con ${categories.length} secciones. Podrás editar precios y fotos cuando quieras.`
          : 'Tu menú aún no tiene secciones: vuelve al paso de categorías.'}
      </p>

      {guest && (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-[11px] leading-4 font-semibold text-emerald-800">
          Estás armando tu menú como invitado. Al publicar te pediremos crear tu cuenta para
          guardarlo.
        </p>
      )}
    </>
  );
}

/** Paso 1: plantillas con un toque y ajustes finos. */
function DesignStep({
  design,
  onChange,
  onTemplate,
}: {
  design: BuilderState['design'];
  onChange: <K extends keyof BuilderState['design']>(
    key: K,
    value: BuilderState['design'][K],
  ) => void;
  onTemplate: (template: (typeof menuTemplates)[number]) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="flex flex-col gap-3" role="group" aria-label="Estilos de menú">
        {menuTemplateGroups.map((group) => (
          <div className="flex flex-col gap-2" key={group}>
            <h3 className="text-[11px] font-bold tracking-[0.14em] text-slate-500 uppercase">
              {group}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {menuTemplates
                .filter((template) => template.group === group)
                .map((template) => {
                  const theme = menuTheme(template);
                  const selected =
                    design.primaryColor === template.primaryColor &&
                    design.surface === template.surface &&
                    design.logoShape === template.logoShape &&
                    design.layout === template.layout;
                  return (
                    <button
                      key={template.id}
                      type="button"
                      aria-pressed={selected}
                      aria-label={`Estilo ${template.label}`}
                      className={`flex min-w-0 flex-col gap-1.5 rounded-xl border p-2 text-left transition ${
                        selected
                          ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
                      }`}
                      onClick={() => onTemplate(template)}
                    >
                      <span
                        className="flex w-full flex-col gap-1 rounded-lg p-2"
                        style={{ backgroundColor: theme.surface }}
                        aria-hidden="true"
                      >
                        <span className="flex items-center gap-1.5">
                          <span
                            className={`grid size-5 place-items-center border text-[8px] font-extrabold ${logoShapeClass[template.logoShape]}`}
                            style={{
                              backgroundColor: template.secondaryColor,
                              borderColor: theme.border,
                            }}
                          >
                            <span style={{ color: template.primaryColor }}>Aa</span>
                          </span>
                          <span
                            className="h-1.5 flex-1 rounded-full"
                            style={{ backgroundColor: theme.muted }}
                          />
                        </span>
                        <span className="flex gap-1">
                          {[0, 1].map((index) => (
                            <span
                              key={index}
                              className={`h-4 flex-1 ${cardStyleClass[template.cardStyle]}`}
                              style={{ backgroundColor: theme.card, borderColor: theme.border }}
                            />
                          ))}
                        </span>
                      </span>
                      <span className="flex items-center gap-1 text-xs font-bold text-slate-800">
                        {template.label}
                        {selected && <Check size={12} className="text-emerald-600" />}
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/60">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          <span className="text-xs font-bold tracking-wide text-slate-700 uppercase">
            Ajustes finos
          </span>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {open && (
          <div className="grid grid-cols-1 gap-3 border-t border-slate-200 p-3">
            <DesignSelect
              label="Portada"
              value={design.layout}
              options={menuLayoutOptions}
              onChange={(value) => onChange('layout', value as MenuLayout)}
            />
            <DesignSelect
              label="Forma del logo"
              value={design.logoShape}
              options={menuLogoShapeOptions}
              onChange={(value) => onChange('logoShape', value as MenuLogoShape)}
            />
            <DesignSelect
              label="Fondo del menú"
              value={design.surface}
              options={menuSurfaceOptions}
              onChange={(value) => onChange('surface', value as MenuSurface)}
            />
            <DesignSelect
              label="Estilo de tarjetas"
              value={design.cardStyle}
              options={menuCardStyleOptions}
              onChange={(value) => onChange('cardStyle', value as MenuCardStyle)}
            />
            <DesignSelect
              label="Estilo de categorías"
              value={design.navStyle}
              options={menuNavStyleOptions}
              onChange={(value) => onChange('navStyle', value as MenuNavStyle)}
            />
            <label className="flex min-w-0 flex-col gap-2 text-xs font-semibold text-slate-700">
              Tipografía
              <select
                className={fieldClass}
                value={design.fontFamily}
                aria-label="Tipografía"
                onChange={(event) => onChange('fontFamily', event.target.value as MenuFontFamily)}
              >
                <option value="dm-sans">DM Sans</option>
                <option value="manrope">Manrope</option>
                <option value="serif">Serif clásica</option>
                <option value="outfit">Outfit</option>
                <option value="lora">Lora</option>
                <option value="nunito">Nunito</option>
              </select>
            </label>
            <div className="grid grid-cols-1 gap-3">
              <ColorInput
                label="Color principal"
                value={design.primaryColor}
                onChange={(value) => onChange('primaryColor', value)}
              />
              <ColorInput
                label="Color secundario"
                value={design.secondaryColor}
                onChange={(value) => onChange('secondaryColor', value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  onChange('menuStyle', design.menuStyle === 'cozy' ? 'compact' : 'cozy')
                }
              >
                {design.menuStyle === 'cozy' ? 'Cambiar a compacto' : 'Cambiar a espacioso'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  const template = menuTemplates[0];
                  onTemplate(template);
                }}
              >
                Restablecer
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function DesignSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string; description: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-slate-700">
      {label}
      <select
        className={fieldClass}
        value={value}
        aria-label={label}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="text-[11px] leading-4 font-normal text-slate-500">
        {options.find((option) => option.value === value)?.description}
      </span>
    </label>
  );
}

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-2 text-xs font-semibold text-slate-700">
      <span>{label}</span>
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 p-2">
        <input
          className="size-9 cursor-pointer rounded-lg border-0 bg-transparent p-0"
          type="color"
          value={value}
          aria-label={label}
          onChange={(event) => onChange(event.target.value)}
        />
        <input
          className="min-w-0 flex-1 border-0 bg-transparent font-mono text-xs text-slate-700 outline-none"
          aria-label={`${label} hexadecimal`}
          value={value}
          maxLength={7}
          onChange={(event) =>
            /^#[\da-f]{0,6}$/i.test(event.target.value) && onChange(event.target.value)
          }
        />
      </div>
    </label>
  );
}

/** Confirmación con enlace y QR listos para compartir. */
function PublishedPanel({
  name,
  link,
  itemCount,
  categoryCount,
  onKeepEditing,
}: {
  name: string;
  link: string;
  itemCount: number;
  categoryCount: number;
  onKeepEditing: () => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <p className="inline-flex items-center gap-2 text-[10px] font-extrabold tracking-[0.16em] text-emerald-800 uppercase">
          <Sparkles size={14} /> MENÚ PUBLICADO
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
          ¡{name || 'Tu negocio'} ya tiene menú digital!
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {categoryCount} secciones y {itemCount} productos listos. Comparte el enlace en tus redes
          o imprime el QR para tus mesas.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <span className="text-[10px] font-extrabold tracking-[0.14em] text-slate-500 uppercase">
            Tu enlace
          </span>
          <code className="overflow-x-auto rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-700">
            {link}
          </code>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => {
                void navigator.clipboard
                  ?.writeText(link)
                  .then(() => {
                    setCopied(true);
                    toast.success('Enlace copiado');
                  })
                  .catch(() => toast.error('No pudimos copiar el enlace.'));
              }}
            >
              <Copy size={15} /> {copied ? 'Copiado' : 'Copiar enlace'}
            </Button>
            <Button asChild variant="outline">
              <a href={link} target="_blank" rel="noreferrer">
                <ExternalLink size={15} /> Ver mi menú
              </a>
            </Button>
            <Button variant="outline" type="button" onClick={onKeepEditing}>
              Seguir editando
            </Button>
          </div>
          <p className="text-[11px] leading-5 text-slate-500">
            Los pedidos llegan a tu WhatsApp con los productos, cantidades y el total.
          </p>
        </div>
        <div className="grid place-items-center rounded-2xl border border-slate-200 bg-white p-4">
          <QRCodeSVG value={link} size={132} aria-label="Código QR de tu menú" />
        </div>
      </div>
    </div>
  );
}

/**
 * El menú del negocio tal como lo verán sus clientes.
 *
 * En el creador ocupa toda la pantalla del teléfono y se va llenando con cada
 * paso: mientras falten datos muestra marcadores punteados para que el dueño
 * vea desde el primer segundo la forma que tendrá su menú.
 */
function MenuPreview({
  state,
  popular,
  theme,
  activeCategory,
  onCategory,
}: {
  state: BuilderState;
  popular: BuilderItem[];
  theme: ReturnType<typeof menuTheme>;
  activeCategory: string;
  onCategory: (category: string) => void;
}) {
  const design = state.design;
  // En el borrador se ven todas las secciones: las vacías muestran su marcador.
  const sections = state.categories;
  const dark = design.surface === 'dark';
  const type = businessTypes.find((item) => item.id === state.typeId);
  const waLink = builderWhatsAppLink(state.whatsapp || '52', state.name);
  const hasItems = state.items.length > 0;
  return (
    <div
      data-testid="builder-preview"
      data-draft="true"
      data-surface={design.surface}
      data-logo-shape={design.logoShape}
      data-layout={design.layout}
      className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto"
      style={{
        backgroundColor: theme.surface,
        color: theme.ink,
        fontFamily: fontStack(design.fontFamily),
      }}
    >
      <header className="relative h-64 shrink-0 overflow-hidden">
        {state.banner ? (
          <img src={state.banner} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <span className="absolute inset-0" style={{ background: theme.hero }} />
        )}
        <span className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-900/50 to-slate-950/85" />
        <div className="relative z-10 flex flex-col items-center gap-1 px-3 pt-11 text-center text-white">
          <span
            className={`grid size-18 place-items-center overflow-hidden border-[3px] bg-white shadow-lg ${logoShapeClass[design.logoShape]}`}
            style={{ borderColor: dark ? '#ffffff' : design.secondaryColor }}
          >
            {state.logo ? (
              <img src={state.logo} alt="" className="size-full object-cover" />
            ) : (
              <span className="text-xl" aria-hidden="true">
                {type?.emoji ?? '🍽️'}
              </span>
            )}
          </span>
          <p className="text-[9px] font-bold tracking-[0.18em] uppercase opacity-80">
            {type?.label ?? 'Menú del restaurante'}
          </p>
          <h1
            className={`line-clamp-1 px-2 text-xl leading-6 font-extrabold ${
              state.name.trim() ? '' : 'opacity-60'
            }`}
          >
            {state.name || 'Tu negocio'}
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-x-2 text-[9px] opacity-85">
            <span className="inline-flex items-center gap-0.5">
              <Clock3 size={9} />
              {openingHoursLabel(state)}
            </span>
            {state.address && (
              <span className="inline-flex items-center gap-0.5">
                <MapPin size={9} />
                {state.address}
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-3 px-3 py-3">
        {state.promo.enabled && state.promo.text.trim() && (
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2"
            style={{ backgroundColor: design.secondaryColor, color: theme.ink }}
          >
            <Sparkles size={14} style={{ color: design.primaryColor }} />
            <span className="min-w-0 flex-1 text-[11px] font-bold">
              {state.promo.note && <span className="block opacity-70">{state.promo.note}</span>}
              {state.promo.text}
            </span>
            {state.promo.price && (
              <strong className="text-xs" style={{ color: design.primaryColor }}>
                {state.promo.price.startsWith('$') ? state.promo.price : `$${state.promo.price}`}
              </strong>
            )}
          </div>
        )}

        <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Categorías del menú">
          {['Todos', ...sections].map((category, index) => {
            const active = index === 0 ? activeCategory === '' : activeCategory === category;
            if (design.navStyle === 'tabs') {
              return (
                <span
                  key={category}
                  className="shrink-0 border-b-2 pb-1 text-[11px] font-bold"
                  style={{
                    borderColor: active ? design.primaryColor : 'transparent',
                    color: active ? design.primaryColor : theme.muted,
                  }}
                >
                  {category}
                </span>
              );
            }
            if (design.navStyle === 'cards') {
              return (
                <span
                  key={category}
                  className="flex shrink-0 flex-col items-center gap-1 text-[10px] font-bold"
                  style={{ color: active ? design.primaryColor : theme.muted }}
                >
                  <span
                    className="grid size-8 place-items-center rounded-full border"
                    style={{
                      backgroundColor: theme.card,
                      borderColor: active ? design.primaryColor : theme.border,
                    }}
                  >
                    <Utensils size={12} />
                  </span>
                  {category}
                </span>
              );
            }
            return (
              <button
                key={category}
                type="button"
                className="shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold"
                style={{
                  backgroundColor: active ? design.primaryColor : theme.card,
                  borderColor: active ? design.primaryColor : theme.border,
                  color: active ? theme.onPrimary : theme.muted,
                }}
                onClick={() => onCategory(index === 0 ? '' : category)}
              >
                {category}
              </button>
            );
          })}
          {/* Secciones que todavía no existen: se insinúan para mostrar la forma. */}
          {!sections.length &&
            ['Sección 1', 'Sección 2'].map((placeholder) => (
              <span
                key={placeholder}
                aria-hidden="true"
                className="shrink-0 rounded-full border border-dashed px-2.5 py-1 text-[11px] font-bold opacity-50"
                style={{ borderColor: theme.border, color: theme.muted }}
              >
                {placeholder}
              </span>
            ))}
        </nav>

        {popular.length > 0 && (
          <section className="flex flex-col gap-1.5">
            <p
              className="text-[10px] font-extrabold tracking-[0.12em] uppercase"
              style={{ color: design.primaryColor }}
            >
              Lo más pedido
            </p>
            <div className="grid grid-cols-3 gap-2">
              {popular.slice(0, 3).map((item) => (
                <PreviewCard key={`pop-${item.id}`} item={item} design={design} theme={theme} />
              ))}
            </div>
          </section>
        )}

        {sections.map((category) => {
          const items = itemsOfCategory(state, category);
          return (
            <section key={category} className="flex flex-col gap-1">
              <p className="text-sm font-extrabold">{category}</p>
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 border-b py-2"
                  style={{ borderColor: theme.border }}
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <strong className="truncate text-[13px] font-bold">
                        {item.name || 'Producto sin nombre'}
                      </strong>
                      {item.isNew && (
                        <span
                          className="rounded px-1 py-0.5 text-[8px] font-extrabold"
                          style={{ backgroundColor: design.secondaryColor, color: theme.ink }}
                        >
                          NUEVO
                        </span>
                      )}
                    </span>
                    {item.description && (
                      <span
                        className="line-clamp-1 block text-[11px]"
                        style={{ color: theme.muted }}
                      >
                        {item.description}
                      </span>
                    )}
                    {item.stock !== null && item.stock <= 10 && (
                      <span className="text-[10px]" style={{ color: theme.muted }}>
                        {item.stock === 0 ? 'Agotado' : `Quedan ${item.stock}`}
                      </span>
                    )}
                  </span>
                  <strong className="text-[13px] tabular-nums">
                    {item.price ? `$${item.price}` : '$0'}
                  </strong>
                  <span
                    className="grid size-7 shrink-0 place-items-center rounded-lg"
                    style={{ backgroundColor: design.primaryColor, color: theme.onPrimary }}
                  >
                    <Plus size={14} />
                  </span>
                </div>
              ))}
              {!items.length && (
                <p
                  className="rounded-lg border border-dashed px-2 py-1.5 text-[11px]"
                  style={{ borderColor: theme.border, color: theme.muted }}
                >
                  Aquí van los productos de {category}.
                </p>
              )}
            </section>
          );
        })}

        {/* Sin productos todavía: se dibuja la silueta de las filas del menú. */}
        {!hasItems && (
          <section className="flex flex-col gap-1" aria-hidden="true">
            <p className="text-sm font-extrabold">Tu carta</p>
            {[0, 1, 2].map((row) => (
              <div
                key={row}
                className="flex items-center gap-2 border-b py-2 opacity-45"
                style={{ borderColor: theme.border }}
              >
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span
                    className="h-2.5 rounded-full"
                    style={{ backgroundColor: theme.muted, width: `${70 - row * 12}%` }}
                  />
                  <span
                    className="h-1.5 rounded-full"
                    style={{ backgroundColor: theme.border, width: `${50 + row * 8}%` }}
                  />
                </span>
                <span className="h-2.5 w-8 rounded-full" style={{ backgroundColor: theme.muted }} />
                <span
                  className="grid size-7 shrink-0 place-items-center rounded-lg border border-dashed"
                  style={{ borderColor: theme.border }}
                >
                  <Plus size={13} style={{ color: theme.muted }} />
                </span>
              </div>
            ))}
            <p className="text-[11px]" style={{ color: theme.muted }}>
              Tus productos irán apareciendo aquí mientras armas el menú.
            </p>
          </section>
        )}

        <a
          href={waLink}
          target="_blank"
          rel="noreferrer"
          className="mt-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] font-extrabold"
          style={{ backgroundColor: design.primaryColor, color: theme.onPrimary }}
        >
          <Phone size={13} /> Pedir por WhatsApp
        </a>
        <div className="flex flex-wrap gap-1">
          {state.orderModes.map((mode) => (
            <span
              key={mode}
              className="rounded-md px-1.5 py-0.5 text-[9px]"
              style={{ backgroundColor: theme.surfaceSoft, color: theme.muted }}
            >
              {orderModeOptions.find((option) => option.value === mode)?.label}
            </span>
          ))}
          {state.paymentMethods.map((method) => (
            <span
              key={method}
              className="rounded-md px-1.5 py-0.5 text-[9px]"
              style={{ backgroundColor: theme.surfaceSoft, color: theme.muted }}
            >
              {method}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function PreviewCard({
  item,
  design,
  theme,
}: {
  item: BuilderItem;
  design: BuilderState['design'];
  theme: ReturnType<typeof menuTheme>;
}) {
  return (
    <article
      className={`flex min-w-0 flex-col overflow-hidden ${cardStyleClass[design.cardStyle]}`}
      style={{
        backgroundColor: theme.card,
        borderColor: design.cardStyle === 'flat' ? 'transparent' : theme.border,
      }}
    >
      {design.cardStyle === 'bold' && (
        <span className="h-1 w-full" style={{ backgroundColor: design.primaryColor }} />
      )}
      <span
        className="grid h-15 w-full place-items-center"
        style={{ backgroundColor: theme.surfaceSoft, color: theme.muted }}
      >
        {item.image ? (
          <img src={item.image} alt="" className="size-full object-cover" />
        ) : (
          <Utensils size={14} />
        )}
      </span>
      <span className="flex flex-1 flex-col gap-0.5 p-1.5">
        <strong className="line-clamp-2 text-[9px] leading-3 font-bold">
          {item.name || 'Producto'}
        </strong>
        <span className="mt-auto text-[9px] font-extrabold">
          {item.price ? `$${item.price}` : '$0'}
        </span>
      </span>
    </article>
  );
}

export { builderSteps };
