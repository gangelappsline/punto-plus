import { useCallback, useEffect, useMemo, useState } from 'react';
import { cn, isDemo } from '../lib/utils';
import { ArrowRight, CheckCircle2, ImagePlus, Palette, Save, Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { BusinessConfig, MenuItem, PromotionType } from '../lib/types';
import { foodCategories } from '../lib/types';
import { extractPaletteFromFile } from '../lib/colors';
import { readImage } from '../lib/image';
import { usePublishBusiness } from '../lib/queries';
import type { PromotionInput } from '../services/api';
import { Button } from '../components/ui/button';
import { QRCodeSVG } from 'qrcode.react';

const steps = [
  { id: 'logo', label: 'Logo' },
  { id: 'banner', label: 'Banner' },
  { id: 'name', label: 'Nombre del negocio' },
  { id: 'categories', label: 'Categorías de comida' },
  { id: 'menu', label: 'Menú' },
  { id: 'colors', label: 'Colores del menú y QR' },
  { id: 'promotion', label: 'Promoción de bienvenida' },
  { id: 'done', label: 'Listo' },
] as const;
type StepId = (typeof steps)[number]['id'];

/** Pasos con datos obligatorios; `banner` y `menu` son opcionales. */
const REQUIRED_STEPS: StepId[] = ['logo', 'name', 'categories', 'colors', 'promotion'];

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'negocio'
  );
}

/** Platos iniciales sugeridos según las categorías que vende el negocio. */
function starterItems(categories: string[]): MenuItem[] {
  const catalog: Record<string, Omit<MenuItem, 'id'>[]> = {
    Desayuno: [
      { name: 'Huevos rancheros', price: '85', category: 'Desayuno' },
      { name: 'Chilaquiles verdes', price: '75', category: 'Desayuno' },
    ],
    Cafetería: [
      { name: 'Café americano', price: '45', category: 'Cafetería' },
      { name: 'Capuchino', price: '55', category: 'Cafetería' },
    ],
    Comida: [
      { name: 'Plato del día', price: '110', category: 'Comida' },
      { name: 'Sopa de tortilla', price: '65', category: 'Comida' },
    ],
    Cena: [
      { name: 'Ensalada César', price: '95', category: 'Cena' },
      { name: 'Pasta a la pesto', price: '120', category: 'Cena' },
    ],
    'Bebidas calientes': [
      { name: 'Café de olla', price: '45', category: 'Bebidas calientes' },
      { name: 'Capuchino', price: '55', category: 'Bebidas calientes' },
    ],
    'Bebidas frías': [
      { name: 'Agua fresca de jamaica', price: '35', category: 'Bebidas frías' },
      { name: 'Limonada mineral', price: '40', category: 'Bebidas frías' },
    ],
    'Tacos y antojitos': [
      { name: 'Taco de barbacoa', price: '22', category: 'Tacos y antojitos' },
      { name: 'Quesadilla de huitlacoche', price: '45', category: 'Tacos y antojitos' },
    ],
    'Pizza y pasta': [
      { name: 'Pizza margarita', price: '160', category: 'Pizza y pasta' },
      { name: 'Espagueti a la bolognesa', price: '130', category: 'Pizza y pasta' },
    ],
    Hamburguesas: [
      { name: 'Hamburguesa clásica', price: '95', category: 'Hamburguesas' },
      { name: 'Hamburguesa con queso', price: '105', category: 'Hamburguesas' },
    ],
    Sushi: [
      { name: 'Rollo Filadelfia', price: '140', category: 'Sushi' },
      { name: 'Sashimi de salmón', price: '150', category: 'Sushi' },
    ],
    Mariscos: [
      { name: 'Camarones a la diabla', price: '170', category: 'Mariscos' },
      { name: 'Ceviche de pescado', price: '130', category: 'Mariscos' },
    ],
    Vegetariano: [
      { name: 'Hamburguesa de garbanzo', price: '100', category: 'Vegetariano' },
      { name: 'Ensalada de quinoa', price: '90', category: 'Vegetariano' },
    ],
    Vegano: [
      { name: 'Tacos de flor de calabaza', price: '70', category: 'Vegano' },
      { name: 'Bowl vegano', price: '110', category: 'Vegano' },
    ],
    Repostería: [
      { name: 'Tarta de queso', price: '65', category: 'Repostería' },
      { name: 'Brownie de chocolate', price: '55', category: 'Repostería' },
    ],
    Otro: [{ name: 'Plato de la casa', price: '90', category: 'Otro' }],
  };
  const seen = new Set<string>();
  const items: MenuItem[] = [];
  for (const category of categories) {
    for (const base of catalog[category] ?? []) {
      if (seen.has(base.name)) continue;
      seen.add(base.name);
      items.push({ ...base, id: crypto.randomUUID() });
    }
  }
  return items.slice(0, 10);
}

