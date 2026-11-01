import { describe, expect, it } from 'vitest';
import {
  contrastRatio,
  extractPaletteFromFile,
  hexToRgb,
  relativeLuminance,
  rgbToHex,
} from '../lib/colors';

describe('Extracción de colores del logo', () => {
  it('convierte RGB a hexadecimal', () => {
    expect(rgbToHex([0, 0, 0])).toBe('#000000');
    expect(rgbToHex([35, 153, 160])).toBe('#2399a0');
  });

  it('lee valores hexadecimales', () => {
    expect(hexToRgb('#2399A0')).toEqual([35, 153, 160]);
    expect(hexToRgb('#000000')).toEqual([0, 0, 0]);
    expect(hexToRgb('no-es-un-color')).toBeNull();
  });

  it('calcula luminancia relativa', () => {
    expect(relativeLuminance([0, 0, 0])).toBe(0);
    expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1);
  });

  it('calcula el contraste entre colores (blanco vs negro = 21:1)', () => {
    expect(contrastRatio([255, 255, 255], [0, 0, 0])).toBeCloseTo(21);
    expect(contrastRatio([35, 153, 160], [35, 153, 160])).toBeCloseTo(1);
  });

  it('devuelve una paleta predeterminada cuando la imagen no se puede analizar', async () => {
    const file = new File(['contenido-no-es-una-imagen'], 'logo.png', { type: 'image/png' });
    const analysis = await extractPaletteFromFile(file);
    expect(analysis.primary).toBe('#2399A0');
    expect(analysis.secondary).toBe('#F5BE8B');
    expect(analysis.qrForeground).toBe('#000000');
    expect(analysis.qrBackground).toBe('#FFFFFF');
    expect(analysis.palette).toContain('#2399A0');
  });
});
