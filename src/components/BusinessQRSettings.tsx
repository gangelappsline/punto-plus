import { useEffect, useRef, useState } from 'react';
import QRCodeStyling, {
  type CornerDotType,
  type CornerSquareType,
  type DotType,
  type FileExtension,
} from 'qr-code-styling';
import { Download, ImagePlus, Link as LinkIcon, RotateCcw, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { readImage } from '../lib/image';
import type { BusinessConfig } from '../lib/types';
import { publicMenuUrl } from '../lib/utils';
import { useSaveBusinessQRConfiguration } from '../lib/queries';

type ShapeChoice<T extends string> = { value: T; label: string };

const bodyShapes: ShapeChoice<DotType>[] = [
  { value: 'square', label: 'Cuadrado' },
  { value: 'dots', label: 'Puntos' },
  { value: 'rounded', label: 'Redondeado' },
  { value: 'extra-rounded', label: 'Circular' },
  { value: 'classy', label: 'Geométrico' },
  { value: 'classy-rounded', label: 'Geométrico suave' },
];
const eyeFrameShapes: ShapeChoice<CornerSquareType>[] = [
  { value: 'square', label: 'Cuadrado' },
  { value: 'dot', label: 'Circular' },
  { value: 'rounded', label: 'Redondeado' },
  { value: 'extra-rounded', label: 'Muy redondeado' },
  { value: 'dots', label: 'Punteado' },
  { value: 'classy', label: 'Geométrico' },
  { value: 'classy-rounded', label: 'Geométrico suave' },
];
const eyeShapes: ShapeChoice<CornerDotType>[] = [
  { value: 'square', label: 'Cuadrado' },
  { value: 'dot', label: 'Punto' },
  { value: 'rounded', label: 'Redondeado' },
  { value: 'extra-rounded', label: 'Circular' },
  { value: 'dots', label: 'Punteado' },
  { value: 'classy', label: 'Geométrico' },
  { value: 'classy-rounded', label: 'Geométrico suave' },
];

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'negocio'
  );
}

function validHexColor(value: string | undefined, fallback: string) {
  return value && /^#[\da-f]{6}$/i.test(value) ? value : fallback;
}

function shapeRadius(shape: string) {
  if (shape === 'dot' || shape === 'dots' || shape === 'extra-rounded') return 'rounded-full';
  if (shape === 'classy-rounded') return 'rounded-xl';
  if (shape === 'rounded') return 'rounded-md';
  if (shape === 'classy') return 'rounded-sm';
  return 'rounded-none';
}

function ShapeGlyph({ style, kind }: { style: string; kind: 'body' | 'frame' | 'eye' }) {
  if (kind === 'frame')
    return (
      <span
        className={`grid size-8 place-items-center border-[3px] border-slate-900 ${shapeRadius(style)}`}
      >
        <span className={`size-2.5 bg-slate-900 ${shapeRadius(style)}`} />
      </span>
    );
  if (kind === 'eye') return <span className={`size-5 bg-slate-900 ${shapeRadius(style)}`} />;

  return (
    <span className="grid size-8 grid-cols-3 place-items-center gap-0.5">
      {Array.from({ length: 9 }, (_, index) => (
        <span
          key={index}
          className={`size-1.5 bg-slate-900 ${shapeRadius(style)} ${style === 'classy' && index % 2 ? 'opacity-50' : ''}`}
        />
      ))}
    </span>
  );
}