interface WizardState {
  logo: string | null;
  banner: string | null;
  name: string;
  categories: string[];
  menuImage: string | null;
  menuItems: MenuItem[];
  primaryColor: string | null;
  secondaryColor: string | null;
  logoColors: LogoColor | null;
}

interface LogoColor {
  primary: string;
  secondary: string;
  qrForeground: string;
  qrBackground: string;
}

const emptyState: WizardState = {
  logo: null,
  banner: null,
  name: '',
  categories: [],
  menuImage: null,
  menuItems: [],
  primaryColor: null,
  secondaryColor: null,
  logoColors: null,
};

interface TierDraft {
  id: string;
  points: number;
  benefit: string;
}

interface PromotionDraft {
  type: PromotionType | null;
  title: string;
  description: string;
  expires: string;
  image: string;
  purchasesRequired: number;
  freeProduct: string;
  freeQuantity: number;
  appliesAlways: boolean;
  weekdays: number[];
  startTime: string;
  endTime: string;
  tiers: TierDraft[];
}

const weekdayLabels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const emptyPromotion: PromotionDraft = {
  type: null,
  title: '',
  description: '',
  expires: '',
  image: '/images/coffee.webp',
  purchasesRequired: 5,
  freeProduct: '',
  freeQuantity: 1,
  appliesAlways: true,
  weekdays: [],
  startTime: '09:00',
  endTime: '18:00',
  tiers: [{ id: crypto.randomUUID(), points: 10, benefit: '' }],
};

