import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Check,
  Gift,
  ImagePlus,
  Megaphone,
  Palette,
  Plus,
  Save,
  ScanLine,
  Store,
} from 'lucide-react';
import { toast } from 'sonner';
import { businessSchema, type BusinessConfig, type LoyaltyCard as Card } from '../lib/types';
import { isDemo } from '../lib/utils';
import {
  useAddPromotion,
  useBusiness,
  useBusinessPromotions,
  useSaveBusiness,
  useStamp,
} from '../lib/queries';
import { LoyaltyCard } from '../components/LoyaltyCard';
import { Button } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';
import { Scanner } from '../components/Scanner';
import { QueryState } from './CustomerPages';
const promotionFormSchema = z.object({
  title: z.string().min(5, 'Escribe al menos 5 caracteres').max(80, 'Máximo 80 caracteres'),
  description: z.string().min(20, 'Incluye condiciones en al menos 20 caracteres').max(1000),
  expires: z
    .string()
    .refine(
      (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && new Date(`${v}T23:59:59`) > new Date(),
      'Elige una fecha futura',
    ),
  image: z.string().min(1, 'Selecciona una imagen'),
});
type PromotionForm = z.infer<typeof promotionFormSchema>;
async function readImage(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new Error('Utiliza una imagen JPG, PNG o WebP.');
  if (file.size > 2 * 1024 * 1024) throw new Error('La imagen debe pesar menos de 2 MB.');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No pudimos leer la imagen.'));
    reader.readAsDataURL(file);
  });
}
function BusinessEditor({ config }: { config: BusinessConfig }) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<BusinessConfig>({ resolver: zodResolver(businessSchema), defaultValues: config });
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
    defaultValues: { title: '', description: '', expires: '', image: '/images/coffee.webp' },
  });
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
      </div>
      {tab === 'card' ? (
        <>
          <QueryState
            loading={business.isPending}
            error={business.isError}
            retry={() => void business.refetch()}
          />
          {business.data && <BusinessEditor config={business.data} />}
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
        <form className="modal-form" onSubmit={form.handleSubmit((v) => promotion.mutate(v))}>
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
