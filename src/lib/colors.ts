/**
 * Análisis de colores de imagen del lado del cliente.
 *
 * Lee una imagen (logo del negocio) y elige una paleta de marca con color
 * principal y secundario; el QR conserva sus valores predeterminados de alto
 * contraste en negro sobre blanco. Todo ocurre en el navegador, sin enviar la imagen a
 * ningún servidor.
 */

import type { LogoAnalysis } from './types';

type RGB = [number, number, number];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundStep(value: number, step: number) {
  return Math.round(value / step) * step;
}

function quantize(r: number, g: number, b: number, step = 32): RGB {
  return [roundStep(r, step), roundStep(g, step), roundStep(b, step)];
}

export function rgbToHex([r, g, b]: RGB): string {
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export function hexToRgb(hex: string): RGB | null {
  const match = hex.trim().match(/^#?([0-9a-fA-F]{6})$/);
  if (!match) return null;
  const [r, g, b] = match[1].match(/[0-9a-fA-F]{2}/g)!.map((v) => parseInt(v, 16));
  return [r, g, b];
}

export function relativeLuminance([r, g, b]: RGB): number {
  const s = (c: number) => {
    const channel = c / 255;
    return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * s(r) + 0.7152 * s(g) + 0.0722 * s(b);
}

export function contrastRatio(a: RGB, b: RGB): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rr:
        h = (gg - bb) / d + (gg < bb ? 6 : 0);
        break;
      case gg:
        h = (bb - rr) / d + 2;
        break;
      default:
        h = (rr - gg) / d + 4;
        break;
    }
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
}

function hslToRgb(h: number, s: number, l: number): RGB {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

/**
 * Extrae los colores dominantes de una imagen (data URL o File).
 * Devuelve una paleta lista para el menú digital y el QR.
 */
const defaultAnalysis: LogoAnalysis = {
  primary: '#2399A0',
  secondary: '#F5BE8B',
  qrForeground: '#000000',
  qrBackground: '#FFFFFF',
  palette: ['#2399A0', '#F5BE8B'],
};

export async function extractPaletteFromFile(
  file: File | string,
  options: { size?: number; step?: number } = {},
): Promise<LogoAnalysis> {
  const { size = 160, step = 32 } = options;
  const dataUrl = typeof file === 'string' ? file : await readFileAsDataUrl(file);
  let pixels: ImageData;
  try {
    pixels = await samplePixels(dataUrl, size);
  } catch {
    return defaultAnalysis;
  }
  const counts = new Map<string, { rgb: RGB; count: number }>();
  for (let i = 0; i < pixels.data.length; i += 4) {
    const r = pixels.data[i];
    const g = pixels.data[i + 1];
    const b = pixels.data[i + 2];
    const alpha = pixels.data[i + 3];
    // Ignora píxeles casi transparentes, blancos y negros (fondos habituales de logo).
    if (alpha < 10 || (r > 245 && g > 245 && b > 245) || (r < 20 && g < 20 && b < 20)) continue;
    const [qr, qg, qb] = quantize(r, g, b, step);
    const key = `${qr},${qg},${qb}`;
    const entry = counts.get(key);
    if (entry) entry.count += 1;
    else counts.set(key, { rgb: [qr, qg, qb], count: 1 });
  }
  const ranked = Array.from(counts.values()).sort((a, b) => b.count - a.count);
  if (ranked.length === 0) {
    // Fallback seguro: azul marca de Punto Plus.
    return {
      primary: '#2399A0',
      secondary: '#F5BE8B',
      qrForeground: '#000000',
      qrBackground: '#FFFFFF',
      palette: ['#2399A0', '#F5BE8B'],
    };
  }
  const primary = ranked[0].rgb;
  // El secundario es el color más contrastante entre los siguientes candidatos,
  // o el complementario del primario si nada contrasta lo suficiente.
  let secondary = pickContrast(primary, ranked.slice(1));
  if (contrastRatio(primary, secondary) < 3) {
    const [h, s, l] = rgbToHsl(primary);
    secondary = hslToRgb((h + 180) % 360, clamp(s, 40, 80), clamp(l, 35, 65));
  }
  const primaryHex = rgbToHex(primary);
  const secondaryHex = rgbToHex(secondary);
  // QR predeterminado de alto contraste, independiente de los colores de marca.
  const qrForeground = '#000000';
  const qrBackground = '#FFFFFF';
  return {
    primary: primaryHex,
    secondary: secondaryHex,
    qrForeground,
    qrBackground,
    palette: [primaryHex, secondaryHex],
  };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.readAsDataURL(file);
  });
}

function samplePixels(dataUrl: string, size: number): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timeout = setTimeout(() => {
      reject(new Error('La imagen no se pudo decodificar.'));
    }, 2000);
    image.onload = () => {
      clearTimeout(timeout);
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d');
      if (!context) return reject(new Error('No se pudo analizar la imagen.'));
      context.drawImage(image, 0, 0, size, size);
      resolve(context.getImageData(0, 0, size, size));
    };
    image.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('No se pudo cargar la imagen.'));
    };
    image.src = dataUrl;
  });
}

function pickContrast(primary: RGB, candidates: { rgb: RGB; count: number }[]): RGB {
  let best = candidates[0]?.rgb ?? [128, 128, 128];
  let bestScore = contrastRatio(primary, best);
  for (const candidate of candidates.slice(1)) {
    const score = contrastRatio(primary, candidate.rgb);
    if (score > bestScore) {
      bestScore = score;
      best = candidate.rgb;
    }
  }
  return best;
}