export function BusinessOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState<StepId>('logo');
  const [state, setState] = useState<WizardState>(emptyState);
  const [promo, setPromo] = useState<PromotionDraft>(emptyPromotion);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [analyzing, setAnalyzing] = useState(false);

  const navigateToBusiness = useCallback(
    () => navigate('/business/negocio', { replace: true }),
    [navigate],
  );

  // Esta ruta es explícita: siempre muestra el asistente, también para rehacer el perfil.
  // La obligación de completarlo vive en la guarda de `/business/negocio` y en el aviso del
  // resumen. Al publicar, la invalidación de la caché cierra el asistente incrustado solo.
  const publish = usePublishBusiness(navigateToBusiness);
  const saving = publish.isPending;

  const isLastStep = step === 'done';
  const stepIndex = steps.findIndex((s) => s.id === step);

  const setField = (key: keyof WizardState, value: WizardState[keyof WizardState]) =>
    setState((s) => ({ ...s, [key]: value }));

  function goNext() {
    if (step === 'done') return;
    const validation = validateStep(step);
    if (validation) {
      setErrors(validation);
      return;
    }
    setErrors({});
    // Al pasar de categorías a menú se genera el borrador de platos una sola vez.
    if (step === 'categories' && !state.menuItems.length) {
      setState((s) => ({ ...s, menuItems: starterItems(s.categories) }));
    }
    setStep(steps[Math.min(stepIndex + 1, steps.length - 1)].id);
  }

  function goBack() {
    setErrors({});
    if (stepIndex <= 0) return;
    setStep(steps[stepIndex - 1].id);
  }

  /** Validación del paso actual antes de avanzar. */
  function validateStep(current: StepId): Record<string, string> | null {
    const errs: Record<string, string> = {};
    const { name, categories, logo, primaryColor, secondaryColor } = state;
    if (current === 'logo') {
      if (!logo) errs.logo = 'Sube el logo de tu negocio para continuar.';
    }
    if (current === 'name') {
      if (!name.trim()) errs.name = 'Escribe el nombre de tu negocio.';
      else if (name.trim().length < 2) errs.name = 'El nombre debe tener al menos 2 caracteres.';
    }
    if (current === 'categories') {
      if (!categories.length) errs.categories = 'Selecciona al menos una categoría de comida.';
    }
    if (current === 'colors') {
      if (!primaryColor) errs.primaryColor = 'Elige el color principal.';
      if (!secondaryColor) errs.secondaryColor = 'Elige el color secundario.';
    }
    if (current === 'promotion') {
      const p = promo;
      if (!p.type) errs.promotionType = 'Elige el tipo de promoción.';
      if (p.type === 'simple') {
        if (!p.purchasesRequired || p.purchasesRequired < 1)
          errs.purchasesRequired = 'Escribe el número de compras requeridas.';
        if (!p.freeProduct.trim()) errs.freeProduct = 'Escribe el producto gratis.';
      }
      if (p.type === 'steps') {
        if (!p.tiers.length) errs.tiers = 'Agrega al menos un nivel de puntos.';
        else {
          for (const tier of p.tiers) {
            if (!tier.points || tier.points < 1)
              errs[`tier-points-${tier.id}`] = 'Los puntos mínimos son obligatorios.';
            if (!tier.benefit.trim()) errs[`tier-benefit-${tier.id}`] = 'Describe el beneficio.';
          }
        }
      }
      if (p.type === 'direct' && !p.appliesAlways) {
        if (!p.weekdays.length) errs.weekdays = 'Selecciona al menos un día.';
        if (!p.startTime || !p.endTime) errs.times = 'Elige la hora de inicio y fin.';
        else if (p.startTime >= p.endTime)
          errs.times = 'La hora de fin debe ser posterior a la de inicio.';
      }
    }
    return Object.keys(errs).length ? errs : null;
  }

  const menuUrl = useMemo(
    () => `${window.location.origin}/menu/${slugify(state.name || 'negocio')}`,
    [state.name],
  );

  // Colores sugeridos a partir del logo cuando se sube.
  useEffect(() => {
    if (!state.logo || state.logoColors) return;
    let cancelled = false;
    (async () => {
      setAnalyzing(true);
      try {
        // El logo ya es un data URL: se analiza directo, sin convertirlo a File.
        const analysis = await extractPaletteFromFile(state.logo!);
        if (!cancelled) {
          setState((s) => ({
            ...s,
            primaryColor: analysis.primary,
            secondaryColor: analysis.secondary,
            logoColors: analysis,
          }));
        }
      } catch {
        /* Los colores sugeridos son opcionales; se usan los predeterminados. */
        setState((s) => ({
          ...s,
          primaryColor: '#2399A0',
          secondaryColor: '#F5BE8B',
        }));
      } finally {
        if (!cancelled) setAnalyzing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state.logo, state.logoColors]);

  const colors = useMemo(() => {
    const suggested = state.logoColors;
    return {
      primary: state.primaryColor ?? suggested?.primary ?? '#2399A0',
      secondary: state.secondaryColor ?? suggested?.secondary ?? '#F5BE8B',
    };
  }, [state.primaryColor, state.secondaryColor, state.logoColors]);

  // Al entrar al paso de colores se aplican los sugeridos (del logo) o los predeterminados,
  // y el dueño puede ajustarlos antes de publicar.
  useEffect(() => {
    if (step !== 'colors') return;
    if (!state.primaryColor || !state.secondaryColor) {
      setState((s) => ({ ...s, primaryColor: colors.primary, secondaryColor: colors.secondary }));
    }
  }, [step, state.primaryColor, state.secondaryColor, colors]);

  async function handleSave() {
    // Se revisan todos los pasos obligatorios: el dueño puede volver a uno
    // anterior, borrar un dato e intentar publicar de nuevo.
    for (const required of REQUIRED_STEPS) {
      const validation = validateStep(required);
      if (validation) {
        setErrors(validation);
        setStep(required);
        return;
      }
    }
    setErrors({});
    const config: BusinessConfig = {
      name: state.name.trim(),
      reward: 'Un producto gratis al completar tu tarjeta',
      goal: 8,
      theme: 'forest',
      icon: 'coffee',
      logo: state.logo ?? undefined,
      banner: state.banner ?? undefined,
      categories: state.categories,
      menuImage: state.menuImage ?? undefined,
      menuItems: state.menuItems,
      primaryColor: colors.primary,
      secondaryColor: colors.secondary,
      onboarded: true,
    };

    const promotionInput: PromotionInput = {
      title: promo.title.trim() || 'Promoción de bienvenida',
      description: promo.description.trim() || 'Consulta condiciones en el negocio.',
      expires: promo.expires || '',
      image: promo.image,
      type: promo.type ?? undefined,
      purchasesRequired: promo.type === 'simple' ? promo.purchasesRequired : undefined,
      freeProduct: promo.type === 'simple' ? promo.freeProduct || undefined : undefined,
      freeQuantity: promo.type === 'simple' ? promo.freeQuantity : undefined,
      tiers:
        promo.type === 'steps'
          ? promo.tiers
              .filter((t) => t.benefit.trim() && t.points >= 1)
              .map((t) => ({ points: t.points, benefit: t.benefit.trim() }))
          : undefined,
      appliesAlways: promo.type === 'direct' ? promo.appliesAlways : undefined,
      weekdays: promo.type === 'direct' && !promo.appliesAlways ? promo.weekdays : undefined,
      startTime: promo.type === 'direct' && !promo.appliesAlways ? promo.startTime : undefined,
      endTime: promo.type === 'direct' && !promo.appliesAlways ? promo.endTime : undefined,
    };
    // La mutación guarda el perfil, crea la promoción, invalida la caché
    // (la guarda de /business/negocio deja de mostrar el asistente), avisa y redirige.
    try {
      await publish.mutateAsync({ config, promotion: promotionInput });
    } catch {
      /* `usePublishBusiness` ya mostró el error. */
    }
  }

  return (
    <div className="onboarding-page">
      <div className="page-intro">
        <div>
          <div className="eyebrow">
            <Palette size={14} /> CONFIGURA TU NEGOCIO {isDemo && '· DEMO'}
          </div>
          <h1>Unos pasos y listo</h1>
          <p>
            Cargamos tu logo, menú y colores. Al terminar tendrás tu tarjeta, tu menú digital y el
            QR para que tus clientes lo vean.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/business', { replace: true })}>
          <X size={17} /> Más tarde
        </Button>
      </div>

      <div className="onboarding-wrapper">
        <nav className="onboarding-steps" aria-label="Progreso de configuración">
          {steps.map((s, index) => {
            const completed = index < stepIndex;
            const active = s.id === step;
            return (
              <button
                key={s.id}
                type="button"
                disabled={index > stepIndex && !completed}
                onClick={() => {
                  if (index <= stepIndex) setStep(s.id);
                }}
                className={cn('onboarding-step', completed && 'completed', active && 'active')}
              >
                <span className="step-badge">
                  {completed ? <CheckCircle2 size={15} /> : index + 1}
                </span>
                <span className="step-label">{s.label}</span>
              </button>
            );
          })}
        </nav>

        <main className="onboarding-content">
          {step === 'logo' && (
            <LogoStep
              logo={state.logo}
              analyzing={analyzing}
              colors={colors}
              onChange={setField}
              errors={errors}
            />
          )}
          {step === 'banner' && <BannerStep banner={state.banner} onChange={setField} />}
          {step === 'name' && (
            <NameStep
              value={state.name}
              onChange={(e) => setField('name', e.target.value)}
              errors={errors}
            />
          )}
          {step === 'categories' && (
            <CategoriesStep
              categories={state.categories}
              onChange={setField}
              all={foodCategories}
              errors={errors}
            />
          )}
          {step === 'menu' && (
            <MenuStep
              image={state.menuImage}
              items={state.menuItems}
              onChangeImage={setField}
              onChangeItems={setField}
            />
          )}
          {step === 'colors' && (
            <ColorsStep
              logo={state.logo}
              businessName={state.name}
              menuUrl={menuUrl}
              colors={colors}
              onChange={(key, value) => setState((s) => ({ ...s, [key]: value }))}
              errors={errors}
            />
          )}
          {step === 'promotion' && (
            <PromotionStep draft={promo} onChange={setPromo} errors={errors} />
          )}
          {step === 'done' && (
            <DoneStep business={{ name: state.name, categories: state.categories }} />
          )}
        </main>

        <footer className="onboarding-footer">
          {!isLastStep && (
            <>
              {stepIndex > 0 && (
                <Button variant="ghost" onClick={goBack}>
                  <ArrowRight size={16} rotate={180} /> Regresar
                </Button>
              )}
              <Button className="ml-auto" disabled={saving} onClick={goNext}>
                {saving ? 'Guardando…' : step === 'promotion' ? 'Guardar y publicar' : 'Siguiente'}
                <ArrowRight size={17} />
              </Button>
            </>
          )}
          {isLastStep && (
            <Button className="full-width" disabled={saving} onClick={handleSave}>
              <Save size={17} />
              {saving ? 'Publicando…' : 'Publicar mi negocio'}
            </Button>
          )}
        </footer>
      </div>
    </div>
  );
}

/* ---------------- pasos ---------------- */

interface LogoStepProps {
  logo: string | null;
  analyzing: boolean;
  colors: { primary: string; secondary: string };
  onChange: (key: keyof WizardState, value: WizardState[keyof WizardState]) => void;
  errors: Record<string, string>;
}
function LogoStep({ logo, analyzing, colors, onChange, errors }: LogoStepProps) {
  return (
    <section className="wizard-step">
      <div className="step-eyebrow">Paso 1 de 7</div>
      <h2>Sube tu logo</h2>
      <p className="muted">
        Tu logo va en la tarjeta del negocio y definimos a partir de él los colores del menú y el
        QR.
      </p>
      <label className="upload-label">
        <ImagePlus size={18} />
        <span>
          {logo ? 'Cambiar logo' : 'Subir logo del negocio'}
          <small>PNG, JPG o WebP · hasta 2 MB</small>
        </span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              const dataUrl = await readImage(file);
              onChange('logo', dataUrl);
            } catch (err) {
              toast.error((err as Error).message);
            }
            e.target.value = '';
          }}
          disabled={analyzing}
        />
      </label>
      {errors.logo && <span className="form-error">{errors.logo}</span>}
      {logo && (
        <div className="logo-analysis">
          <img src={logo} alt="Logo del negocio" className="logo-preview-img" />
          <div className="color-swatches">
            <span className="swatch-label">Color principal</span>
            <button
              className="swatch"
              style={{ backgroundColor: colors.primary }}
              onClick={() => onChange('primaryColor', colors.primary)}
              aria-label={`Color principal ${colors.primary}`}
            />
            <span className="swatch-label">Color secundario</span>
            <button
              className="swatch"
              style={{ backgroundColor: colors.secondary }}
              onClick={() => onChange('secondaryColor', colors.secondary)}
              aria-label={`Color secundario ${colors.secondary}`}
            />
          </div>
          <p className="muted">
            Los colores se extraen automáticamente del logo. Puedes ajustarlos en el paso de colores
            antes de publicar.
          </p>
        </div>
      )}
      {!logo && (
        <p className="notice">
          El logo es obligatorio: lo usamos para tu tarjeta, tu menú digital y tu QR.
        </p>
      )}
    </section>
  );
}

