import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  ImagePlus,
  MapPin,
  Palette,
  Phone,
  Plus,
  Save,
  ShoppingBag,
  Store,
  Trash2,
  Utensils,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import type { BusinessConfig, MenuItem } from '../lib/types';
import {
  useBusiness,
  usePublicCategories,
  useSaveBusiness,
  useSaveBusinessDraft,
} from '../lib/queries';
import { readImage } from '../lib/image';
import { publicMenuUrl } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';

const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const dayShort = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const steps = [
  { title: 'Información', subtitle: 'Tu negocio', icon: Store },
  { title: 'Categorías', subtitle: 'Lo que ofreces', icon: Utensils },
  { title: 'Productos', subtitle: 'Tu catálogo', icon: ImagePlus },
  { title: 'Diseño', subtitle: 'Estilo del menú', icon: Palette },
  { title: 'Servicio', subtitle: 'Horarios y pedidos', icon: Clock3 },
] as const;
const fieldControlClass =
  'w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10';

type Draft = {
  name: string;
  welcomeMessage: string;
  description: string;
  logo: string;
  banner: string;
  phoneNumbers: string[];
  address: string;
  categories: string[];
  menuItems: MenuItem[];
  primaryColor: string;
  secondaryColor: string;
  fontFamily: 'dm-sans' | 'manrope' | 'serif';
  menuStyle: 'cozy' | 'compact';
  serviceDays: number[];
  openingTime: string;
  closingTime: string;
  deliveryAvailable: boolean;
  allowOrders: boolean;
};

const initialDraft: Draft = {
  name: '',
  welcomeMessage: 'Explora nuestros favoritos o encuentra algo nuevo.',
  description: '',
  logo: '',
  banner: '',
  phoneNumbers: [''],
  address: '',
  categories: [],
  menuItems: [],
  primaryColor: '#187f79',
  secondaryColor: '#f4d5b3',
  fontFamily: 'dm-sans',
  menuStyle: 'cozy',
  serviceDays: [1, 2, 3, 4, 5, 6],
  openingTime: '09:00',
  closingTime: '18:00',
  deliveryAvailable: false,
  allowOrders: true,
};

function draftFromBusiness(config: BusinessConfig): Draft {
  return {
    ...initialDraft,
    name: config.name ?? '',
    welcomeMessage: config.welcomeMessage ?? initialDraft.welcomeMessage,
    description: config.description ?? '',
    logo: config.logo ?? '',
    banner: config.banner ?? '',
    phoneNumbers: config.phoneNumbers?.length
      ? [...config.phoneNumbers]
      : config.phone
        ? [config.phone]
        : [''],
    address: config.address ?? config.location ?? '',
    categories: [...(config.categories ?? [])],
    menuItems: (config.menuItems ?? []).map((item) => ({
      ...item,
      image: item.image ?? item.imageUrl,
    })),
    primaryColor: config.primaryColor ?? initialDraft.primaryColor,
    secondaryColor: config.secondaryColor ?? initialDraft.secondaryColor,
    fontFamily: config.fontFamily ?? initialDraft.fontFamily,
    menuStyle: config.menuStyle ?? initialDraft.menuStyle,
    serviceDays: config.serviceDays ?? initialDraft.serviceDays,
    openingTime: config.openingTime ?? initialDraft.openingTime,
    closingTime: config.closingTime ?? initialDraft.closingTime,
    deliveryAvailable: config.deliveryAvailable ?? false,
    allowOrders: config.allowOrders ?? true,
  };
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'negocio'
  );
}

function fontStack(font: Draft['fontFamily']) {
  if (font === 'manrope') return "'Manrope Variable', 'Manrope', sans-serif";
  if (font === 'serif') return "Georgia, 'Times New Roman', serif";
  return "'DM Sans Variable', 'DM Sans', sans-serif";
}

function hoursLabel(draft: Pick<Draft, 'serviceDays' | 'openingTime' | 'closingTime'>) {
  const days = draft.serviceDays.map((day) => dayShort[day]).join(', ');
  return days ? `${days} · ${draft.openingTime}–${draft.closingTime}` : 'Horario por definir';
}

