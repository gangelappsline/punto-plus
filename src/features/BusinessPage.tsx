import { useEffect, useState } from 'react';
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
  Store,
  Timer,
} from 'lucide-react';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import {
  businessSchema,
  loyaltyCardThemeColors,
  readableInkColor,
  type BusinessConfig,
  type LoyaltyCard as Card,
  type LoyaltyCardTheme,
  type Promotion,
} from '../lib/types';
import { isDemo } from '../lib/utils';
import {
  useAddPromotion,
  useBusiness,
  useBusinessPromotions,
  useSaveBusiness,
  useNewSaleToken,
} from '../lib/queries';
import { readImage } from '../lib/image';
import type { BusinessPromotionInput, SaleToken } from '../services/api';
import {
  brandIconOptions,
  brandThemeList,
  brandThemeOptions,
  fontOptions,
  fontStack,
  BrandIcon,
  LoyaltyCard,
} from '../components/LoyaltyCard';
import { Button } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';
import { QueryState } from './CustomerPages';
import { BusinessQRSettings } from '../components/BusinessQRSettings';
const businessEditorSchema = businessSchema.extend({
  name: z.string().min(2, 'Escribe al menos 2 caracteres'),
});
const promotionFormSchema = z
  .object({
    title: z.string().trim().min(3, 'Escribe al menos 3 caracteres').max(150),
    description: z.string().trim().max(2000).optional(),
    imageBanner: z.string().optional(),
    loyaltyCardId: z.string().optional(),
    discountType: z.enum(['percentage', 'fixed', 'gift', 'points']),
    discountValue: z.preprocess(
      (value) => (value === '' || value === null ? undefined : value),
      z.coerce.number().optional(),
    ),
    code: z.string().trim().max(100).optional(),
    terms: z.string().trim().max(2000).optional(),
    isPermanent: z.boolean(),
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
    if (!value.isPermanent) {
      if (!value.startsAt)
        ctx.addIssue({
          code: 'custom',
          path: ['startsAt'],
          message: 'Elige la fecha de inicio.',
        });
      if (!value.endsAt)
        ctx.addIssue({
          code: 'custom',
          path: ['endsAt'],
          message: 'Elige la fecha de término.',
        });
      if (value.startsAt && value.endsAt && value.startsAt > value.endsAt)
        ctx.addIssue({
          code: 'custom',
          path: ['endsAt'],
          message: 'La fecha de término no puede ser anterior al inicio.',
        });
    }
  });
type PromotionForm = z.infer<typeof promotionFormSchema>;

function toApiDateTime(value?: string, endOfDay = false) {
  if (!value) return undefined;
  return new Date(`${value}T${endOfDay ? '23:59:59' : '00:00:00'}`).toISOString();
}