interface BannerStepProps {
  banner: string | null;
  onChange: (key: keyof WizardState, value: WizardState[keyof WizardState]) => void;
}
function BannerStep({ banner, onChange }: BannerStepProps) {
  return (
    <section className="wizard-step">
      <div className="step-eyebrow">Paso 2 de 7</div>
      <h2>Banner del negocio</h2>
      <p className="muted">
        Imagen de portada que se muestra en tu menú digital y en la tarjeta del negocio.
      </p>
      <label className="upload-label">
        <ImagePlus size={18} />
        <span>
          {banner ? 'Cambiar banner' : 'Subir banner'}
          <small>PNG, JPG o WebP · hasta 2 MB</small>
        </span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              onChange('banner', await readImage(file));
            } catch (err) {
              toast.error((err as Error).message);
            }
            e.target.value = '';
          }}
        />
      </label>
      {banner && <img src={banner} alt="Banner del negocio" className="banner-preview" />}
    </section>
  );
}

interface NameStepProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  errors: Record<string, string>;
}
function NameStep({ value, onChange, errors }: NameStepProps) {
  return (
    <section className="wizard-step">
      <div className="step-eyebrow">Paso 3 de 7</div>
      <h2>Nombre del negocio</h2>
      <p className="muted">Así aparecerá en tu tarjeta, menú digital y promociones.</p>
      <input
        autoComplete="off"
        className="text-input"
        placeholder="Ej. Café Avellaneda"
        value={value}
        onChange={onChange}
        maxLength={80}
      />
      {errors.name && <span className="form-error">{errors.name}</span>}
    </section>
  );
}