export function BusinessMenuWizard() {
  const business = useBusiness();
  const publicCategories = usePublicCategories();
  const saveBusiness = useSaveBusiness();
  const saveBusinessDraft = useSaveBusinessDraft();
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [loaded, setLoaded] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const [step, setStep] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [imageEdit, setImageEdit] = useState<{ productId: string; src: string } | null>(null);
  const [preparingImages, setPreparingImages] = useState(false);
  const draftRevision = useRef(0);

  useEffect(() => {
    if (!business.data || loaded) return;
    const next = draftFromBusiness(business.data);
    setDraft(next);
    setSelectedCategory(next.categories[0] ?? '');
    setLoaded(true);
  }, [business.data, loaded]);

  useEffect(() => {
    if (draft.categories.length && !draft.categories.includes(selectedCategory))
      setSelectedCategory(draft.categories[0]);
    if (!draft.categories.length) setSelectedCategory('');
  }, [draft.categories, selectedCategory]);

  const visibleProducts = useMemo(
    () => draft.menuItems.filter((item) => item.category === selectedCategory),
    [draft.menuItems, selectedCategory],
  );
  const availableCategoryNames = useMemo(
    () => [
      ...new Set([
        ...(publicCategories.data ?? []).map((category) => category.name),
        ...draft.categories,
      ]),
    ],
    [draft.categories, publicCategories.data],
  );
  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    draftRevision.current += 1;
    setDraftSavedAt(null);
    setDraft((current) => ({ ...current, [key]: value }));
  };

  function toggleCategory(category: string) {
    const removing = draft.categories.includes(category);
    if (!removing) {
      update('categories', [...draft.categories, category]);
      return;
    }
    const remaining = draft.categories.filter((item) => item !== category);
    const assignedProducts = draft.menuItems.some((item) => item.category === category);
    if (assignedProducts && !remaining.length) {
      toast.error('Mueve o elimina los productos de esta categoría antes de quitarla.');
      return;
    }
    update('categories', remaining);
    if (assignedProducts) {
      const destination = remaining[0];
      update(
        'menuItems',
        draft.menuItems.map((item) =>
          item.category === category ? { ...item, category: destination } : item,
        ),
      );
      toast.success(`Los productos se movieron a ${destination}.`);
    }
  }

  async function uploadBrandImage(key: 'logo' | 'banner', file?: File) {
    if (!file) return;
    try {
      const image = await readImage(file);
      update(key, await ensureWebpImage(image));
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  function validateStep(index: number) {
    if (index === 0 && draft.name.trim().length < 2)
      return 'Escribe el nombre del negocio (mínimo 2 caracteres).';
    if (index === 1 && !draft.categories.length) return 'Agrega al menos una categoría.';
    if (index === 2) {
      if (!draft.menuItems.length) return 'Agrega al menos un producto al menú.';
      if (draft.menuItems.some((item) => !item.name.trim() || !String(item.price ?? '').trim()))
        return 'Completa el nombre y precio de cada producto.';
      if (
        draft.menuItems.some((item) => !item.category || !draft.categories.includes(item.category))
      )
        return 'Asigna cada producto a una categoría activa.';
      if (draft.menuItems.some((item) => !item.image))
        return 'Agrega una imagen a cada producto para publicarlo en el menú.';
    }
    if (index === 4) {
      if (!draft.serviceDays.length) return 'Selecciona al menos un día de servicio.';
      if (!draft.openingTime || !draft.closingTime || draft.openingTime >= draft.closingTime)
        return 'Revisa el horario: la hora de cierre debe ser posterior a la apertura.';
    }
    return '';
  }

  function draftConfig(current: BusinessConfig): BusinessConfig {
    const phoneNumbers = draft.phoneNumbers.map((phone) => phone.trim()).filter(Boolean);
    const menuItems = draft.menuItems
      .filter((item) => item.name.trim())
      .map((item) => ({ ...item, name: item.name.trim(), imageUrl: undefined }));
    return {
      ...current,
      name: draft.name.trim(),
      logo: draft.logo || undefined,
      banner: draft.banner || undefined,
      categories: [...draft.categories],
      menuItems,
      primaryColor: draft.primaryColor,
      secondaryColor: draft.secondaryColor,
      welcomeMessage: draft.welcomeMessage.trim(),
      description: draft.description.trim(),
      phone: phoneNumbers[0],
      phoneNumbers,
      address: draft.address.trim(),
      location: draft.address.trim(),
      serviceDays: [...draft.serviceDays].sort((a, b) => a - b),
      openingTime: draft.openingTime,
      closingTime: draft.closingTime,
      openingHours: hoursLabel(draft),
      deliveryAvailable: draft.deliveryAvailable,
      allowOrders: draft.allowOrders,
      fontFamily: draft.fontFamily,
      menuStyle: draft.menuStyle,
      onboarded: current.onboarded ?? false,
    };
  }

  async function saveDraft() {
    if (!business.data) return false;
    const revision = draftRevision.current;
    try {
      await saveBusinessDraft.mutateAsync(draftConfig(business.data));
      if (draftRevision.current === revision) setDraftSavedAt(Date.now());
      return true;
    } catch {
      return false;
    }
  }

  async function changeStep(nextStep: number) {
    if (nextStep === step || saveBusinessDraft.isPending || saveBusiness.isPending) return;
    if (await saveDraft()) setStep(nextStep);
  }

  function goNext() {
    void changeStep(Math.min(step + 1, steps.length - 1));
  }

  async function save() {
    for (let index = 0; index < steps.length; index += 1) {
      const error = validateStep(index);
      if (error) {
        setStep(index);
        toast.error(error);
        return;
      }
    }
    const current = business.data;
    if (!current) return;
    setPreparingImages(true);
    try {
      const menuItems = await Promise.all(
        draft.menuItems.map(async (item) => ({
          ...item,
          name: item.name.trim(),
          image: await ensureWebpImage(item.image!),
          imageUrl: undefined,
        })),
      );
      const phoneNumbers = draft.phoneNumbers.map((phone) => phone.trim()).filter(Boolean);
      const config: BusinessConfig = {
        ...current,
        name: draft.name.trim(),
        logo: draft.logo || undefined,
        banner: draft.banner || undefined,
        categories: [...draft.categories],
        menuItems,
        primaryColor: draft.primaryColor,
        secondaryColor: draft.secondaryColor,
        welcomeMessage: draft.welcomeMessage.trim(),
        description: draft.description.trim(),
        phone: phoneNumbers[0],
        phoneNumbers,
        address: draft.address.trim(),
        location: draft.address.trim(),
        serviceDays: [...draft.serviceDays].sort((a, b) => a - b),
        openingTime: draft.openingTime,
        closingTime: draft.closingTime,
        openingHours: hoursLabel(draft),
        deliveryAvailable: draft.deliveryAvailable,
        allowOrders: draft.allowOrders,
        fontFamily: draft.fontFamily,
        menuStyle: draft.menuStyle,
        onboarded: true,
      };
      saveBusiness.mutate(config);
    } catch (error) {
      toast.error((error as Error).message || 'No pudimos preparar las imágenes del menú.');
    } finally {
      setPreparingImages(false);
    }
  }

  if (business.isPending)
    return (
      <div
        className="grid min-h-56 place-content-center gap-3 text-center text-sm text-slate-500"
        role="status"
      >
        Cargando la configuración de tu menú…
      </div>
    );
  if (business.isError || !business.data)
    return (
      <section className="mx-auto grid min-h-56 max-w-lg content-center justify-items-center gap-3 px-6 text-center text-slate-600">
        <h2 className="text-xl font-bold text-slate-900">No pudimos cargar tu negocio</h2>
        <p className="text-sm">Comprueba tu conexión e inténtalo de nuevo.</p>
        <Button variant="outline" onClick={() => void business.refetch()}>
          Volver a intentar
        </Button>
      </section>
    );
  if (!loaded)
    return (
      <div
        className="grid min-h-56 place-content-center gap-3 text-center text-sm text-slate-500"
        role="status"
      >
        Cargando la configuración de tu menú…
      </div>
    );

  const ActiveIcon = steps[step].icon;
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-emerald-700">
            <Utensils size={14} /> CONFIGURA TU MENÚ
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Mi menú
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Organiza la información, el catálogo y cómo reciben pedidos tus clientes.
          </p>
        </div>
        <a
          className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-xs font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-50"
          href={publicMenuUrl(slugify(draft.name || 'negocio'))}
          target="_blank"
          rel="noreferrer"
        >
          Ver menú público <ArrowRight size={15} />
        </a>
      </header>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1.12fr)_minmax(340px,0.88fr)]">
        <section
          className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          aria-label="Configuración del menú"
        >
          <nav
            className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50 p-2 sm:grid sm:grid-cols-5 sm:p-3"
            aria-label="Pasos de configuración"
          >
            {steps.map(({ title, subtitle, icon: Icon }, index) => (
              <button
                type="button"
                key={title}
                className={`flex min-w-24 flex-col items-center gap-1.5 rounded-xl px-3 py-2 text-center transition sm:min-w-0 sm:flex-row sm:gap-2 sm:text-left ${index === step ? 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200' : index < step ? 'text-emerald-800 hover:bg-emerald-50' : 'text-slate-500 hover:bg-slate-100'}`}
                aria-current={index === step ? 'step' : undefined}
                disabled={saveBusinessDraft.isPending || saveBusiness.isPending}
                onClick={() => void changeStep(index)}
              >
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-lg ${index <= step ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-500'}`}
                >
                  {index < step ? <Check size={17} /> : <Icon size={17} />}
                </span>
                <span>
                  <strong className="block max-w-28 truncate text-[11px] font-bold sm:max-w-none">
                    {title}
                  </strong>
                  <small className="hidden text-[10px] text-slate-500 sm:block">{subtitle}</small>
                </span>
                {index < step && (
                  <Check className="ml-auto hidden text-emerald-700 sm:block" size={14} />
                )}
              </button>
            ))}
          </nav>

          <div className="min-h-[520px] px-5 py-6 sm:px-7 sm:py-7">
            <div className="mb-6">
              <span className="text-[10px] font-extrabold tracking-[0.15em] text-slate-400">
                {String(step + 1).padStart(2, '0')} / 05
              </span>
              <h2 className="mt-2 flex items-center gap-2.5 text-xl font-extrabold tracking-tight text-slate-900">
                <ActiveIcon size={20} className="text-emerald-700" /> {steps[step].title}
              </h2>
            </div>
            {step === 0 && (
              <section className="flex flex-col gap-4">
                <p className="-mt-2 mb-1 text-sm leading-6 text-slate-500">
                  Los datos esenciales que identifican tu restaurante en el menú digital.
                </p>
                <label className="flex min-w-0 flex-col gap-2 text-xs font-semibold text-slate-700">
                  Nombre del negocio
                  <input
                    className={fieldControlClass}
                    value={draft.name}
                    maxLength={90}
                    onChange={(event) => update('name', event.target.value)}
                    placeholder="Ej. Café Avellaneda"
                  />
                </label>
                <label className="flex min-w-0 flex-col gap-2 text-xs font-semibold text-slate-700">
                  Mensaje de bienvenida
                  <input
                    className={fieldControlClass}
                    value={draft.welcomeMessage}
                    maxLength={140}
                    onChange={(event) => update('welcomeMessage', event.target.value)}
                    placeholder="¿Qué se te antoja?"
                  />
                </label>
                <label className="flex min-w-0 flex-col gap-2 text-xs font-semibold text-slate-700">
                  Descripción
                  <textarea
                    className={`${fieldControlClass} resize-y`}
                    rows={3}
                    value={draft.description}
                    maxLength={400}
                    onChange={(event) => update('description', event.target.value)}
                    placeholder="Cuéntales qué hace especial a tu negocio"
                  />
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <BrandImageField
                    title="Logo"
                    value={draft.logo}
                    onChange={(file) => void uploadBrandImage('logo', file)}
                  />
                  <BrandImageField
                    title="Banner"
                    value={draft.banner}
                    onChange={(file) => void uploadBrandImage('banner', file)}
                    wide
                  />
                </div>
                <label className="flex min-w-0 flex-col gap-2 text-xs font-semibold text-slate-700">
                  Domicilio
                  <input
                    className={fieldControlClass}
                    value={draft.address}
                    onChange={(event) => update('address', event.target.value)}
                    placeholder="Calle, número, colonia y ciudad"
                  />
                </label>
                <div className="flex min-w-0 flex-col gap-2 text-xs font-semibold text-slate-700">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span>Teléfonos</span>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 py-1 text-xs font-bold text-emerald-700 hover:text-emerald-900 disabled:cursor-not-allowed disabled:text-slate-400"
                      onClick={() => update('phoneNumbers', [...draft.phoneNumbers, ''])}
                      disabled={draft.phoneNumbers.length >= 5}
                    >
                      <Plus size={14} /> Agregar teléfono
                    </button>
                  </div>
                  {draft.phoneNumbers.map((phone, index) => (
                    <div
                      className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 px-3 text-slate-500"
                      key={`phone-${index}`}
                    >
                      <Phone size={16} />
                      <input
                        aria-label={`Teléfono ${index + 1}`}
                        className="min-w-0 flex-1 bg-transparent py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                        type="tel"
                        value={phone}
                        onChange={(event) =>
                          update(
                            'phoneNumbers',
                            draft.phoneNumbers.map((value, itemIndex) =>
                              itemIndex === index ? event.target.value : value,
                            ),
                          )
                        }
                        placeholder="55 1234 5678"
                      />
                      {draft.phoneNumbers.length > 1 && (
                        <button
                          type="button"
                          aria-label={`Quitar teléfono ${index + 1}`}
                          className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                          onClick={() =>
                            update(
                              'phoneNumbers',
                              draft.phoneNumbers.filter((_, itemIndex) => itemIndex !== index),
                            )
                          }
                        >
                          <X size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {step === 1 && (
              <section className="flex flex-col gap-4">
                <p className="-mt-2 mb-1 text-sm leading-6 text-slate-500">
                  Selecciona las categorías habilitadas para tu negocio. La lista se obtiene del
                  catálogo público de Punto Plus.
                </p>
                {publicCategories.isPending ? (
                  <div
                    className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-500"
                    role="status"
                  >
                    Cargando categorías disponibles…
                  </div>
                ) : publicCategories.isError ? (
                  <div
                    className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-500"
                    role="alert"
                  >
                    No pudimos cargar las categorías.
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void publicCategories.refetch()}
                    >
                      Reintentar
                    </Button>
                  </div>
                ) : availableCategoryNames.length ? (
                  <div className="flex flex-wrap gap-2">
                    {availableCategoryNames.map((category) => {
                      const selected = draft.categories.includes(category);
                      return (
                        <button
                          type="button"
                          key={category}
                          aria-pressed={selected}
                          className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold transition ${selected ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50'}`}
                          onClick={() => toggleCategory(category)}
                        >
                          {selected && <Check size={14} />}
                          {category}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-500">
                    Todavía no hay categorías disponibles para seleccionar.
                  </div>
                )}
              </section>
            )}

            {step === 2 && (
              <section className="flex flex-col gap-4">
                <p className="-mt-2 mb-1 text-sm leading-6 text-slate-500">
                  Elige una categoría para administrar sus productos. Las fotos se recortan y se
                  convierten a WebP antes de guardarse.
                </p>
                {!draft.categories.length ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-500">
                    Primero agrega categorías en el paso anterior.
                  </div>
                ) : (
                  <>
                    <label className="flex min-w-0 flex-col gap-2 text-xs font-semibold text-slate-700">
                      Categoría activa
                      <select
                        className={fieldControlClass}
                        value={selectedCategory}
                        onChange={(event) => setSelectedCategory(event.target.value)}
                      >
                        {draft.categories.map((category) => (
                          <option key={category}>{category}</option>
                        ))}
                      </select>
                    </label>
                    <div className="flex max-h-96 flex-col gap-3 overflow-y-auto pr-1">
                      {visibleProducts.map((item) => (
                        <article
                          className="grid grid-cols-[64px_minmax(0,1fr)] items-start gap-3 rounded-xl border border-slate-200 bg-white p-3"
                          key={item.id}
                        >
                          <div className="relative grid size-16 place-items-center overflow-hidden rounded-xl bg-slate-100 text-slate-400">
                            {item.image ? (
                              <img src={item.image} alt="" className="size-full object-cover" />
                            ) : (
                              <ImagePlus size={19} />
                            )}
                            {item.image?.startsWith('data:image/webp') && (
                              <span className="absolute bottom-1 right-1 rounded bg-emerald-700 px-1.5 py-0.5 text-[8px] font-extrabold text-white">
                                WEBP
                              </span>
                            )}
                          </div>
                          <div className="flex min-w-0 flex-col gap-2">
                            <input
                              className={fieldControlClass}
                              aria-label={`Nombre de ${item.name || 'producto'}`}
                              value={item.name}
                              onChange={(event) =>
                                update(
                                  'menuItems',
                                  draft.menuItems.map((product) =>
                                    product.id === item.id
                                      ? { ...product, name: event.target.value }
                                      : product,
                                  ),
                                )
                              }
                              placeholder="Nombre del producto"
                            />
                            <div className="flex flex-wrap items-center gap-2">
                              <label className="flex w-24 items-center gap-1.5 rounded-lg border border-slate-200 px-2 text-xs text-slate-500">
                                <span>$</span>
                                <input
                                  className="min-w-0 flex-1 bg-transparent py-2 text-sm text-slate-800 outline-none"
                                  aria-label={`Precio de ${item.name || 'producto'}`}
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.price ?? ''}
                                  onChange={(event) =>
                                    update(
                                      'menuItems',
                                      draft.menuItems.map((product) =>
                                        product.id === item.id
                                          ? { ...product, price: event.target.value }
                                          : product,
                                      ),
                                    )
                                  }
                                  placeholder="0.00"
                                />
                              </label>
                              <button
                                type="button"
                                className="inline-flex items-center gap-1.5 py-1 text-xs font-bold text-emerald-700 hover:text-emerald-900 disabled:cursor-not-allowed disabled:text-slate-400"
                                onClick={() =>
                                  setImageEdit({ productId: item.id, src: item.image ?? '' })
                                }
                              >
                                <Palette size={14} /> {item.image ? 'Editar foto' : 'Añadir foto'}
                              </button>
                              <button
                                type="button"
                                className="grid size-8 place-items-center rounded-lg text-rose-600 transition hover:bg-rose-50"
                                onClick={() =>
                                  update(
                                    'menuItems',
                                    draft.menuItems.filter((product) => product.id !== item.id),
                                  )
                                }
                                aria-label={`Eliminar ${item.name || 'producto'}`}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                            <textarea
                              className={`${fieldControlClass} resize-y`}
                              aria-label={`Descripción de ${item.name || 'producto'}`}
                              rows={2}
                              value={item.description ?? ''}
                              onChange={(event) =>
                                update(
                                  'menuItems',
                                  draft.menuItems.map((product) =>
                                    product.id === item.id
                                      ? { ...product, description: event.target.value }
                                      : product,
                                  ),
                                )
                              }
                              placeholder="Descripción breve (opcional)"
                            />
                          </div>
                        </article>
                      ))}
                      {!visibleProducts.length && (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-500">
                          Aún no hay productos en {selectedCategory}.
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="self-start"
                      onClick={() =>
                        update('menuItems', [
                          ...draft.menuItems,
                          {
                            id: crypto.randomUUID(),
                            name: '',
                            price: '',
                            category: selectedCategory,
                            available: true,
                          },
                        ])
                      }
                    >
                      <Plus size={16} /> Agregar producto a {selectedCategory}
                    </Button>
                  </>
                )}
              </section>
            )}

            {step === 3 && (
              <section className="flex flex-col gap-4">
                <p className="-mt-2 mb-1 text-sm leading-6 text-slate-500">
                  Elige una tipografía y la paleta para que el menú tenga la personalidad de tu
                  negocio.
                </p>
                <label className="flex min-w-0 flex-col gap-2 text-xs font-semibold text-slate-700">
                  Tipografía
                  <select
                    className={fieldControlClass}
                    value={draft.fontFamily}
                    onChange={(event) =>
                      update('fontFamily', event.target.value as Draft['fontFamily'])
                    }
                  >
                    <option value="dm-sans">DM Sans · Moderna y legible</option>
                    <option value="manrope">Manrope · Geométrica</option>
                    <option value="serif">Serif · Clásica</option>
                  </select>
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <ColorField
                    label="Color principal"
                    value={draft.primaryColor}
                    onChange={(value) => update('primaryColor', value)}
                  />
                  <ColorField
                    label="Color secundario"
                    value={draft.secondaryColor}
                    onChange={(value) => update('secondaryColor', value)}
                  />
                </div>
                <fieldset className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-4">
                  <legend className="px-1 text-xs font-bold text-slate-800">
                    Estilo de presentación
                  </legend>
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${draft.menuStyle === 'cozy' ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'}`}
                  >
                    <input
                      className="mt-1 accent-emerald-700"
                      type="radio"
                      name="menu-style"
                      checked={draft.menuStyle === 'cozy'}
                      onChange={() => update('menuStyle', 'cozy')}
                    />
                    <span>
                      <strong className="text-sm font-bold text-slate-800">Espacioso</strong>
                      <small className="text-xs leading-5 text-slate-500">
                        Más aire entre los platillos y sus detalles.
                      </small>
                    </span>
                  </label>
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${draft.menuStyle === 'compact' ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'}`}
                  >
                    <input
                      className="mt-1 accent-emerald-700"
                      type="radio"
                      name="menu-style"
                      checked={draft.menuStyle === 'compact'}
                      onChange={() => update('menuStyle', 'compact')}
                    />
                    <span>
                      <strong className="text-sm font-bold text-slate-800">Compacto</strong>
                      <small className="text-xs leading-5 text-slate-500">
                        Muestra más productos en menos espacio.
                      </small>
                    </span>
                  </label>
                </fieldset>
              </section>
            )}

            {step === 4 && (
              <section className="flex flex-col gap-4">
                <p className="-mt-2 mb-1 text-sm leading-6 text-slate-500">
                  Define cuándo abres y qué opciones de servicio estarán disponibles para tus
                  clientes.
                </p>
                <fieldset className="rounded-2xl border border-slate-200 p-4">
                  <legend className="px-1 text-xs font-bold text-slate-800">
                    Días de servicio
                  </legend>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                    {dayNames.map((day, index) => (
                      <button
                        type="button"
                        key={day}
                        aria-pressed={draft.serviceDays.includes(index)}
                        className={`min-h-9 rounded-lg border text-xs font-bold transition ${draft.serviceDays.includes(index) ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50'}`}
                        onClick={() =>
                          update(
                            'serviceDays',
                            draft.serviceDays.includes(index)
                              ? draft.serviceDays.filter((item) => item !== index)
                              : [...draft.serviceDays, index],
                          )
                        }
                      >
                        {dayShort[index]}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="flex min-w-0 flex-col gap-2 text-xs font-semibold text-slate-700">
                    Apertura
                    <input
                      className={fieldControlClass}
                      type="time"
                      value={draft.openingTime}
                      onChange={(event) => update('openingTime', event.target.value)}
                    />
                  </label>
                  <label className="flex min-w-0 flex-col gap-2 text-xs font-semibold text-slate-700">
                    Cierre
                    <input
                      className={fieldControlClass}
                      type="time"
                      value={draft.closingTime}
                      onChange={(event) => update('closingTime', event.target.value)}
                    />
                  </label>
                </div>
                <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
                  <span>
                    <strong className="block text-sm font-bold text-slate-800">
                      Reparto a domicilio propio
                    </strong>
                    <small className="mt-1 block text-xs leading-5 text-slate-500">
                      Indica si tu negocio entrega directamente los pedidos.
                    </small>
                  </span>
                  <input
                    className="size-5 shrink-0 accent-emerald-700"
                    type="checkbox"
                    checked={draft.deliveryAvailable}
                    onChange={(event) => update('deliveryAvailable', event.target.checked)}
                  />
                </label>
                <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
                  <span>
                    <strong className="block text-sm font-bold text-slate-800">
                      Permitir pedidos desde el menú
                    </strong>
                    <small className="mt-1 block text-xs leading-5 text-slate-500">
                      Los clientes podrán armar una orden desde tu menú digital.
                    </small>
                  </span>
                  <input
                    className="size-5 shrink-0 accent-emerald-700"
                    type="checkbox"
                    checked={draft.allowOrders}
                    onChange={(event) => update('allowOrders', event.target.checked)}
                  />
                </label>
              </section>
            )}
          </div>

          <footer className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 flex-col items-start gap-1">
              <span className="text-[10px] font-semibold text-slate-500">
                Paso {step + 1} de {steps.length}
              </span>
              <span className="text-xs text-slate-500" role="status" aria-live="polite">
                {saveBusinessDraft.isPending
                  ? 'Guardando borrador…'
                  : draftSavedAt
                    ? 'Borrador guardado'
                    : 'Se guardará al cambiar de paso'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={saveBusinessDraft.isPending || saveBusiness.isPending}
                  onClick={() => void changeStep(step - 1)}
                >
                  <ArrowLeft size={16} /> Anterior
                </Button>
              )}
              {step < steps.length - 1 ? (
                <Button type="button" disabled={saveBusinessDraft.isPending} onClick={goNext}>
                  {saveBusinessDraft.isPending ? 'Guardando…' : 'Siguiente'}{' '}
                  {!saveBusinessDraft.isPending && <ArrowRight size={16} />}
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={
                    saveBusiness.isPending || saveBusinessDraft.isPending || preparingImages
                  }
                  onClick={() => void save()}
                >
                  <Save size={16} />{' '}
                  {preparingImages
                    ? 'Preparando imágenes…'
                    : saveBusiness.isPending
                      ? 'Guardando…'
                      : 'Guardar mi menú'}
                </Button>
              )}
            </div>
          </footer>
        </section>

        <aside className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm xl:sticky xl:top-5">
          <div className="mb-3 flex items-center justify-between gap-2 px-1">
            <span className="inline-flex items-center gap-2 text-[10px] font-extrabold tracking-[0.1em] text-slate-700">
              <span className="size-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/15" />
              VISTA PREVIA EN VIVO
            </span>
            <small className="text-[10px] text-slate-500">Así lo verán tus clientes</small>
          </div>
          <LiveMenuPreview draft={draft} />
          <div className="flex items-center justify-center gap-2 px-1 pt-3 text-center text-[10px] text-slate-500">
            <Check size={15} className="shrink-0 text-emerald-700" />
            Los cambios se reflejan mientras editas y se guardan al avanzar.
          </div>
        </aside>
      </div>

      <ImageEditorDialog
        image={imageEdit}
        onClose={() => setImageEdit(null)}
        onSave={(webp) => {
          if (imageEdit)
            update(
              'menuItems',
              draft.menuItems.map((item) =>
                item.id === imageEdit.productId
                  ? { ...item, image: webp, imageUrl: undefined }
                  : item,
              ),
            );
          setImageEdit(null);
          toast.success('Imagen recortada y convertida a WebP.');
        }}
      />
    </div>
  );
}

function BrandImageField({
  title,
  value,
  onChange,
  wide = false,
}: {
  title: string;
  value: string;
  onChange: (file?: File) => void;
  wide?: boolean;
}) {
  const inputId = `menu-${title.toLocaleLowerCase()}-upload`;
  const previewClass = wide
    ? 'h-28 w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 object-contain'
    : 'size-28 rounded-xl border border-dashed border-slate-300 bg-slate-50 object-contain';
  return (
    <div className="flex min-w-0 flex-col items-start gap-2 text-xs font-semibold text-slate-700">
      <span>{title}</span>
      {value ? (
        <img src={value} alt={`${title} del negocio`} className={previewClass} />
      ) : (
        <div className={`${previewClass} grid place-items-center text-slate-400`}>
          <ImagePlus size={21} />
          <small className="text-[10px] font-normal">Sin {title.toLocaleLowerCase()}</small>
        </div>
      )}
      <label
        htmlFor={inputId}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-[11px] font-bold text-emerald-800 transition hover:bg-emerald-50"
      >
        <ImagePlus size={14} /> {value ? 'Cambiar' : 'Subir'} {title.toLocaleLowerCase()}
      </label>
      <input
        id={inputId}
        className="sr-only"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(event) => {
          onChange(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
    </div>
  );
}

function ColorField({
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

function LiveMenuPreview({ draft }: { draft: Draft }) {
  const categories = draft.categories.length ? draft.categories : ['Categorías'];
  const previewItems = draft.menuItems.length
    ? draft.menuItems.slice(0, 4)
    : [{ id: 'preview-one', name: 'Tu próximo favorito', category: categories[0], price: '95' }];
  return (
    <div
      className={`restaurant-menu business-live-device menu-style-${draft.menuStyle}`}
      style={
        {
          '--restaurant-primary': draft.primaryColor,
          '--restaurant-soft': draft.secondaryColor,
          '--menu-font-family': fontStack(draft.fontFamily),
        } as React.CSSProperties
      }
    >
      <header className="restaurant-hero">
        {draft.banner ? (
          <img src={draft.banner} alt="" className="restaurant-hero-image" />
        ) : (
          <div className="restaurant-hero-image restaurant-hero-fallback" />
        )}
        <div className="restaurant-hero-shade" />
        <div className="restaurant-hero-top">
          <span className="restaurant-back">
            <ArrowLeft size={17} />
          </span>
          <span className="restaurant-brand-mark">
            <span>✦</span> PUNTO PLUS
          </span>
          <span className="restaurant-cart-top">
            <ShoppingBag size={16} />
            <span>{draft.allowOrders ? '0' : '—'}</span>
          </span>
        </div>
        <div className="restaurant-identity">
          <div className="restaurant-logo-wrap" style={{ borderColor: draft.secondaryColor }}>
            {draft.logo ? (
              <img src={draft.logo} alt="" />
            ) : (
              <Utensils size={24} style={{ color: draft.primaryColor }} />
            )}
          </div>
          <p className="restaurant-eyebrow">MENÚ DEL RESTAURANTE</p>
          <h1>{draft.name || 'Tu negocio'}</h1>
          {draft.description && <p className="restaurant-description">{draft.description}</p>}
          <div className="restaurant-meta">
            {draft.address && (
              <span>
                <MapPin size={13} />
                {draft.address}
              </span>
            )}
            <span>
              <Clock3 size={13} />
              {hoursLabel(draft)}
            </span>
          </div>
        </div>
        <div className="restaurant-hero-bottom" />
      </header>
      <main className="restaurant-content">
        <section className="restaurant-welcome">
          <div>
            <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-emerald-700">
              HECHO PARA DISFRUTAR
            </p>
            <h2>¿Qué se te antoja?</h2>
            <p>{draft.welcomeMessage || 'Explora nuestro menú.'}</p>
          </div>
          <div className="restaurant-welcome-icon">
            <Utensils size={19} />
          </div>
        </section>
        <div className="flex h-10 items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 text-xs text-slate-400">
          ⌕ <span>Buscar en el menú</span>
        </div>
        <nav className="menu-category-nav" aria-label="Vista previa de categorías">
          {['Todos', ...categories].map((category, index) => (
            <span className={index === 0 ? 'selected' : ''} key={category}>
              {category}
            </span>
          ))}
        </nav>
        <section className="menu-section">
          <div className="menu-section-heading">
            <div>
              <span className="menu-section-icon">
                <span>✦</span>
              </span>
              <div>
                <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-emerald-700">
                  LOS FAVORITOS
                </p>
                <h2>Los más pedidos</h2>
              </div>
            </div>
            <span className="menu-section-caption">De la casa</span>
          </div>
          <div className="popular-dishes">
            {previewItems.slice(0, 3).map((item) => (
              <article className="dish-card dish-card-popular" key={item.id}>
                <span className="dish-image-wrap">
                  {item.image ? (
                    <img src={item.image} alt="" className="dish-image" />
                  ) : (
                    <span className="menu-preview-image-placeholder">
                      <Utensils size={19} />
                    </span>
                  )}
                </span>
                <span className="dish-card-copy">
                  <span className="dish-card-category">{item.category || 'De la casa'}</span>
                  <strong>{item.name || 'Nombre del platillo'}</strong>
                  <span className="dish-card-price">{item.price ? `$${item.price}` : '$0.00'}</span>
                </span>
              </article>
            ))}
          </div>
        </section>
        <section className="menu-section">
          <div className="menu-section-heading">
            <div>
              <span className="menu-section-icon">
                <Utensils size={14} />
              </span>
              <div>
                <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-emerald-700">
                  EL MENÚ
                </p>
                <h2>{categories[0]}</h2>
              </div>
            </div>
          </div>
          <div className="menu-catalog-grid">
            {previewItems.map((item) => (
              <article className="dish-card" key={`catalog-${item.id}`}>
                <span className="dish-image-wrap">
                  {item.image ? (
                    <img src={item.image} alt="" className="dish-image" />
                  ) : (
                    <span className="menu-preview-image-placeholder">
                      <Utensils size={19} />
                    </span>
                  )}
                </span>
                <span className="dish-card-copy">
                  <span className="dish-card-category">{item.category || categories[0]}</span>
                  <strong>{item.name || 'Nombre del platillo'}</strong>
                  <span className="dish-card-price">{item.price ? `$${item.price}` : '$0.00'}</span>
                </span>
              </article>
            ))}
          </div>
        </section>
        <div className="menu-preview-service">
          {draft.deliveryAvailable && <span>Reparto a domicilio</span>}
          {draft.allowOrders ? (
            <span>Pedidos en línea disponibles</span>
          ) : (
            <span>Consulta disponibilidad en el negocio</span>
          )}
          {draft.phoneNumbers.filter(Boolean).map((phone) => (
            <span key={phone}>
              <Phone size={12} />
              {phone}
            </span>
          ))}
        </div>
      </main>
    </div>
  );
}

function ImageEditorDialog({
  image,
  onClose,
  onSave,
}: {
  image: { productId: string; src: string } | null;
  onClose: () => void;
  onSave: (webp: string) => void;
}) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [zoom, setZoom] = useState(1.08);
  const [rotation, setRotation] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  useEffect(() => {
    setLoaded(false);
    setZoom(1.08);
    setRotation(0);
    setBrightness(100);
    setContrast(100);
    setOffsetX(0);
    setOffsetY(0);
  }, [image?.src]);

  async function chooseImage(file?: File) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Selecciona una imagen JPG, PNG o WebP.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error('La imagen debe pesar menos de 15 MB.');
      return;
    }
    try {
      const source = await fileToDataUrl(file);
      setLoaded(false);
      setImageSource(source);
    } catch {
      toast.error('No pudimos abrir esta imagen.');
    }
  }

  const [imageSource, setImageSource] = useState('');
  useEffect(() => {
    setImageSource(image?.src ?? '');
  }, [image]);

  async function applyEdit() {
    const imageElement = imageRef.current;
    if (!imageElement || !image) return;
    setProcessing(true);
    try {
      const canvas = document.createElement('canvas');
      const outputSize = 900;
      canvas.width = outputSize;
      canvas.height = outputSize;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Tu navegador no permite procesar imágenes.');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, outputSize, outputSize);
      const sideways = Math.abs(rotation % 180) === 90;
      const boundsWidth = sideways ? imageElement.naturalHeight : imageElement.naturalWidth;
      const boundsHeight = sideways ? imageElement.naturalWidth : imageElement.naturalHeight;
      const scale = Math.max(outputSize / boundsWidth, outputSize / boundsHeight) * zoom;
      context.translate(
        outputSize / 2 + ((offsetX / 100) * outputSize) / 2,
        outputSize / 2 + ((offsetY / 100) * outputSize) / 2,
      );
      context.rotate((rotation * Math.PI) / 180);
      context.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
      context.drawImage(
        imageElement,
        -(imageElement.naturalWidth * scale) / 2,
        -(imageElement.naturalHeight * scale) / 2,
        imageElement.naturalWidth * scale,
        imageElement.naturalHeight * scale,
      );
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/webp', 0.88),
      );
      if (!blob || blob.type !== 'image/webp')
        throw new Error('No se pudo convertir la imagen a WebP en este navegador.');
      onSave(await fileToDataUrl(blob));
    } catch (error) {
      toast.error((error as Error).message || 'No pudimos editar la imagen.');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <Dialog
      open={Boolean(image)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Editar imagen del platillo"
      description="Recorta, gira y ajusta la imagen. Se guardará como WebP."
      className="menu-image-editor-dialog"
    >
      {image && (
        <div className="menu-image-editor">
          <div className="menu-image-editor-controls">
            <label className="menu-image-upload-button">
              <ImagePlus size={15} /> Elegir otra imagen
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => {
                  void chooseImage(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
            </label>
            {imageSource && (
              <div className="menu-image-crop-frame">
                <img
                  ref={imageRef}
                  src={imageSource}
                  alt="Recorte del platillo"
                  onLoad={() => setLoaded(true)}
                  style={{
                    transform: `translate(${offsetX / 5}%, ${offsetY / 5}%) rotate(${rotation}deg) scale(${zoom})`,
                    filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                  }}
                />
              </div>
            )}
            <label>
              Acercar / alejar{' '}
              <input
                type="range"
                min="1"
                max="2.8"
                step="0.01"
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
              />
            </label>
            <div className="menu-image-slider-row">
              <label>
                Giro{' '}
                <select
                  value={rotation}
                  onChange={(event) => setRotation(Number(event.target.value))}
                >
                  <option value={0}>0°</option>
                  <option value={90}>90°</option>
                  <option value={180}>180°</option>
                  <option value={270}>270°</option>
                </select>
              </label>
              <label>
                Luz{' '}
                <input
                  type="range"
                  min="60"
                  max="140"
                  value={brightness}
                  onChange={(event) => setBrightness(Number(event.target.value))}
                />
              </label>
            </div>
            <label>
              Contraste{' '}
              <input
                type="range"
                min="60"
                max="150"
                value={contrast}
                onChange={(event) => setContrast(Number(event.target.value))}
              />
            </label>
            <div className="menu-image-slider-row">
              <label>
                Encuadre horizontal{' '}
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={offsetX}
                  onChange={(event) => setOffsetX(Number(event.target.value))}
                />
              </label>
              <label>
                Encuadre vertical{' '}
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={offsetY}
                  onChange={(event) => setOffsetY(Number(event.target.value))}
                />
              </label>
            </div>
            <p className="menu-webp-note">
              <Check size={14} /> El recorte se convertirá a WebP antes de guardarse.
            </p>
            <div className="menu-image-editor-actions">
              <Button type="button" variant="ghost" onClick={onClose}>
                <X size={15} /> Cancelar
              </Button>
              <Button
                type="button"
                disabled={!loaded || processing}
                onClick={() => void applyEdit()}
              >
                <Check size={15} /> {processing ? 'Procesando…' : 'Aplicar recorte'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}

function fileToDataUrl(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.readAsDataURL(file);
  });
}

async function ensureWebpImage(source: string) {
  if (/^data:image\/webp/i.test(source) || /\.webp(?:[?#]|$)/i.test(source)) return source;
  const image = new Image();
  if (/^https?:\/\//i.test(source)) image.crossOrigin = 'anonymous';
  const loaded = new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () =>
      reject(
        new Error(
          'No se pudo preparar una foto del menú. Vuelve a subirla para convertirla a WebP.',
        ),
      );
  });
  image.src = source;
  await loaded;
  const size = 900;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Este navegador no permite convertir imágenes a WebP.');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, size, size);
  const scale = Math.max(size / image.naturalWidth, size / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', 0.88),
  );
  if (!blob || blob.type !== 'image/webp')
    throw new Error(
      'No se pudo convertir una foto a WebP. Vuelve a editarla e inténtalo otra vez.',
    );
  return fileToDataUrl(blob);
}
