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
import type { PromotionInput } from '../services/api';
import { LoyaltyCard } from '../components/LoyaltyCard';
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
    type: z.enum(['simple', 'steps', 'direct']),
    title: z.string().min(5, 'Escribe al menos 5 caracteres').max(80, 'Máximo 80 caracteres'),
    description: z.string().min(20, 'Incluye condiciones en al menos 20 caracteres').max(1000),
    expires: z
      .string()
      .refine(
        (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && new Date(`${v}T23:59:59`) > new Date(),
        'Elige una fecha futura',
      ),
    image: z.string().min(1, 'Selecciona una imagen'),
    // Sencilla
    purchasesRequired: z.coerce.number().int().min(1, 'Elige al menos 1 compra').optional(),
    freeProduct: z.string().optional(),
    freeQuantity: z.coerce.number().int().min(1).optional(),
    // Por pasos: la fila inicial arranca con el beneficio vacío, así que la forma de
    // cada nivel se relaja aquí y la obligación real se resuelve por tipo en
    // `superRefine`. Si se exigiera `min(1)` desde la base, ningún tipo de promoción
    // podría publicarse mientras exista una fila sin beneficio.
    tiers: z
      .array(
        z.object({
          points: z.coerce.number(),
          benefit: z.string(),
        }),
      )
      .optional(),
    // Directas
    appliesAlways: z.boolean().optional(),
    weekdays: z.array(z.coerce.number().int().min(0).max(6)).optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.type === 'simple') {
      if (!value.purchasesRequired)
        ctx.addIssue({
          code: 'custom',
          path: ['purchasesRequired'],
          message: 'Escribe el número de compras requeridas.',
        });
      if (!value.freeProduct?.trim())
        ctx.addIssue({
          code: 'custom',
          path: ['freeProduct'],
          message: 'Escribe el producto gratis.',
        });
    }
    if (value.type === 'steps') {
      if (!value.tiers?.length)
        ctx.addIssue({
          code: 'custom',
          path: ['tiers'],
          message: 'Agrega al menos un nivel de puntos.',
        });
      else {
        value.tiers.forEach((tier, index) => {
          if (!tier.benefit?.trim())
            ctx.addIssue({
              code: 'custom',
              path: ['tiers', index, 'benefit'],
              message: 'Describe el beneficio.',
            });
          if (!tier.points)
            ctx.addIssue({
              code: 'custom',
              path: ['tiers', index, 'points'],
              message: 'Los puntos mínimos son obligatorios.',
            });
        });
      }
    }
    if (value.type === 'direct' && !value.appliesAlways) {
      if (!value.weekdays?.length)
        ctx.addIssue({
          code: 'custom',
          path: ['weekdays'],
          message: 'Selecciona al menos un día.',
        });
      if (!value.startTime || !value.endTime)
        ctx.addIssue({
          code: 'custom',
          path: ['startTime'],
          message: 'Elige la hora de inicio y fin.',
        });
      else if (value.startTime >= value.endTime)
        ctx.addIssue({
          code: 'custom',
          path: ['endTime'],
          message: 'La hora de fin debe ser posterior a la de inicio.',
        });
    }
  });
type PromotionForm = z.infer<typeof promotionFormSchema>;
/**
 * Deja en el payload únicamente las condiciones del tipo elegido: el formulario
 * conserva valores por defecto de los tres tipos y no tiene sentido enviar al
 * backend niveles de puntos vacíos en una promoción directa.
 */