interface CategoriesStepProps {
  categories: string[];
  onChange: (key: keyof WizardState, value: WizardState[keyof WizardState]) => void;
  all: readonly string[];
  errors: Record<string, string>;
}
function CategoriesStep({ categories, onChange, all, errors }: CategoriesStepProps) {
  const toggle = (category: string) =>
    onChange(
      'categories',
      categories.includes(category)
        ? categories.filter((c) => c !== category)
        : [...categories, category],
    );
  return (
    <section className="wizard-step">
      <div className="step-eyebrow">Paso 4 de 7</div>
      <h2>¿Qué comida vende?</h2>
      <p className="muted">
        Selecciona todas las categorías que apliquen. Ayudan a crear el borrador de tu menú.
      </p>
      <div className="category-chips">
        {all.map((category) => (
          <button
            key={category}
            type="button"
            aria-pressed={categories.includes(category)}
            className={cn('category-chip', categories.includes(category) && 'active')}
            onClick={() => toggle(category)}
          >
            {category}
          </button>
        ))}
      </div>
      {errors.categories && <span className="form-error">{errors.categories}</span>}
    </section>
  );
}

interface MenuStepProps {
  image: string | null;
  items: MenuItem[];
  onChangeImage: (key: 'menuImage', value: string | null) => void;
  onChangeItems: (key: 'menuItems', value: MenuItem[]) => void;
}
function MenuStep({ image, items, onChangeImage, onChangeItems }: MenuStepProps) {
  // El borrador de platos lo genera el asistente al entrar a este paso.
  return (
    <section className="wizard-step">
      <div className="step-eyebrow">Paso 5 de 7</div>
      <h2>Tu menú</h2>
      <p className="muted">
        Sube una foto de tu menú impreso y lo analizamos para crear el borrador. Luego revisa y
        edita los platos antes de publicarlos.
      </p>
      <label className="upload-label">
        <ImagePlus size={18} />
        <span>
          {image ? 'Cambiar imagen del menú' : 'Subir imagen del menú'}
          <small>PNG, JPG o WebP · hasta 2 MB</small>
        </span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              onChangeImage('menuImage', await readImage(file));
            } catch (err) {
              toast.error((err as Error).message);
            }
            e.target.value = '';
          }}
        />
      </label>
      {image && (
        <div className="menu-analysis">
          <img src={image} alt="Menú del negocio" className="menu-preview-img" />
          <p className="muted">
            Imagen cargada: analizamos colores y estructura. Revisa los platos que se incluyen en tu
            menú digital.
          </p>
        </div>
      )}
      <div className="menu-items">
        {items.map((item) => (
          <article key={item.id} className="menu-item-row">
            <input
              className="menu-item-name"
              value={item.name}
              onChange={(e) =>
                onChangeItems(
                  'menuItems',
                  items.map((i) => (i.id === item.id ? { ...i, name: e.target.value } : i)),
                )
              }
              placeholder="Nombre del plato"
            />
            <input
              className="menu-item-price"
              type="text"
              value={item.price ?? ''}
              onChange={(e) =>
                onChangeItems(
                  'menuItems',
                  items.map((i) =>
                    i.id === item.id ? { ...i, price: e.target.value || undefined } : i,
                  ),
                )
              }
              placeholder="$00"
            />
            <input
              className="menu-item-description"
              value={item.description ?? ''}
              onChange={(e) =>
                onChangeItems(
                  'menuItems',
                  items.map((i) =>
                    i.id === item.id ? { ...i, description: e.target.value || undefined } : i,
                  ),
                )
              }
              placeholder="Descripción"
            />
            <button
              type="button"
              className="icon-button"
              aria-label="Quitar plato"
              onClick={() =>
                onChangeItems(
                  'menuItems',
                  items.filter((i) => i.id !== item.id),
                )
              }
            >
              <Trash2 size={16} />
            </button>
          </article>
        ))}
        {items.length === 0 && (
          <p className="notice">Aún no hay platos. Agrega los platos de tu menú arriba.</p>
        )}
        <button
          type="button"
          className="add-item"
          onClick={() =>
            onChangeItems('menuItems', [
              ...items,
              {
                id: crypto.randomUUID(),
                name: '',
                price: undefined,
                description: undefined,
                category: undefined,
              },
            ])
          }
        >
          <span>+</span> Agregar plato
        </button>
      </div>
    </section>
  );
}

