import type { MenuFontFamily } from './types';

/**
 * Estilos de menú listos para usar.
 *
 * Cada preset reúne exactamente los mismos cuatro ajustes que ya existían en el
 * paso «Diseño» (`primaryColor`, `secondaryColor`, `fontFamily` y `menuStyle`):
 * no cambia el contrato con la API ni añade campos nuevos. La idea es que un
 * negocio configure su menú en un toque y que «Personalizar» siga mostrando los
 * controles de siempre cuando ninguno le acomode.
 */
export interface MenuStylePreset {
  id: string;
  label: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: MenuFontFamily;
  menuStyle: 'cozy' | 'compact';
}

export const menuStylePresets: MenuStylePreset[] = [
  {
    id: 'natural',
    label: 'Natural',
    description: 'Verdes frescos para cafés y comida saludable.',
    primaryColor: '#1b6b4a',
    secondaryColor: '#eaf5ee',
    fontFamily: 'dm-sans',
    menuStyle: 'cozy',
  },
  {
    id: 'artesanal',
    label: 'Artesanal',
    description: 'Tonos de horno y letra editorial para panaderías.',
    primaryColor: '#9c4f2b',
    secondaryColor: '#fbeade',
    fontFamily: 'lora',
    menuStyle: 'cozy',
  },
  {
    id: 'noche',
    label: 'Noche',
    description: 'Azul profundo y orden compacto para barras y cenas.',
    primaryColor: '#1e3a5f',
    secondaryColor: '#e8eef8',
    fontFamily: 'manrope',
    menuStyle: 'compact',
  },
  {
    id: 'minimalista',
    label: 'Minimalista',
    description: 'Grises limpios y mucho contenido a la vista.',
    primaryColor: '#2f3542',
    secondaryColor: '#f1f2f4',
    fontFamily: 'outfit',
    menuStyle: 'compact',
  },
  {
    id: 'dulce',
    label: 'Dulce',
    description: 'Rosa suave y letra amable para repostería.',
    primaryColor: '#a8456a',
    secondaryColor: '#fdeef3',
    fontFamily: 'nunito',
    menuStyle: 'cozy',
  },
  {
    id: 'citrico',
    label: 'Cítrico',
    description: 'Naranja cálido y actual para antojitos.',
    primaryColor: '#b45413',
    secondaryColor: '#fff1e0',
    fontFamily: 'outfit',
    menuStyle: 'cozy',
  },
  {
    id: 'elegante',
    label: 'Elegante',
    description: 'Vino y tipografía clásica para restaurantes.',
    primaryColor: '#7a1f38',
    secondaryColor: '#f7ecef',
    fontFamily: 'serif',
    menuStyle: 'cozy',
  },
  {
    id: 'oceano',
    label: 'Océano',
    description: 'Petróleo y aqua, fresco para mariscos y ensaladas.',
    primaryColor: '#0f6b74',
    secondaryColor: '#e6f6f6',
    fontFamily: 'dm-sans',
    menuStyle: 'compact',
  },
];

export function menuStylePresetById(id: string | undefined): MenuStylePreset | undefined {
  return menuStylePresets.find((preset) => preset.id === id);
}

/** Ajustes del preset tal como se escriben en el borrador del negocio. */
export function menuStylePresetValues(preset: MenuStylePreset) {
  return {
    primaryColor: preset.primaryColor,
    secondaryColor: preset.secondaryColor,
    fontFamily: preset.fontFamily,
    menuStyle: preset.menuStyle,
  };
}

/**
 * Preset que representa el diseño actual, o `undefined` si el negocio ya tiene
 * una combinación propia (entonces el paso muestra «Personalizar» abierto, sin
 * tocarle nada).
 */
export function menuStylePresetFor(draft: {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: MenuFontFamily;
  menuStyle: 'cozy' | 'compact';
}): MenuStylePreset | undefined {
  const sameColor = (a: string, b: string) => a.trim().toLowerCase() === b.toLowerCase();
  return menuStylePresets.find(
    (preset) =>
      sameColor(preset.primaryColor, draft.primaryColor) &&
      sameColor(preset.secondaryColor, draft.secondaryColor) &&
      preset.fontFamily === draft.fontFamily &&
      preset.menuStyle === draft.menuStyle,
  );
}
