import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  Check,
  ImagePlus,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Tags,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import type { AdminCategory, AdminCategoryInput } from '../lib/types';
import {
  useAdminCategories,
  useCreateAdminCategory,
  useDeleteAdminCategory,
  useUpdateAdminCategory,
} from '../lib/queries';
import { Button } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';

export function AdminCategoriesPage() {
  const categories = useAdminCategories();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminCategory | null>(null);
  const createCategory = useCreateAdminCategory(() => setFormOpen(false));
  const updateCategory = useUpdateAdminCategory(() => setFormOpen(false));
  const deleteCategory = useDeleteAdminCategory(() => setDeleteTarget(null));

  const filteredCategories = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase('es-MX');
    return (categories.data ?? []).filter((category) =>
      category.name.toLocaleLowerCase('es-MX').includes(normalized),
    );
  }, [categories.data, search]);

  function startCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function startEdit(category: AdminCategory) {
    setEditing(category);
    setFormOpen(true);
  }

  function saveCategory(input: AdminCategoryInput) {
    if (editing) updateCategory.mutate({ id: editing.id, ...input });
    else createCategory.mutate(input);
  }

  return (
    <div className="admin-categories-page">
      <div className="page-intro admin-categories-intro">
        <div>
          <div className="eyebrow">
            <Tags size={15} /> CATÁLOGO DE PLATAFORMA
          </div>
          <h1>
            Categorías <span>del menú.</span>
          </h1>
          <p>Administra los nombres e iconos que organizan los menús de los negocios.</p>
        </div>
        <Button onClick={startCreate}>
          <Plus size={17} /> Nueva categoría
        </Button>
      </div>

      <section className="admin-categories-card">
        <div className="admin-categories-toolbar">
          <div>
            <h2>Todas las categorías</h2>
            <p>
              {categories.isSuccess
                ? `${categories.data.length} ${categories.data.length === 1 ? 'categoría' : 'categorías'}`
                : 'Administra las categorías disponibles'}
            </p>
          </div>
          <label className="admin-category-search">
            <Search size={17} />
            <input
              type="search"
              aria-label="Buscar categorías"
              placeholder="Buscar categoría"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {search && (
              <button type="button" aria-label="Limpiar búsqueda" onClick={() => setSearch('')}>
                <X size={15} />
              </button>
            )}
          </label>
        </div>

        {categories.isPending && (
          <div className="admin-category-grid" role="status" aria-label="Cargando categorías">
            {[1, 2, 3].map((item) => (
              <div className="admin-category-skeleton" key={item} />
            ))}
          </div>
        )}
        {categories.isError && (
          <div className="admin-category-state">
            <span className="admin-category-state-icon">
              <Tags size={23} />
            </span>
            <h3>No pudimos cargar las categorías</h3>
            <p>Comprueba tu conexión e inténtalo de nuevo.</p>
            <Button variant="outline" onClick={() => void categories.refetch()}>
              Volver a intentar
            </Button>
          </div>
        )}
        {categories.isSuccess && filteredCategories.length > 0 && (
          <div className="admin-category-grid">
            {filteredCategories.map((category) => (
              <article className="admin-category-item" key={category.id}>
                <div className="admin-category-icon-wrap">
                  <CategoryIcon icon={category.icon} name={category.name} />
                </div>
                <div className="admin-category-info">
                  <span className="admin-category-label">CATEGORÍA</span>
                  <h3>{category.name}</h3>
                </div>
                <div className="admin-category-actions">
                  <button
                    type="button"
                    className="admin-category-edit"
                    aria-label={`Editar ${category.name}`}
                    onClick={() => startEdit(category)}
                  >
                    <Pencil size={15} />
                    <span>Editar</span>
                  </button>
                  <button
                    type="button"
                    className="admin-category-delete"
                    aria-label={`Eliminar ${category.name}`}
                    onClick={() => setDeleteTarget(category)}
                  >
                    <Trash2 size={15} />
                    <span>Eliminar</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
        {categories.isSuccess && filteredCategories.length === 0 && (
          <div className="admin-category-state">
            <span className="admin-category-state-icon">
              <SlidersHorizontal size={22} />
            </span>
            <h3>{search ? 'No encontramos coincidencias' : 'Aún no hay categorías'}</h3>
            <p>
              {search
                ? 'Prueba con otro nombre o limpia la búsqueda.'
                : 'Crea una categoría para empezar a organizar los menús.'}
            </p>
            {!search && (
              <Button onClick={startCreate}>
                <Plus size={16} /> Crear primera categoría
              </Button>
            )}
          </div>
        )}
      </section>

      <CategoryFormDialog
        open={formOpen}
        category={editing}
        isPending={createCategory.isPending || updateCategory.isPending}
        onOpenChange={setFormOpen}
        onSave={saveCategory}
      />

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !deleteCategory.isPending) setDeleteTarget(null);
        }}
        title="Eliminar categoría"
        description="Confirma que deseas eliminar esta categoría. Esta acción no se puede deshacer."
        className="admin-category-confirm-dialog"
      >
        {deleteTarget && (
          <div className="admin-category-confirm">
            <div className="admin-category-confirm-item">
              <CategoryIcon icon={deleteTarget.icon} name={deleteTarget.name} />
              <strong>{deleteTarget.name}</strong>
            </div>
            <p>¿Seguro que quieres eliminar esta categoría?</p>
            <div className="admin-category-confirm-actions">
              <Button
                type="button"
                variant="outline"
                disabled={deleteCategory.isPending}
                onClick={() => setDeleteTarget(null)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="button-danger"
                disabled={deleteCategory.isPending}
                onClick={() => deleteCategory.mutate(deleteTarget.id)}
              >
                <Trash2 size={16} />
                {deleteCategory.isPending ? 'Eliminando…' : 'Sí, eliminar'}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}

function CategoryIcon({ icon, name }: { icon: string; name: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [icon]);
  return failed || !icon ? (
    <span className="admin-category-icon-fallback" aria-label={`Icono de ${name}`}>
      <Tags size={22} />
    </span>
  ) : (
    <img src={icon} alt={`Icono de ${name}`} onError={() => setFailed(true)} />
  );
}

function CategoryFormDialog({
  open,
  category,
  isPending,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  category: AdminCategory | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: AdminCategoryInput) => void;
}) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [editorSource, setEditorSource] = useState('');
  const [imageEditorOpen, setImageEditorOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setName(category?.name ?? '');
    setIcon(category?.icon ?? '');
    setFormError('');
    setImageEditorOpen(false);
  }, [category, open]);

  async function pickImage(file?: File) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setFormError('Selecciona una imagen JPG, PNG o WebP.');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setFormError('La imagen debe pesar menos de 12 MB.');
      return;
    }
    try {
      setEditorSource(await blobToDataUrl(file));
      setImageEditorOpen(true);
      setFormError('');
    } catch {
      setFormError('No pudimos abrir esta imagen. Inténtalo de nuevo.');
    }
  }

  function editCurrentIcon() {
    if (!icon) {
      fileInput.current?.click();
      return;
    }
    setEditorSource(icon);
    setImageEditorOpen(true);
    setFormError('');
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setFormError('El nombre debe tener al menos 2 caracteres.');
      return;
    }
    if (!icon) {
      setFormError('Sube y guarda un icono para la categoría.');
      return;
    }
    setFormError('');
    onSave({ name: trimmedName, icon });
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={onOpenChange}
        title={category ? 'Editar categoría' : 'Nueva categoría'}
        description="Define un nombre claro y una imagen para identificarla en la plataforma."
        className="admin-category-form-dialog"
      >
        <form className="admin-category-form" onSubmit={submit}>
          <label className="admin-category-field">
            <span>
              Nombre <b>*</b>
            </span>
            <input
              autoFocus
              value={name}
              maxLength={70}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej. Cafetería"
              aria-label="Nombre de la categoría"
            />
          </label>

          <div className="admin-category-field">
            <span>
              Icono <b>*</b>
            </span>
            <div className="admin-category-image-editor">
              <div className="admin-category-image-preview">
                {icon ? (
                  <CategoryIcon icon={icon} name={name || 'categoría'} />
                ) : (
                  <span className="admin-category-icon-fallback">
                    <ImagePlus size={22} />
                  </span>
                )}
              </div>
              <div className="admin-category-image-copy">
                <strong>{icon ? 'Icono listo' : 'Agrega una imagen'}</strong>
                <small>JPG, PNG o WebP · hasta 12 MB</small>
                {icon.startsWith('data:image/webp') && (
                  <span className="admin-category-webp-badge">
                    <Check size={12} /> Convertida a WebP
                  </span>
                )}
                <div className="admin-category-image-button-row">
                  <button
                    type="button"
                    className="admin-category-image-button"
                    onClick={editCurrentIcon}
                  >
                    <SlidersHorizontal size={14} /> {icon ? 'Editar imagen' : 'Subir icono'}
                  </button>
                  {icon && (
                    <button
                      type="button"
                      className="admin-category-image-button secondary"
                      onClick={() => fileInput.current?.click()}
                    >
                      <ImagePlus size={14} /> Cambiar archivo
                    </button>
                  )}
                </div>
              </div>
              <input
                ref={fileInput}
                className="admin-category-file-input"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                aria-label="Seleccionar imagen de categoría"
                onChange={(event) => {
                  void pickImage(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
            </div>
          </div>

          {formError && (
            <p className="admin-category-form-error" role="alert">
              {formError}
            </p>
          )}
          <div className="admin-category-form-actions">
            <Button
              type="button"
              variant="ghost"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Guardando…' : category ? 'Guardar cambios' : 'Crear categoría'}
            </Button>
          </div>
        </form>
      </Dialog>

      <CategoryImageEditor
        open={imageEditorOpen}
        source={editorSource}
        onCancel={() => setImageEditorOpen(false)}
        onApply={(webpImage) => {
          setIcon(webpImage);
          setImageEditorOpen(false);
          setFormError('');
          toast.success('Icono convertido a WebP.');
        }}
      />
    </>
  );
}

function CategoryImageEditor({
  open,
  source,
  onCancel,
  onApply,
}: {
  open: boolean;
  source: string;
  onCancel: () => void;
  onApply: (webpDataUrl: string) => void;
}) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [zoom, setZoom] = useState(1.08);
  const [rotation, setRotation] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  useEffect(() => {
    setImageLoaded(false);
    setZoom(1.08);
    setRotation(0);
    setBrightness(100);
    setContrast(100);
    setOffsetX(0);
    setOffsetY(0);
  }, [source, open]);

  async function applyCrop() {
    const image = imageRef.current;
    if (!image) return;
    setProcessing(true);
    try {
      const size = 600;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Este navegador no permite editar imágenes.');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, size, size);
      const sideways = Math.abs(rotation % 180) === 90;
      const sourceWidth = sideways ? image.naturalHeight : image.naturalWidth;
      const sourceHeight = sideways ? image.naturalWidth : image.naturalHeight;
      const scale = Math.max(size / sourceWidth, size / sourceHeight) * zoom;
      context.translate(
        size / 2 + ((offsetX / 100) * size) / 2,
        size / 2 + ((offsetY / 100) * size) / 2,
      );
      context.rotate((rotation * Math.PI) / 180);
      context.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
      context.drawImage(
        image,
        -(image.naturalWidth * scale) / 2,
        -(image.naturalHeight * scale) / 2,
        image.naturalWidth * scale,
        image.naturalHeight * scale,
      );
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/webp', 0.9),
      );
      if (!blob || blob.type !== 'image/webp')
        throw new Error('No pudimos convertir el icono a WebP.');
      onApply(await blobToDataUrl(blob));
    } catch (error) {
      toast.error((error as Error).message || 'No pudimos procesar el icono.');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onCancel();
      }}
      title="Editar icono"
      description="Recorta y ajusta la imagen; se convertirá a WebP antes de subirla."
      className="admin-category-image-dialog"
    >
      {open && source && (
        <div className="admin-category-image-edit">
          <div className="admin-category-crop-frame">
            <img
              ref={imageRef}
              src={source}
              crossOrigin={source.startsWith('http') ? 'anonymous' : undefined}
              alt="Recorte del icono"
              onLoad={() => setImageLoaded(true)}
              style={{
                transform: `translate(${offsetX / 5}%, ${offsetY / 5}%) rotate(${rotation}deg) scale(${zoom})`,
                filter: `brightness(${brightness}%) contrast(${contrast}%)`,
              }}
            />
          </div>
          <label className="admin-category-range">
            Zoom
            <input
              type="range"
              min="1"
              max="2.8"
              step="0.01"
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
            />
          </label>
          <div className="admin-category-adjust-grid">
            <label className="admin-category-range">
              Rotación
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
            <label className="admin-category-range">
              Brillo
              <input
                type="range"
                min="60"
                max="140"
                value={brightness}
                onChange={(event) => setBrightness(Number(event.target.value))}
              />
            </label>
            <label className="admin-category-range">
              Contraste
              <input
                type="range"
                min="60"
                max="150"
                value={contrast}
                onChange={(event) => setContrast(Number(event.target.value))}
              />
            </label>
            <label className="admin-category-range">
              Encuadre horizontal
              <input
                type="range"
                min="-100"
                max="100"
                value={offsetX}
                onChange={(event) => setOffsetX(Number(event.target.value))}
              />
            </label>
            <label className="admin-category-range">
              Encuadre vertical
              <input
                type="range"
                min="-100"
                max="100"
                value={offsetY}
                onChange={(event) => setOffsetY(Number(event.target.value))}
              />
            </label>
          </div>
          <div className="admin-category-image-actions">
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!imageLoaded || processing}
              onClick={() => void applyCrop()}
            >
              <Check size={16} /> {processing ? 'Procesando…' : 'Aplicar y convertir a WebP'}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No se pudo leer la imagen seleccionada.'));
    reader.readAsDataURL(blob);
  });
}