interface ColorsStepProps {
  logo: string | null;
  businessName: string;
  menuUrl: string;
  colors: { primary: string; secondary: string };
  onChange: (key: 'primaryColor' | 'secondaryColor', value: string) => void;
  errors: Record<string, string>;
}
function ColorsStep({ logo, businessName, menuUrl, colors, onChange, errors }: ColorsStepProps) {
  const pick = (color: string, key: 'primaryColor' | 'secondaryColor') => {
    onChange(key, color);
  };
  return (
    <section className="wizard-step">
      <div className="step-eyebrow">Paso 6 de 7</div>
      <h2>Colores del menú y el QR</h2>
      <p className="muted">
        Elegidos a partir de tu logo. Se aplican al menú digital y al QR que verán tus clientes.
      </p>
      <div className="color-pickers">
        <div className="color-field">
          <label>Color principal</label>
          <input
            type="color"
            value={colors.primary}
            onChange={(e) => pick(e.target.value, 'primaryColor')}
          />
          <input
            className="color-hex"
            value={colors.primary}
            onChange={(e) => pick(e.target.value, 'primaryColor')}
          />
          {errors.primaryColor && <span className="form-error">{errors.primaryColor}</span>}
        </div>
        <div className="color-field">
          <label>Color secundario</label>
          <input
            type="color"
            value={colors.secondary}
            onChange={(e) => pick(e.target.value, 'secondaryColor')}
          />
          <input
            className="color-hex"
            value={colors.secondary}
            onChange={(e) => pick(e.target.value, 'secondaryColor')}
          />
          {errors.secondaryColor && <span className="form-error">{errors.secondaryColor}</span>}
        </div>
      </div>
      <div className="color-preview">
        <div className="preview-card">
          <div className="preview-header" style={{ backgroundColor: colors.primary }}>
            {logo && <img src={logo} alt="" className="preview-logo" />}
            <div className="preview-name">{businessName || 'Nombre de tu negocio'}</div>
            <div className="preview-category">Menú digital</div>
          </div>
          <div className="preview-body">
            <div className="preview-item">
              <span>Plato recomendado</span>
              <span>$90</span>
            </div>
          </div>
        </div>
        <div className="preview-qr">
          <QRCodeSVG
            value={menuUrl}
            size={180}
            level="M"
            marginSize={2}
            fgColor={colors.primary}
            bgColor={colors.secondary}
          />
          <p className="muted">Tu QR con los colores del negocio</p>
        </div>
      </div>
    </section>
  );
}

