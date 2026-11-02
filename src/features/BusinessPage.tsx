import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowUpRight,
  Check,
  Gift,
  ImagePlus,
  Megaphone,
  Palette,
  Plus,
  QrCode,
  Save,
  ScanLine,
  Store,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  businessSchema,
  type BusinessConfig,
  type LoyaltyCard as Card,
  type Promotion,
} from '../lib/types';
import { isDemo } from '../lib/utils';
import {
  useAddPromotion,
  useBusiness,
  useBusinessPromotions,
  useSaveBusiness,
  useStamp,
} from '../lib/queries';
import { readImage } from '../lib/image';
import type { BusinessPromotionInput } from '../services/api';
import {
  brandIconOptions,
  brandThemeOptions,
  fontOptions,
  fontStack,
  BrandIcon,
  LoyaltyCard,
} from '../components/LoyaltyCard';
import { Button } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';
import { Scanner } from '../components/Scanner';
import { QueryState } from './CustomerPages';
import { BusinessQRSettings } from '../components/BusinessQRSettings';
const businessEditorSchema = businessSchema.extend({
  name: z.string().min(2, 'Escribe al menos 2 caracteres'),
});
const promotionFormSchema = z
  .object({
    title: z.string().trim().min(3, 'Escribe al menos 3 caracteres').max(150),
    description: z.string().trim().max(2000).optional(),
    loyaltyCardId: z.string().optional(),
    discountType: z.enum(['percentage', 'fixed', 'gift', 'points']),
    discountValue: z.preprocess(
      (value) => (value === '' || value === null ? undefined : value),
      z.coerce.number().optional(),
    ),
    code: z.string().trim().max(100).optional(),
    terms: z.string().trim().max(2000).optional(),
    startsAt: z.string().optional(),
    endsAt: z.string().optional(),
    maxRedemptions: z.preprocess(
      (value) => (value === '' || value === null ? undefined : value),
      z.coerce.number().int().positive().optional(),
    ),
    isActive: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.discountType !== 'gift' && (!value.discountValue || value.discountValue <= 0))
      ctx.addIssue({
        code: 'custom',
        path: ['discountValue'],
        message: 'Escribe un valor de beneficio mayor a cero.',
      });
    if (value.startsAt && value.endsAt && value.startsAt >= value.endsAt)
      ctx.addIssue({
        code: 'custom',
        path: ['endsAt'],
        message: 'La fecha de fin debe ser posterior al inicio.',
      });
  });
type PromotionForm = z.infer<typeof promotionFormSchema>;

function toApiDateTime(value?: string) {
  return value ? new Date(value).toISOString() : undefined;
}