function promotionPayload(value: PromotionForm): BusinessPromotionInput {
  return {
    title: value.title,
    description: value.description || undefined,
    imageUrl: value.imageBanner || undefined,
    loyaltyCardId: value.loyaltyCardId || undefined,
    discountType: value.discountType,
    discountValue: value.discountType === 'gift' ? undefined : value.discountValue,
    code: value.code || undefined,
    terms: value.terms || undefined,
    startsAt: value.isPermanent ? undefined : toApiDateTime(value.startsAt),
    endsAt: value.isPermanent ? undefined : toApiDateTime(value.endsAt, true),
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
  const currentThemeColors =
    loyaltyCardThemeColors[(values.theme ?? 'forest') as LoyaltyCardTheme] ??
    loyaltyCardThemeColors.forest;
  const card: Card = {
    ...values,
    goal: Math.min(12, Math.max(2, Number(values.goal) || 2)),
    id: 'preview',
    businessId: 'b1',
    category: 'Cafetería',
    primaryColor: values.cardPrimaryColor,
    secondaryColor: values.cardSecondaryColor,
    textColor: values.cardTextColor,
    stampIconColor: values.cardStampIconColor,
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
        <p className="text-[13px] text-muted">Una tarjeta tan única como tu negocio.</p>
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
          <legend>Color de fondo</legend>
          <p>Cuarenta tonos organizados por familia. Elige el que mejor representa tu negocio.</p>
          <div className="space-y-4">
            {brandThemeOptions.map((group) => (
              <div key={group.label}>
                <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[1.2px] text-muted">
                  {group.label}
                </span>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {group.options.map((theme) => {
                    const selected = values.theme === theme.id;
                    return (
                      <button
                        type="button"
                        key={theme.id}
                        aria-pressed={selected}
                        aria-label={theme.label}
                        className={`flex min-w-0 items-center gap-[7px] rounded-[9px] border px-2 py-[7px] text-left text-[9px] leading-[1.3] transition-colors ${
                          selected
                            ? 'border-brand bg-[#eff9f8] font-bold text-brand-deep shadow-[0_0_0_1px_#2399a033]'
                            : 'border-[#e1e8ed] bg-white text-[#536c82] hover:border-[#9dc9c7] hover:bg-[#f5fbfa]'
                        }`}
                        onClick={() => {
                          setValue('theme', theme.id, { shouldDirty: true });
                          setValue('cardPrimaryColor', theme.primaryColor, { shouldDirty: true });
                          setValue('cardSecondaryColor', theme.secondaryColor, {
                            shouldDirty: true,
                          });
                          setValue('cardTextColor', theme.textColor, { shouldDirty: true });
                          setValue('cardStampIconColor', theme.stampIconColor, {
                            shouldDirty: true,
                          });
                        }}
                      >
                        <span
                          className="size-5 shrink-0 rounded-full border border-[#022f5318]"
                          style={{ background: theme.swatch }}
                        />
                        <span className="truncate">{theme.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <label className="mt-3 flex items-center gap-2 text-[10px] font-semibold text-[#536c82]">
            <input
              type="color"
              aria-label="Color de fondo personalizado"
              className="size-8 cursor-pointer rounded-lg border-0 bg-transparent p-0"
              value={values.cardPrimaryColor ?? currentThemeColors.primaryColor}
              onChange={(event) => {
                const background = event.target.value;
                setValue('cardPrimaryColor', background, { shouldDirty: true });
                // Si el color elegido ya existe en la paleta, el tema lo acompaña.
                const match = brandThemeList.find(
                  (theme) => theme.primaryColor.toLowerCase() === background.toLowerCase(),
                );
                if (match) setValue('theme', match.id, { shouldDirty: true });
                setValue('cardTextColor', readableInkColor(background), { shouldDirty: true });
              }}
            />
            Fondo personalizado
            <span className="font-mono font-normal text-muted">
              {values.cardPrimaryColor ?? currentThemeColors.primaryColor}
            </span>
          </label>
        </fieldset>
        <fieldset className="business-style-picker">
          <legend>Colores de la tarjeta</legend>
          <p>Ajusta el texto y el icono de los sellos completados.</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {(
              [
                ['cardTextColor', 'Color del texto', currentThemeColors.textColor],
                ['cardSecondaryColor', 'Color del sello', currentThemeColors.secondaryColor],
                [
                  'cardStampIconColor',
                  'Color del icono del sello',
                  currentThemeColors.stampIconColor,
                ],
              ] as const
            ).map(([field, label, fallback]) => (
              <div
                key={field}
                className="flex flex-col gap-1 rounded-[9px] border border-[#e1e8ed] bg-white p-2"
              >
                <span className="text-[9px] font-semibold text-[#536c82]">{label}</span>
                <span className="flex items-center gap-2">
                  <input
                    type="color"
                    aria-label={label}
                    className="size-9 cursor-pointer rounded-lg border border-[#022f5318] bg-transparent p-0"
                    value={values[field] ?? fallback}
                    onChange={(event) => setValue(field, event.target.value, { shouldDirty: true })}
                  />
                  <span className="font-mono text-[10px] text-muted">
                    {values[field] ?? fallback}
                  </span>
                </span>
              </div>
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
        <Button className="w-full" disabled={mutation.isPending || !isDirty} type="submit">
          <Save size={17} />
          {mutation.isPending ? 'Guardando…' : 'Guardar configuración'}
        </Button>
      </form>
      <div className="card-preview-panel">
        <span className="little-label">ASÍ LA VERÁN TUS CLIENTES</span>
        {values.logo && <img className="preview-logo" src={values.logo} alt="Logo de tu negocio" />}
        <LoyaltyCard card={card} onClick={() => setPreview(true)} variant="preview" />
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
        <LoyaltyCard card={card} onClick={() => setPreview(false)} variant="dialog" />
      </Dialog>
    </div>
  );
}
export function BusinessPage() {
  const business = useBusiness();
  const [tab, setTab] = useState('card');
  const [saleTokenOpen, setSaleTokenOpen] = useState(false);
  const [saleToken, setSaleToken] = useState<SaleToken | null>(null);
  const [saleTokenSecondsLeft, setSaleTokenSecondsLeft] = useState(0);
  const [promotionOpen, setPromotionOpen] = useState(false);
  const promotions = useBusinessPromotions();
  const newSaleToken = useNewSaleToken();
  const promotion = useAddPromotion(() => {
    setPromotionOpen(false);
    form.reset();
  });
  const form = useForm<PromotionForm>({
    resolver: zodResolver(promotionFormSchema),
    defaultValues: {
      title: '',
      description: '',
      imageBanner: '',
      loyaltyCardId: '',
      discountType: 'gift',
      discountValue: undefined,
      code: '',
      terms: '',
      isPermanent: true,
      startsAt: '',
      endsAt: '',
      maxRedemptions: undefined,
      isActive: true,
    },
  });
  const discountType = form.watch('discountType');
  const isPermanent = form.watch('isPermanent');

  useEffect(() => {
    if (!saleToken) {
      setSaleTokenSecondsLeft(0);
      return;
    }
    const updateRemaining = () =>
      setSaleTokenSecondsLeft(
        Math.max(0, Math.ceil((Date.parse(saleToken.expiresAt) - Date.now()) / 1000)),
      );
    updateRemaining();
    const timer = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(timer);
  }, [saleToken]);

  function requestSaleToken() {
    setSaleToken(null);
    newSaleToken.mutate(undefined, { onSuccess: setSaleToken });
  }

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
        <Button onClick={() => setSaleTokenOpen(true)}>
          <QrCode size={18} /> Generar token de venta
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
                    Vigencia:{' '}
                    {p.endsAt
                      ? `${p.startsAt ? p.startsAt.slice(0, 10) : 'desde su publicación'} – ${p.endsAt.slice(0, 10)}`
                      : `Permanente${p.startsAt ? ` desde ${p.startsAt.slice(0, 10)}` : ''} · sin fecha de término`}
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
            <p className="text-[13px] text-muted">
              Tu primera promoción puede ser el inicio de una nueva visita.
            </p>
          )}
        </section>
      )}
      <Dialog
        open={saleTokenOpen}
        onOpenChange={setSaleTokenOpen}
        title="Token para verificar una compra"
        description="Muestra el QR o comparte el código de 8 caracteres con tu cliente."
      >
        {saleToken && saleTokenSecondsLeft > 0 ? (
          <div className="sale-token-panel">
            <div className="sale-token-qr">
              <QRCodeSVG
                value={saleToken.token}
                title="QR del token de venta"
                size={240}
                level="M"
                marginSize={2}
                fgColor="#000000"
                bgColor="#FFFFFF"
              />
            </div>
            <span className="little-label">CÓDIGO DE VENTA</span>
            <p className="sale-token-code" aria-label="Código de venta">
              {saleToken.token}
            </p>
            <p className="muted sale-token-hint">
              El cliente puede escanear el QR o ingresar el código desde su perfil. Al verificarse,
              el token se consume y no se puede volver a usar.
            </p>
            <p className="sale-token-countdown" role="status">
              <Timer size={16} />
              Vence en {Math.floor(saleTokenSecondsLeft / 60)}:
              {String(saleTokenSecondsLeft % 60).padStart(2, '0')}
            </p>
            <Button
              className="w-full"
              variant="outline"
              disabled={newSaleToken.isPending}
              onClick={requestSaleToken}
            >
              {newSaleToken.isPending ? 'Generando…' : 'Generar un nuevo token'}
            </Button>
          </div>
        ) : (
          <div className="sale-token-empty">
            <p>
              {saleToken
                ? 'El token venció. Genera uno nuevo para verificar la compra.'
                : 'Cada token sirve para una sola compra y vence después de 5 minutos.'}
            </p>
            {isDemo && (
              <div className="notice">Demostración: se guarda solo en este navegador.</div>
            )}
            <Button className="w-full" disabled={newSaleToken.isPending} onClick={requestSaleToken}>
              {newSaleToken.isPending ? 'Generando…' : 'Solicitar token de venta'}
            </Button>
          </div>
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
          <label className="upload-label promotion-banner-upload">
            <ImagePlus size={18} aria-hidden="true" />
            <span>
              {form.watch('imageBanner') ? 'Cambiar imagen banner' : 'Agregar imagen banner'}
              <small>Opcional · Imagen horizontal · JPG, PNG o WebP · hasta 2 MB</small>
            </span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              aria-label="Agregar imagen banner de la promoción"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                try {
                  form.setValue('imageBanner', await readImage(file), { shouldDirty: true });
                } catch (error) {
                  toast.error((error as Error).message);
                }
                event.target.value = '';
              }}
            />
          </label>
          {form.watch('imageBanner') && (
            <div className="promotion-banner-preview">
              <img src={form.watch('imageBanner')} alt="Vista previa del banner de promoción" />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => form.setValue('imageBanner', '', { shouldDirty: true })}
              >
                Quitar imagen
              </Button>
            </div>
          )}
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
          <label className="form-check" style={{ marginBottom: 10 }}>
            <input {...form.register('isPermanent')} type="checkbox" />
            <span aria-hidden="true" />
            Promoción permanente, sin fecha de término
          </label>
          {isPermanent ? (
            <p className="muted promotion-date-hint">
              Se publicará sin fechas de inicio ni término; permanecerá vigente hasta que la pauses.
            </p>
          ) : (
            <div className="form-columns promotion-date-range">
              <label>
                Inicia
                <input type="date" {...form.register('startsAt')} />
                {form.formState.errors.startsAt && (
                  <span className="form-error">{form.formState.errors.startsAt.message}</span>
                )}
              </label>
              <label>
                Termina
                <input type="date" {...form.register('endsAt')} />
                {form.formState.errors.endsAt && (
                  <span className="form-error">{form.formState.errors.endsAt.message}</span>
                )}
              </label>
            </div>
          )}
          <label>
            Máximo de canjes (opcional)
            <input type="number" min="1" {...form.register('maxRedemptions')} />
          </label>
          <label className="form-check" style={{ marginBottom: 6 }}>
            <input {...form.register('isActive')} type="checkbox" />
            <span aria-hidden="true" />
            Publicar activa
          </label>
          <Button type="submit" className="w-full" disabled={promotion.isPending}>
            {promotion.isPending ? 'Publicando…' : 'Publicar promoción'}
          </Button>
        </form>
      </Dialog>
    </>
  );
}