interface PromotionStepProps {
  draft: PromotionDraft;
  onChange: (draft: PromotionDraft) => void;
  errors: Record<string, string>;
}
function PromotionStep({ draft, onChange, errors }: PromotionStepProps) {
  const setField = (key: keyof PromotionDraft, value: PromotionDraft[keyof PromotionDraft]) =>
    onChange({ ...draft, [key]: value });
  const weekdayPressed = (d: number) => draft.weekdays.includes(d);
  return (
    <section className="wizard-step">
      <div className="step-eyebrow">Paso 7 de 7</div>
      <h2>Tu promoción de bienvenida</h2>
      <p className="muted">
        Elige cómo quieres premiar a tus clientes. Esta promoción aparecerá en Explorar.
      </p>
      <div className="field">
        <label>Tipo de promoción</label>
        <div className="promotion-types">
          {[
            { id: 'simple', label: 'Sencilla', hint: 'X compras = producto gratis' },
            { id: 'steps', label: 'Por pasos', hint: 'Beneficios por puntos acumulados' },
            {
              id: 'direct',
              label: 'Directa',
              hint: 'Siempre activa o en días y horas',
            },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={draft.type === t.id}
              className={cn('promotion-type', draft.type === t.id && 'active')}
              onClick={() => setField('type', t.id)}
            >
              <strong>{t.label}</strong>
              <span>{t.hint}</span>
            </button>
          ))}
        </div>
        {errors.promotionType && <span className="form-error">{errors.promotionType}</span>}
      </div>

      <div className="field">
        <label>
          Título
          <input
            className="text-input"
            placeholder="Ej. Jueves 2×1 en hot-dogs"
            value={draft.title}
            onChange={(e) => setField('title', e.target.value)}
          />
        </label>
      </div>
      <div className="field">
        <label>
          Descripción y condiciones
          <textarea
            rows={3}
            className="text-input"
            placeholder="¿Qué incluye y en qué horario aplica?"
            value={draft.description}
            onChange={(e) => setField('description', e.target.value)}
          />
        </label>
      </div>
      <div className="field">
        <label>
          Válida hasta
          <input
            type="date"
            className="text-input"
            value={draft.expires}
            onChange={(e) => setField('expires', e.target.value)}
          />
        </label>
      </div>
      <div className="field">
        <label className="image-upload">
          <ImagePlus size={16} />
          Imagen de la promoción (opcional)
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            style={{ display: 'none' }}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                setField('image', await readImage(file));
              } catch (err) {
                toast.error((err as Error).message);
              }
            }}
          />
        </label>
        <p className="muted">Sin imagen se usa una ilustración de café.</p>
      </div>

      {draft.type === 'simple' && (
        <>
          <div className="field">
            <label>
              Después de cuántas compras se gana
              <input
                type="number"
                min="1"
                className="text-input"
                value={draft.purchasesRequired}
                onChange={(e) =>
                  setField('purchasesRequired', Math.max(0, Number(e.target.value) || 0))
                }
              />
            </label>
          </div>
          <div className="field">
            <label>
              Producto gratis
              <input
                className="text-input"
                placeholder="Ej. 1 café americano"
                value={draft.freeProduct}
                onChange={(e) => setField('freeProduct', e.target.value)}
              />
            </label>
            <div className="field">
              <label>
                Cantidad
                <input
                  type="number"
                  min="1"
                  className="text-input"
                  value={draft.freeQuantity}
                  onChange={(e) =>
                    setField('freeQuantity', Math.max(1, Number(e.target.value) || 1))
                  }
                />
              </label>
            </div>
          </div>
          {errors.purchasesRequired && (
            <span className="form-error">{errors.purchasesRequired}</span>
          )}
          {errors.freeProduct && <span className="form-error">{errors.freeProduct}</span>}
        </>
      )}
      {draft.type === 'steps' && (
        <>
          <p className="muted">Beneficios por metas de puntos:</p>
          {draft.tiers.map((tier) => {
            const tierError = errors[`tier-points-${tier.id}`] ?? errors[`tier-benefit-${tier.id}`];
            return (
              <div key={tier.id} className="tier-block">
                <div className="tier-row">
                  <input
                    type="number"
                    min="1"
                    className="text-input sm"
                    placeholder="Puntos"
                    aria-label="Puntos mínimos"
                    value={tier.points}
                    onChange={(e) =>
                      setField(
                        'tiers',
                        draft.tiers.map((t) =>
                          t.id === tier.id
                            ? { ...t, points: Math.max(0, Number(e.target.value) || 0) }
                            : t,
                        ),
                      )
                    }
                  />
                  <input
                    className="text-input"
                    placeholder="Beneficio"
                    aria-label="Beneficio al alcanzar los puntos"
                    value={tier.benefit}
                    onChange={(e) =>
                      setField(
                        'tiers',
                        draft.tiers.map((t) =>
                          t.id === tier.id ? { ...t, benefit: e.target.value } : t,
                        ),
                      )
                    }
                  />
                  <button
                    type="button"
                    className="icon-button remove-tier"
                    aria-label="Quitar nivel"
                    onClick={() =>
                      setField(
                        'tiers',
                        draft.tiers.filter((t) => t.id !== tier.id),
                      )
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                {tierError && <span className="form-error">{tierError}</span>}
              </div>
            );
          })}
          <button
            type="button"
            className="add-item"
            onClick={() =>
              setField('tiers', [
                ...draft.tiers,
                { id: crypto.randomUUID(), points: 0, benefit: '' },
              ])
            }
          >
            + Agregar nivel
          </button>
          {errors.tiers && <span className="form-error">{errors.tiers}</span>}
        </>
      )}
      {draft.type === 'direct' && (
        <>
          <div className="field">
            <label className="form-check" htmlFor="direct-applies-always">
              <input
                id="direct-applies-always"
                type="checkbox"
                checked={draft.appliesAlways}
                onChange={(e) => setField('appliesAlways', e.target.checked)}
              />
              <span aria-hidden="true" />
              Siempre activa
            </label>
          </div>
          {!draft.appliesAlways && (
            <>
              <div className="field">
                <label>Días de la semana</label>
                <div className="weekdays">
                  {weekdayLabels.map((label, index) => (
                    <button
                      key={label}
                      type="button"
                      aria-pressed={weekdayPressed(index)}
                      className={cn('weekday-chip', weekdayPressed(index) && 'active')}
                      onClick={() => {
                        const next = weekdayPressed(index)
                          ? draft.weekdays.filter((d) => d !== index)
                          : [...draft.weekdays, index];
                        setField('weekdays', next);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {errors.weekdays && <span className="form-error">{errors.weekdays}</span>}
              </div>
              <div className="form-columns">
                <div className="field">
                  <label>
                    Hora de inicio
                    <input
                      type="time"
                      className="text-input"
                      value={draft.startTime}
                      onChange={(e) => setField('startTime', e.target.value)}
                    />
                  </label>
                </div>
                <div className="field">
                  <label>
                    Hora de fin
                    <input
                      type="time"
                      className="text-input"
                      value={draft.endTime}
                      onChange={(e) => setField('endTime', e.target.value)}
                    />
                  </label>
                </div>
              </div>
              {errors.times && <span className="form-error">{errors.times}</span>}
            </>
          )}
        </>
      )}
    </section>
  );
}

function DoneStep({ business }: { business: { name: string; categories: string[] } }) {
  return (
    <section className="wizard-step done-step">
      <div className="step-eyebrow">Paso 8 de 8</div>
      <h2>Resumen antes de publicar</h2>
      <div className="done-summary">
        <div className="done-item">
          <span className="done-key">Negocio</span>
          <span className="done-value">{business.name}</span>
        </div>
        <div className="done-item">
          <span className="done-key">Categorías</span>
          <span className="done-value">{business.categories.join(', ') || '—'}</span>
        </div>
      </div>
      <p className="notice">
        Al publicar, tu tarjeta, menú digital y QR quedarán disponibles para tus clientes. La
        promoción aparecerá en Explorar para toda la comunidad.
      </p>
    </section>
  );
}
