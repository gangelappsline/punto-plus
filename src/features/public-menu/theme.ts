/**
 * Tema del menú público `/menu/<slug>`.
 *
 * El diseño base es nocturno y editorial, pero respeta la identidad de cada
 * negocio: el color principal se usa como acento (botones, precios, distintivos)
 * y el secundario como superficie suave. Si el negocio eligió un fondo claro
 * (`cream`, `sand` o `light`) el menú cambia a una versión de papel cálido.
 */
import { contrastRatio, hexToRgb } from '../../lib/colors';
import type { PublicMenu } from '../../lib/types';
import { resolveMenuDesign } from '../../lib/menuStyles';

export interface PublicMenuTheme {
  dark: boolean;
  /** Fondo de la página. */
  surface: string;
  /** Fondo de tarjetas y bloques. */
  card: string;
  /** Tarjetas elevadas (detalle de platillo, carrito). */
  cardStrong: string;
  ink: string;
  muted: string;
  line: string;
  brand: string;
  onBrand: string;
  soft: string;
  onSoft: string;
  /** Degradado de la portada. */
  hero: string;
  /** Texto del acento legible sobre el fondo. */
  accent: string;
}

function readableOn(color: string, light: string, dark: string) {
  const rgb = hexToRgb(color);
  if (!rgb) return light;
  const onWhite = contrastRatio(rgb, hexToRgb(light) ?? [255, 255, 255]);
  const onBlack = contrastRatio(rgb, hexToRgb(dark) ?? [0, 0, 0]);
  return onWhite >= onBlack ? light : dark;
}

/** Mezcla el acento con el fondo para textos legibles en ambos temas. */
export function mixed(color: string, percent: number, base: string) {
  return `color-mix(in srgb, ${color} ${percent}%, ${base})`;
}

export function publicMenuTheme(business: PublicMenu): PublicMenuTheme {
  const design = resolveMenuDesign({
    primaryColor: business.primaryColor,
    secondaryColor: business.secondaryColor,
    fontFamily: business.fontFamily,
    menuStyle: business.menuStyle,
    layout: business.menuLayout,
    logoShape: business.menuLogoShape,
    cardStyle: business.menuCardStyle,
    surface: business.menuSurface,
    navStyle: business.menuNavStyle,
  });
  const brand = design.primaryColor;
  const soft = design.secondaryColor;
  const dark = design.surface === 'dark';
  const onBrand = readableOn(brand, '#ffffff', '#0b0b0f');
  const onSoft = readableOn(soft, '#0b0b0f', '#ffffff');

  if (dark) {
    return {
      dark,
      surface: '#0b0b0f',
      card: '#141418',
      cardStrong: '#1b1b21',
      ink: '#f6f3ee',
      muted: mixed('#f6f3ee', 62, '#0b0b0f'),
      line: mixed('#f6f3ee', 12, '#0b0b0f'),
      brand,
      onBrand,
      soft,
      onSoft,
      hero: `radial-gradient(130% 120% at 15% 0%, ${mixed(brand, 32, '#0b0b0f')} 0%, ${mixed(
        brand,
        8,
        '#0b0b0f',
      )} 42%, #0b0b0f 78%)`,
      accent: readableOn(brand, brand, mixed(brand, 70, '#ffffff')),
    };
  }

  const paper =
    design.surface === 'sand' ? '#f3ece1' : design.surface === 'cream' ? '#faf6ef' : '#f7f6f4';
  return {
    dark,
    surface: paper,
    card: design.surface === 'sand' ? '#fbf7f0' : '#ffffff',
    cardStrong: '#ffffff',
    ink: '#141418',
    muted: mixed('#141418', 62, paper),
    line: mixed('#141418', 12, paper),
    brand,
    onBrand,
    soft,
    onSoft,
    hero: `radial-gradient(120% 110% at 12% 0%, ${mixed(brand, 30, paper)} 0%, ${mixed(
      soft,
      55,
      paper,
    )} 55%, ${paper} 100%)`,
    accent: readableOn(brand, brand, mixed(brand, 65, '#141418')),
  };
}

/** Variables CSS que consumen los componentes del menú. */
export function themeVars(theme: PublicMenuTheme): Record<string, string> {
  return {
    '--pm-surface': theme.surface,
    '--pm-card': theme.card,
    '--pm-card-strong': theme.cardStrong,
    '--pm-ink': theme.ink,
    '--pm-muted': theme.muted,
    '--pm-line': theme.line,
    '--pm-brand': theme.brand,
    '--pm-on-brand': theme.onBrand,
    '--pm-soft': theme.soft,
    '--pm-on-soft': theme.onSoft,
    '--pm-hero': theme.hero,
    '--pm-accent': theme.accent,
  };
}