function promotionPayload(value: PromotionForm): BusinessPromotionInput {
  return {
    title: value.title,
    description: value.description || undefined,
    loyaltyCardId: value.loyaltyCardId || undefined,
    discountType: value.discountType,
    discountValue: value.discountType === 'gift' ? undefined : value.discountValue,
    code: value.code || undefined,
    terms: value.terms || undefined,
    startsAt: toApiDateTime(value.startsAt),
    endsAt: toApiDateTime(value.endsAt),
    maxRedemptions: value.maxRedemptions || undefined,
    isActive: value.isActive,
  };
}
function BusinessEditor({ config }: { config: BusinessConfig }) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<BusinessConfig>({
    resolver: zodResolver(businessEditorSchema),
    defaultValues: config,
  });
  const values = watch();
  const mutation = useSaveBusiness();
  const [preview, setPreview] = useState(false);
  const card: Card = {
    ...values,
    goal: Math.min(12, Math.max(2, Number(values.goal) || 2)),
    id: 'preview',
    businessId: 'b1',
    category: 'Cafetería',
    primaryColor: values.cardPrimaryColor,
    secondaryColor: values.cardSecondaryColor,
    textColor: values.cardTextColor,
    cardShape: values.cardShape,
    tagline: '',
    location: 'Ciudad de México',
    distance: '',
    stamps: 3,
    joined: true,
  };
  return (
    <div className="business-editor">
      <form
        className="form-panel"
        onSubmit={handleSubmit((v) => mutation.mutate(v, { onSuccess: () => reset(v) }))}
      >
        <div className="panel-heading">
          <Palette size={19} />
          <h2>Dale tu personalidad</h2>
        </div>
        <p className="muted">Una tarjeta tan única como tu negocio.</p>
        <label>
          Nombre del negocio
          <input {...register('name')} placeholder="Nombre de tu negocio" />
          {errors.name && <span className="form-error">{errors.name.message}</span>}
        </label>
        <label>
          La recompensa
          <input {...register('reward')} placeholder="Un café de especialidad gratis" />
          {errors.reward && <span className="form-error">{errors.reward.message}</span>}
        </label>
        <label>
          Sellos para obtenerla
          <input type="number" min="2" max="12" {...register('goal')} />
          {errors.goal && <span className="form-error">{errors.goal.message}</span>}
        </label>
        <fieldset className="business-style-picker">
          <legend>Paleta de color</legend>
          <p>Elige el ambiente que mejor representa tu negocio.</p>
          <div className="business-theme-grid">
            {brandThemeOptions.map((theme) => (
              <button
                type="button"
                key={theme.id}
                aria-pressed={values.theme === theme.id}
                className={`business-theme-option ${values.theme === theme.id ? 'selected' : ''}`}
                onClick={() => {
                  setValue('theme', theme.id, { shouldDirty: true });
                  setValue('cardPrimaryColor', theme.primaryColor, { shouldDirty: true });
                  setValue('cardSecondaryColor', theme.secondaryColor, { shouldDirty: true });
                  setValue('cardTextColor', theme.textColor, { shouldDirty: true });
                }}
              >
                <span className="business-theme-swatch" style={{ background: theme.swatch }} />
                <span>{theme.label}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="business-style-picker">
          <legend>Forma de la tarjeta</legend>
          <div className="business-theme-grid">
            {(
              [
                ['rounded', 'Redondeada'],
                ['square', 'Cuadrada'],
                ['circle', 'Muy redondeada'],
              ] as const
            ).map(([shape, label]) => (
              <button
                type="button"
                key={shape}
                aria-pressed={(values.cardShape ?? 'rounded') === shape}
                className={`business-theme-option ${(values.cardShape ?? 'rounded') === shape ? 'selected' : ''}`}
                onClick={() => setValue('cardShape', shape, { shouldDirty: true })}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 26,
                    height: 18,
                    border: '1px solid currentColor',
                    borderRadius: shape === 'rounded' ? 6 : shape === 'square' ? 2 : 12,
                  }}
                />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="business-style-picker">
          <legend>Icono de tu sello</legend>
          <p>23 símbolos inspirados en comida, bebidas y recompensas.</p>
          <div className="business-icon-grid">
            {brandIconOptions.map((option) => (
              <button
                type="button"
                key={option.id}
                aria-label={option.label}
                aria-pressed={values.icon === option.id}
                className={`business-icon-option ${values.icon === option.id ? 'selected' : ''}`}
                onClick={() => setValue('icon', option.id, { shouldDirty: true })}
              >
                <BrandIcon icon={option.id} size={21} />
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="business-style-picker">
          <legend>Tipografía</legend>
          <p>Elige el estilo de letra para tu tarjeta y menú.</p>
          <div className="business-font-grid">
            {fontOptions.map((font) => (
              <button
                type="button"
                key={font.id}
                aria-pressed={(values.fontFamily ?? 'dm-sans') === font.id}
                className={`business-font-option ${
                  (values.fontFamily ?? 'dm-sans') === font.id ? 'selected' : ''
                }`}
                style={{ fontFamily: fontStack(font.id) }}
                onClick={() => setValue('fontFamily', font.id, { shouldDirty: true })}
              >
                <strong>{font.label}</strong>
                <span>{font.sample}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <label className="upload-label">
          <ImagePlus size={18} />
          <span>
            {values.logo ? 'Cambiar logo' : 'Subir logo del negocio'}
            <small>PNG, JPG o WebP · hasta 2 MB</small>
          </span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                setValue('logo', await readImage(file), { shouldDirty: true });
              } catch (err) {
                toast.error((err as Error).message);
              }
              e.target.value = '';
            }}
          />
        </label>
        {values.logo && (
          <div className="logo-preview">
            <img src={values.logo} alt="Logo del negocio" />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setValue('logo', '', { shouldDirty: true })}
            >
              Quitar
            </Button>
          </div>
        )}
        <label className="upload-label">
          <ImagePlus size={18} />
          <span>
            {values.banner ? 'Cambiar portada del menú' : 'Subir portada del menú'}
            <small>Imagen horizontal · JPG, PNG o WebP · hasta 2 MB</small>
          </span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              try {
                setValue('banner', await readImage(file), { shouldDirty: true });
              } catch (error) {
                toast.error((error as Error).message);
              }
              event.target.value = '';
            }}
          />
        </label>
        {values.banner && (
          <div className="business-banner-preview">
            <img src={values.banner} alt="Vista previa de la portada del menú" />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setValue('banner', '', { shouldDirty: true })}
            >
              Quitar portada
            </Button>
          </div>
        )}
        <Button className="full-width" disabled={mutation.isPending || !isDirty} type="submit">
          <Save size={17} />
          {mutation.isPending ? 'Guardando…' : 'Guardar configuración'}
        </Button>
      </form>
      <div className="card-preview-panel">
        <span className="little-label">ASÍ LA VERÁN TUS CLIENTES</span>
        {values.logo && <img className="preview-logo" src={values.logo} alt="Logo de tu negocio" />}
        <LoyaltyCard card={card} onClick={() => setPreview(true)} />
        <p>
          <Check size={15} /> Los cambios se guardan cuando tú decidas.
        </p>
        <div className="business-tip">
          <Gift size={22} />
          <h3>Un motivo para volver</h3>
          <p>
            Una recompensa sencilla y especial puede convertir una primera visita en una bonita
            costumbre.
          </p>
        </div>
      </div>
      <Dialog
        open={preview}
        onOpenChange={setPreview}
        title="Vista previa de tu tarjeta"
        description="Esta es una simulación visual. No modifica los sellos de tus clientes."
      >
        <LoyaltyCard card={card} onClick={() => setPreview(false)} />
      </Dialog>
    </div>
  );
}
export function BusinessPage() {
  const business = useBusiness();
  const [tab, setTab] = useState('card');
  const [scanOpen, setScanOpen] = useState(false);
  const [scanned, setScanned] = useState<string | null>(null);
  const [promotionOpen, setPromotionOpen] = useState(false);
  const promotions = useBusinessPromotions();
  const stamp = useStamp(() => {
    setScanned(null);
    setScanOpen(false);
  });
  const promotion = useAddPromotion(() => {
    setPromotionOpen(false);
    form.reset();
  });
  const form = useForm<PromotionForm>({
    resolver: zodResolver(promotionFormSchema),
    defaultValues: {
      title: '',
      description: '',
      loyaltyCardId: '',
      discountType: 'gift',
      discountValue: undefined,
      code: '',
      terms: '',
      startsAt: '',
      endsAt: '',
      maxRedemptions: undefined,
      isActive: true,
    },
  });
  const discountType = form.watch('discountType');

  function promotionLabel(p: Promotion): string {
    if (p.discountTypeLabel) return p.discountTypeLabel;
    if (p.discountType === 'percentage') return `${p.discountValue ?? 0}% de descuento`;
    if (p.discountType === 'fixed') return `$${p.discountValue ?? 0} de descuento`;
    if (p.discountType === 'gift') return 'Regalo';
    if (p.discountType === 'points') return 'Beneficio por puntos';
    if (p.type === 'simple')
      return `Cada ${p.purchasesRequired} compras: ${p.freeProduct || 'regalo'}`;
    if (p.type === 'steps') return `Por pasos · ${p.tiers?.length ?? 0} niveles`;
    if (p.type === 'direct') return 'Promoción directa';
    return p.description || 'Promoción';
  }
  const onScan = useCallback((token: string) => {
    setScanned(token);
  }, []);
  return (
    <>
      <div className="page-intro">
        <div>
          <div className="eyebrow">
            <Store size={14} /> ESPACIO DE NEGOCIO {isDemo && '· DEMO'}
          </div>
          <h1>
            Haz que <span>quieran volver.</span>
          </h1>
          <p>Tu comunidad empieza con una buena experiencia.</p>
        </div>
        <Button
          onClick={() => {
            setScanned(null);
            setScanOpen(true);
          }}
        >
          <ScanLine size={18} /> Registrar una compra
        </Button>
      </div>
      <div className="filter-tabs activity-tabs">
        <button className={tab === 'card' ? 'active' : ''} onClick={() => setTab('card')}>
          <Palette size={16} /> Mi tarjeta
        </button>
        <button
          className={tab === 'promotions' ? 'active' : ''}
          onClick={() => setTab('promotions')}
        >
          <Megaphone size={16} /> Promociones
        </button>
        <button className={tab === 'qr' ? 'active' : ''} onClick={() => setTab('qr')}>
          <QrCode size={16} /> Código QR
        </button>
      </div>
      {tab === 'card' ? (
        <>
          <QueryState
            loading={business.isPending}
            error={business.isError}
            retry={() => void business.refetch()}
          />
          {business.data && !business.data.onboarded ? (
            <section className="business-menu-onboarding-prompt">
              <span className="stat-icon green">
                <Store size={20} />
              </span>
              <h2>Completa la configuración de tu negocio</h2>
              <p>
                Agrega la información, categorías, productos y horarios para publicar tu menú
                digital.
              </p>
              <Button asChild>
                <Link to="/business/mi-menu">
                  Abrir Mi menú <ArrowUpRight size={15} />
                </Link>
              </Button>
            </section>
          ) : (
            business.data && <BusinessEditor config={business.data} />
          )}
        </>
      ) : tab === 'qr' ? (
        <>
          <QueryState
            loading={business.isPending}
            error={business.isError}
            retry={() => void business.refetch()}
          />
          {business.data && <BusinessQRSettings config={business.data} />}
        </>
      ) : (
        <section className="section">
          <div className="section-title">
            <h2>Un buen motivo para visitarte</h2>
            <Button size="sm" onClick={() => setPromotionOpen(true)}>
              <Plus size={17} /> Nueva promoción
            </Button>
          </div>
          <QueryState
            loading={promotions.isPending}
            error={promotions.isError}
            retry={() => void promotions.refetch()}
          />
          <div className="business-promotions">
            {promotions.data?.map((p) => (
              <article key={p.id}>
                <img src={p.image} alt="Imagen de la promoción" />
                <div>
                  <span className="little-label">
                    {p.isActive === false
                      ? 'PAUSADA'
                      : p.isActiveNow === false
                        ? 'PROGRAMADA'
                        : 'ACTIVA'}
                  </span>
                  <h3>{p.title}</h3>
                  <span className="promo-type">{promotionLabel(p)}</span>
                  <p>{p.description}</p>
                  {p.code && <small>Código: {p.code}</small>}
                  {p.terms && <small>{p.terms}</small>}
                  <small>
                    Vigencia: {p.startsAt ? p.startsAt.slice(0, 10) : 'desde su publicación'} ·{' '}
                    {p.endsAt ? p.endsAt.slice(0, 10) : 'sin fecha de término'}
                  </small>
                  {p.redemptionsCount !== undefined && (
                    <small>
                      Canjes: {p.redemptionsCount}
                      {p.maxRedemptions !== undefined ? ` de ${p.maxRedemptions}` : ''}
                    </small>
                  )}
                </div>
              </article>
            ))}
          </div>
          {promotions.isSuccess && !promotions.data.length && (
            <p className="muted">Tu primera promoción puede ser el inicio de una nueva visita.</p>
          )}
        </section>
      )}
      <Dialog
        open={scanOpen}
        onOpenChange={(open) => {
          if (!stamp.isPending) setScanOpen(open);
        }}
        title={scanned ? 'Confirma la visita' : 'Un sello, una nueva visita'}
        description={
          scanned
            ? 'Confirma únicamente después de verificar la compra. El servidor validará el QR y la tarjeta del cliente.'
            : 'Pide a tu cliente que abra su código QR de Punto Plus.'
        }
      >
        {scanned ? (
          <div className="confirm-panel">
            <span className="confirm-icon">
              <ScanLine size={34} />
            </span>
            <h3>QR capturado</h3>
            <p>Se agregará 1 sello a la tarjeta de tu negocio.</p>
            {isDemo && (
              <div className="notice">Demostración: solo se modifican datos de este navegador.</div>
            )}
            <Button
              className="full-width"
              disabled={stamp.isPending}
              onClick={() => stamp.mutate(scanned)}
            >
              {stamp.isPending ? 'Registrando…' : 'Confirmar compra y agregar sello'}
            </Button>
            <Button
              className="full-width"
              variant="ghost"
              disabled={stamp.isPending}
              onClick={() => setScanned(null)}
            >
              Escanear otro código
            </Button>
          </div>
        ) : (
          <Scanner onResult={onScan} business />
        )}
      </Dialog>
      <Dialog
        open={promotionOpen}
        onOpenChange={(open) => {
          if (!promotion.isPending) setPromotionOpen(open);
        }}
        title="Algo bueno para tus clientes"
        description="Publica una promoción con sus condiciones y vigencia."
      >
        <form
          className="modal-form"
          onSubmit={form.handleSubmit((v) => promotion.mutate(promotionPayload(v)))}
        >
          <label>
            Título
            <input {...form.register('title')} placeholder="Ej. 20% en bebidas" />
            {form.formState.errors.title && (
              <span className="form-error">{form.formState.errors.title.message}</span>
            )}
          </label>
          <label>
            Descripción
            <textarea
              {...form.register('description')}
              rows={3}
              placeholder="Describe brevemente el beneficio."
            />
          </label>
          <label>
            Asociar a una tarjeta de fidelidad
            <select {...form.register('loyaltyCardId')}>
              <option value="">No asociar a una tarjeta específica</option>
              {business.data?.loyaltyCards?.map((cardOption) => (
                <option key={cardOption.id} value={cardOption.id}>
                  {cardOption.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tipo de beneficio
            <select {...form.register('discountType')}>
              <option value="percentage">Porcentaje de descuento</option>
              <option value="fixed">Monto fijo de descuento</option>
              <option value="gift">Regalo o producto gratis</option>
              <option value="points">Beneficio por puntos</option>
            </select>
          </label>
          {discountType !== 'gift' && (
            <label>
              {discountType === 'percentage'
                ? 'Porcentaje de descuento'
                : discountType === 'fixed'
                  ? 'Monto de descuento'
                  : 'Puntos o valor del beneficio'}
              <input type="number" min="0.01" step="any" {...form.register('discountValue')} />
              {form.formState.errors.discountValue && (
                <span className="form-error">{form.formState.errors.discountValue.message}</span>
              )}
            </label>
          )}
          <label>
            Código promocional (opcional)
            <input {...form.register('code')} placeholder="Ej. BIENVENIDO" />
          </label>
          <label>
            Términos y condiciones (opcional)
            <textarea {...form.register('terms')} rows={3} />
          </label>
          <div className="form-columns">
            <label>
              Inicia (opcional)
              <input type="datetime-local" {...form.register('startsAt')} />
            </label>
            <label>
              Termina (opcional)
              <input type="datetime-local" {...form.register('endsAt')} />
              {form.formState.errors.endsAt && (
                <span className="form-error">{form.formState.errors.endsAt.message}</span>
              )}
            </label>
          </div>
          <label>
            Máximo de canjes (opcional)
            <input type="number" min="1" {...form.register('maxRedemptions')} />
          </label>
          <label className="form-check" style={{ marginBottom: 6 }}>
            <input {...form.register('isActive')} type="checkbox" />
            <span aria-hidden="true" />
            Publicar activa
          </label>
          <Button type="submit" className="full-width" disabled={promotion.isPending}>
            {promotion.isPending ? 'Publicando…' : 'Publicar promoción'}
          </Button>
        </form>
      </Dialog>
    </>
  );
}