function promotionPayload(v: PromotionForm): PromotionInput {
  const base = {
    type: v.type,
    title: v.title,
    description: v.description,
    expires: v.expires,
    image: v.image,
  };
  if (v.type === 'simple')
    return {
      ...base,
      purchasesRequired: v.purchasesRequired,
      freeProduct: v.freeProduct,
      freeQuantity: v.freeQuantity,
    };
  if (v.type === 'steps')
    return {
      ...base,
      tiers: (v.tiers ?? []).map((t) => ({ points: t.points, benefit: t.benefit })),
    };
  return v.appliesAlways
    ? { ...base, appliesAlways: true }
    : {
        ...base,
        appliesAlways: false,
        weekdays: v.weekdays ?? [],
        startTime: v.startTime,
        endTime: v.endTime,
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
        <div className="form-columns">
          <label>
            Color de fondo
            <select {...register('theme')}>
              <option value="forest">Bosque</option>
              <option value="terracotta">Terracota</option>
              <option value="lavender">Lavanda</option>
            </select>
          </label>
          <label>
            Icono del sello
            <select {...register('icon')}>
              <option value="coffee">Café</option>
              <option value="bread">Pan</option>
              <option value="leaf">Hoja</option>
            </select>
          </label>
        </div>
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
      type: 'direct',
      title: '',
      description: '',
      expires: '',
      image: '/images/coffee.webp',
      purchasesRequired: 5,
      freeQuantity: 1,
      appliesAlways: true,
      weekdays: [],
      startTime: '',
      endTime: '',
      tiers: [{ points: 10, benefit: '' }],
    },
  });

  // `watch` se suscribe al formulario: al cambiar el tipo de promoción, el interruptor de
  // "siempre activa", los días o los niveles, los campos condicionales se re-renderizan.
  const promotionType = form.watch('type');
  const appliesAlways = form.watch('appliesAlways');
  const selectedDays = (form.watch('weekdays') as number[] | undefined) ?? [];
  const tiers = (form.watch('tiers') as { points: number; benefit: string }[] | undefined) ?? [];

  function promotionLabel(p: Promotion): string {
    if (p.type === 'simple')
      return `Sencilla · cada ${p.purchasesRequired} compras, ${p.freeQuantity || 1} ${p.freeProduct || 'producto'} gratis`;
    if (p.type === 'steps') return `Por pasos · ${p.tiers?.length ?? 0} niveles de puntos`;
    if (p.type === 'direct')
      return p.appliesAlways
        ? 'Directa · siempre activa'
        : `Directa · ${(p.weekdays ?? []).map((d: number) => ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][d]).join(', ')} ${p.startTime ?? ''}-${p.endTime ?? ''}`;
    return p.description;
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
                  <span className="little-label">PUBLICADA</span>
                  <h3>{p.title}</h3>
                  <span className="promo-type">{promotionLabel(p)}</span>
                  <p>{p.description}</p>
                  <small>Vigencia: {p.expires}</small>
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
            Tipo de promoción
            <select {...form.register('type')}>
              <option value="simple">Sencilla · compras = producto gratis</option>
              <option value="steps">Por pasos · beneficios por puntos</option>
              <option value="direct">Directa · siempre o días y horas específicos</option>
            </select>
            {form.formState.errors.type && (
              <span className="form-error">{form.formState.errors.type.message}</span>
            )}
          </label>
          <label>
            Título
            <input {...form.register('title')} placeholder="Las buenas mañanas son de dos" />
            {form.formState.errors.title && (
              <span className="form-error">{form.formState.errors.title.message}</span>
            )}
          </label>
          <label>
            Descripción y condiciones
            <textarea
              {...form.register('description')}
              rows={4}
              placeholder="¿Qué incluye? ¿En qué horario aplica?"
            />
            {form.formState.errors.description && (
              <span className="form-error">{form.formState.errors.description.message}</span>
            )}
          </label>
          <label>
            Válida hasta
            <input type="date" {...form.register('expires')} />
            {form.formState.errors.expires && (
              <span className="form-error">{form.formState.errors.expires.message}</span>
            )}
          </label>

          {promotionType === 'simple' && (
            <>
              <div className="form-columns">
                <label>
                  Después de cuántas compras se gana
                  <input type="number" min="1" {...form.register('purchasesRequired')} />
                </label>
                <label>
                  Cantidad de productos gratis
                  <input
                    type="number"
                    min="1"
                    {...form.register('freeQuantity')}
                    defaultValue={1}
                  />
                </label>
              </div>
              <label>
                Producto gratis
                <input {...form.register('freeProduct')} placeholder="Ej. 1 café americano" />
              </label>
              {form.formState.errors.purchasesRequired && (
                <span className="form-error">
                  {form.formState.errors.purchasesRequired.message}
                </span>
              )}
              {form.formState.errors.freeProduct && (
                <span className="form-error">{form.formState.errors.freeProduct.message}</span>
              )}
            </>
          )}
          {promotionType === 'steps' && (
            <>
              <p className="muted">Beneficios por metas de puntos acumulados:</p>
              {tiers.map((_tier: { points: number; benefit: string }, index: number) => (
                <div key={index} className="tier-row">
                  <input
                    type="number"
                    min="1"
                    placeholder="Puntos"
                    {...form.register(`tiers.${index}.points`)}
                  />
                  <input placeholder="Beneficio" {...form.register(`tiers.${index}.benefit`)} />
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => form.setValue('tiers', [...tiers, { points: 0, benefit: '' }])}
              >
                <Plus size={16} /> Agregar nivel
              </Button>
              {form.formState.errors.tiers && (
                <span className="form-error">{form.formState.errors.tiers.message}</span>
              )}
            </>
          )}
          {promotionType === 'direct' && (
            <>
              <label className="form-check" style={{ marginBottom: 6 }}>
                <input {...form.register('appliesAlways')} type="checkbox" defaultChecked />
                <span aria-hidden="true" />
                Siempre activa
              </label>
              {!appliesAlways && (
                <>
                  <label>
                    Días de la semana
                    <div className="weekdays">
                      {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day, index) => (
                        <button
                          key={day}
                          type="button"
                          className="weekday-chip"
                          onClick={() =>
                            form.setValue(
                              'weekdays',
                              selectedDays.includes(index)
                                ? selectedDays.filter((d) => d !== index)
                                : [...selectedDays, index],
                            )
                          }
                          aria-pressed={selectedDays.includes(index)}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </label>
                  <div className="form-columns">
                    <label>
                      Hora de inicio
                      <input type="time" {...form.register('startTime')} />
                    </label>
                    <label>
                      Hora de fin
                      <input type="time" {...form.register('endTime')} />
                    </label>
                  </div>
                  {form.formState.errors.weekdays && (
                    <span className="form-error">{form.formState.errors.weekdays.message}</span>
                  )}
                  {form.formState.errors.startTime && (
                    <span className="form-error">{form.formState.errors.startTime.message}</span>
                  )}
                </>
              )}
            </>
          )}

          <label className="upload-label">
            <ImagePlus size={18} />{' '}
            {form.watch('image').startsWith('data:')
              ? 'Imagen seleccionada · cambiar'
              : 'Subir imagen (opcional, máximo 2 MB)'}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={async (e) => {
                if (!e.target.files?.[0]) return;
                try {
                  form.setValue('image', await readImage(e.target.files[0]));
                } catch (err) {
                  toast.error((err as Error).message);
                }
              }}
            />
          </label>
          <Button type="submit" className="full-width" disabled={promotion.isPending}>
            {promotion.isPending ? 'Publicando…' : 'Publicar promoción'}
          </Button>
        </form>
      </Dialog>
    </>
  );
}