function ShapePicker<T extends string>({
  title,
  kind,
  value,
  options,
  onChange,
}: {
  title: string;
  kind: 'body' | 'frame' | 'eye';
  value: T;
  options: readonly ShapeChoice<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-xs font-extrabold text-slate-700">{title}</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {options.map((option) => (
          <button
            type="button"
            key={option.value}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={`flex min-w-0 items-center gap-2 rounded-xl border p-2 text-left text-xs font-semibold transition ${
              value === option.value
                ? 'border-sky-500 bg-sky-50 text-sky-900 ring-1 ring-sky-400'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
            }`}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white">
              <ShapeGlyph style={option.value} kind={kind} />
            </span>
            <span className="truncate">{option.label}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function BusinessQRSettings({ config }: { config: BusinessConfig }) {
  const qrPreview = useRef<HTMLDivElement>(null);
  const qrCode = useRef<QRCodeStyling | null>(null);
  const logoPicker = useRef<HTMLInputElement>(null);
  const mutation = useSaveBusinessQRConfiguration();
  const menuUrl = publicMenuUrl(slugify(config.name));
  const savedForeground = validHexColor(config.qrForeground, '#000000');
  const savedBackground = validHexColor(config.qrBackground, '#FFFFFF');
  const savedEyeColor = validHexColor(config.qrEyeColor, savedForeground);
  const savedContent = config.qrContent?.trim() || menuUrl;
  const savedBodyShape = config.qrBodyStyle ?? 'square';
  const savedFrameShape = config.qrEyeFrameStyle ?? 'square';
  const savedEyeShape = config.qrEyeStyle ?? 'square';
  const savedResolution = config.qrSize ?? 800;
  const [foreground, setForeground] = useState(savedForeground);
  const [background, setBackground] = useState(savedBackground);
  const [eyeColor, setEyeColor] = useState(savedEyeColor);
  const [content, setContent] = useState(savedContent);
  const [logo, setLogo] = useState(config.qrLogo ?? '');
  const [bodyShape, setBodyShape] = useState<DotType>(savedBodyShape);
  const [frameShape, setFrameShape] = useState<CornerSquareType>(savedFrameShape);
  const [eyeShape, setEyeShape] = useState<CornerDotType>(savedEyeShape);
  const [resolution, setResolution] = useState(savedResolution);
  const [qrReady, setQrReady] = useState(false);
  const [qrError, setQrError] = useState('');

  const dirty =
    foreground !== savedForeground ||
    background !== savedBackground ||
    eyeColor !== savedEyeColor ||
    content.trim() !== savedContent ||
    logo !== (config.qrLogo ?? '') ||
    bodyShape !== savedBodyShape ||
    frameShape !== savedFrameShape ||
    eyeShape !== savedEyeShape ||
    resolution !== savedResolution;
  const validContent = Boolean(content.trim());

  useEffect(() => {
    setForeground(savedForeground);
    setBackground(savedBackground);
    setEyeColor(savedEyeColor);
    setContent(savedContent);
    setLogo(config.qrLogo ?? '');
    setBodyShape(savedBodyShape);
    setFrameShape(savedFrameShape);
    setEyeShape(savedEyeShape);
    setResolution(savedResolution);
  }, [
    savedForeground,
    savedBackground,
    savedEyeColor,
    savedContent,
    config.qrLogo,
    savedBodyShape,
    savedFrameShape,
    savedEyeShape,
    savedResolution,
  ]);

  useEffect(() => {
    const container = qrPreview.current;
    if (!container || !validContent) {
      qrCode.current = null;
      setQrReady(false);
      container?.replaceChildren();
      return;
    }

    try {
      setQrError('');
      const renderer = new QRCodeStyling({
        type: 'svg',
        width: resolution,
        height: resolution,
        data: content.trim(),
        image: logo || undefined,
        margin: 12,
        qrOptions: { errorCorrectionLevel: 'H' },
        imageOptions: {
          crossOrigin: 'anonymous',
          hideBackgroundDots: true,
          imageSize: 0.24,
          margin: 6,
          saveAsBlob: false,
        },
        dotsOptions: { color: foreground, type: bodyShape, roundSize: false },
        cornersSquareOptions: { color: eyeColor, type: frameShape },
        cornersDotOptions: { color: eyeColor, type: eyeShape },
        backgroundOptions: { color: background, round: 0 },
      });
      container.replaceChildren();
      renderer.append(container);
      qrCode.current = renderer;
      const svg = container.querySelector('svg');
      if (svg) {
        svg.style.display = 'block';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.setAttribute('title', `Código QR del menú de ${config.name}`);
        svg.setAttribute('role', 'img');
      }
      setQrReady(true);
    } catch {
      qrCode.current = null;
      setQrReady(false);
      setQrError('No pudimos generar el QR. Revisa el contenido y vuelve a intentarlo.');
    }

    return () => {
      qrCode.current = null;
      container.replaceChildren();
    };
  }, [
    config.name,
    content,
    validContent,
    resolution,
    logo,
    foreground,
    background,
    eyeColor,
    bodyShape,
    frameShape,
    eyeShape,
  ]);

  function saveSettings() {
    mutation.mutate({
      content: content.trim() || menuUrl,
      foreground,
      background,
      eyeColor,
      logo: logo || undefined,
      bodyStyle: bodyShape,
      eyeFrameStyle: frameShape,
      eyeStyle: eyeShape,
      size: resolution,
    });
  }

  async function download(extension: FileExtension) {
    if (!qrCode.current) {
      toast.error('No encontramos el código QR para descargar.');
      return;
    }
    try {
      await qrCode.current.download({ name: `${slugify(config.name)}-qr`, extension });
    } catch {
      toast.error(`No pudimos descargar el archivo ${extension.toUpperCase()}.`);
    }
  }

  async function selectLogo(file?: File) {
    if (!file) return;
    try {
      setLogo(await readImage(file));
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      if (logoPicker.current) logoPicker.current.value = '';
    }
  }

  function resetSettings() {
    setForeground('#000000');
    setBackground('#FFFFFF');
    setEyeColor('#000000');
    setContent(menuUrl);
    setLogo('');
    setBodyShape('square');
    setFrameShape('square');
    setEyeShape('square');
    setResolution(800);
  }

  return (
    <section className="mx-auto grid max-w-6xl gap-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-w-0 flex-col gap-6">
        <header>
          <div className="mb-2 flex items-center gap-2 text-emerald-800">
            <LinkIcon size={20} />
            <span className="text-xs font-extrabold uppercase tracking-wider">
              Código QR del negocio
            </span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Personaliza tu QR
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Ajusta el contenido, los colores y las formas del código de tu negocio. El QR puede
            abrir tu menú público o cualquier otro enlace que quieras compartir.
          </p>
        </header>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-extrabold text-slate-800">Introduce contenido</legend>
          <label htmlFor="business-qr-content" className="text-xs font-semibold text-slate-600">
            Enlace o texto que codificará el QR
          </label>
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
            <input
              id="business-qr-content"
              aria-label="Contenido del QR"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
              type="text"
              maxLength={2048}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder={menuUrl}
            />
            <Button type="button" variant="outline" onClick={() => setContent(menuUrl)}>
              Usar enlace del menú
            </Button>
          </div>
          <a
            className="break-all text-xs font-medium text-emerald-800 underline decoration-emerald-300 underline-offset-4"
            href={menuUrl}
            target="_blank"
            rel="noreferrer"
          >
            Enlace público: {menuUrl}
          </a>
        </fieldset>

        <fieldset className="grid gap-3 sm:grid-cols-3">
          <legend className="mb-2 text-sm font-extrabold text-slate-800">Escoge colores</legend>
          <label className="flex flex-col gap-2 text-xs font-bold text-slate-700">
            Color del código
            <span className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <input
                aria-label="Color del código QR"
                className="size-10 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                type="color"
                value={foreground}
                onChange={(event) => setForeground(event.target.value)}
              />
              <span className="font-mono text-sm font-medium text-slate-600">{foreground}</span>
            </span>
          </label>
          <label className="flex flex-col gap-2 text-xs font-bold text-slate-700">
            Color del fondo
            <span className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <input
                aria-label="Color de fondo del QR"
                className="size-10 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                type="color"
                value={background}
                onChange={(event) => setBackground(event.target.value)}
              />
              <span className="font-mono text-sm font-medium text-slate-600">{background}</span>
            </span>
          </label>
          <label className="flex flex-col gap-2 text-xs font-bold text-slate-700">
            Color de los ojos
            <span className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <input
                aria-label="Color de los ojos del QR"
                className="size-10 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                type="color"
                value={eyeColor}
                onChange={(event) => setEyeColor(event.target.value)}
              />
              <span className="font-mono text-sm font-medium text-slate-600">{eyeColor}</span>
            </span>
          </label>
        </fieldset>
        <p className="-mt-4 text-xs leading-5 text-slate-500">
          Para que el QR se pueda escanear bien, procura mantener suficiente contraste y usar un
          fondo claro.
        </p>

        <ShapePicker
          title="Forma del cuerpo"
          kind="body"
          value={bodyShape}
          options={bodyShapes}
          onChange={setBodyShape}
        />
        <ShapePicker
          title="Forma del marco del ojo"
          kind="frame"
          value={frameShape}
          options={eyeFrameShapes}
          onChange={setFrameShape}
        />
        <ShapePicker
          title="Forma del ojo"
          kind="eye"
          value={eyeShape}
          options={eyeShapes}
          onChange={setEyeShape}
        />

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-extrabold text-slate-800">Añadir imagen del logo</h3>
          <p className="text-xs leading-5 text-slate-500">
            El logo se coloca en el centro del QR. Usa una imagen cuadrada y mantenlo pequeño para
            facilitar el escaneo.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={logoPicker}
              aria-label="Seleccionar logo para el QR"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(event) => void selectLogo(event.target.files?.[0])}
            />
            <Button type="button" variant="outline" onClick={() => logoPicker.current?.click()}>
              <ImagePlus size={16} /> Subir logo
            </Button>
            {config.logo && (
              <Button type="button" variant="outline" onClick={() => setLogo(config.logo ?? '')}>
                Usar logo del negocio
              </Button>
            )}
            {logo && (
              <Button type="button" variant="outline" onClick={() => setLogo('')}>
                <Trash2 size={15} /> Quitar logo
              </Button>
            )}
            {logo && (
              <img
                src={logo}
                alt="Vista previa del logo para el QR"
                className="size-11 rounded-lg border border-slate-200 object-contain p-1"
              />
            )}
          </div>
        </section>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-extrabold text-slate-800">Resolución de descarga</legend>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">Baja</span>
            <input
              aria-label="Resolución del QR"
              className="min-w-0 flex-1 accent-sky-500"
              type="range"
              min={256}
              max={2048}
              step={32}
              value={resolution}
              onChange={(event) => setResolution(Number(event.target.value))}
            />
            <span className="text-xs text-slate-500">Alta</span>
          </div>
          <p className="text-center text-sm font-bold text-slate-700">
            {resolution} × {resolution} px
          </p>
        </fieldset>

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4">
          <Button
            type="button"
            disabled={!dirty || mutation.isPending || !validContent}
            onClick={saveSettings}
          >
            <Save size={16} /> {mutation.isPending ? 'Guardando…' : 'Guardar configuración'}
          </Button>
          <Button type="button" variant="outline" onClick={resetSettings}>
            <RotateCcw size={15} /> Restablecer
          </Button>
          {!dirty && <span className="text-xs text-emerald-700">Configuración guardada</span>}
        </div>
      </div>

      <aside className="flex flex-col items-center gap-4 rounded-2xl bg-slate-50 p-4 text-center sm:p-5 xl:sticky xl:top-5 xl:self-start">
        <span className="text-[10px] font-extrabold tracking-[0.16em] text-slate-500">
          VISTA PREVIA
        </span>
        {qrError ? (
          <p
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
          >
            {qrError}
          </p>
        ) : !validContent ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Escribe contenido para generar el código QR.
          </p>
        ) : null}
        <div
          ref={qrPreview}
          aria-label="Vista previa del código QR"
          className="size-64 max-w-full overflow-hidden rounded-xl border border-slate-200 p-3 shadow-sm [&>svg]:h-full [&>svg]:w-full"
          style={{ backgroundColor: background }}
        />
        <p className="max-w-xs break-all text-xs leading-5 text-slate-500">{content}</p>
        <div className="grid w-full grid-cols-2 gap-2">
          <Button type="button" disabled={!qrReady} onClick={() => void download('png')}>
            <Download size={15} /> Descargar PNG
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!qrReady}
            onClick={() => void download('svg')}
          >
            SVG
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!qrReady}
            onClick={() => void download('webp')}
          >
            Descargar WebP
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!qrReady}
            onClick={() => void download('jpeg')}
          >
            JPG
          </Button>
        </div>
        <p className="text-[11px] leading-5 text-slate-500">
          PNG, WebP y JPG se descargan a {resolution} × {resolution} px. El SVG es vectorial y puede
          ampliarse sin perder calidad.
        </p>
      </aside>
    </section>
  );
}
