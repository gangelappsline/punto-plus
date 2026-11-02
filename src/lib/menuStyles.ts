import type {
  MenuCardStyle,
  MenuDensity,
  MenuFontFamily,
  MenuLayout,
  MenuLogoShape,
  MenuNavStyle,
  MenuSurface,
} from './types';

export type {
  MenuCardStyle,
  MenuDensity,
  MenuFontFamily,
  MenuLayout,
  MenuLogoShape,
  MenuNavStyle,
  MenuSurface,
};

/**
 * Diseño del menú digital.
 *
 * Un negocio puede resolverlo en un toque con una **plantilla** (`menuTemplates`)
 * o abrir «Personalizar» y combinar cada ajuste por separado. Todos los valores
 * son los mismos que ya viajan a la API en `menu_design` (más cinco claves
 * nuevas y opcionales), así que nada de la configuración existente se rompe.
 */

interface MenuDesignFields {
  /** Portada: centrada, editorial, partida o compacta. */
  layout: MenuLayout;
  /** Forma del logo: el detalle que más cambia la personalidad del menú. */
  logoShape: MenuLogoShape;
  /** Tratamiento de las tarjetas de platillo. */
  cardStyle: MenuCardStyle;
  /** Fondo general del menú. */
  surface: MenuSurface;
  /** Fila de categorías: pastillas, pestañas o tarjetas. */
  navStyle: MenuNavStyle;
  /** Densidad de la lista de platillos (el antiguo `menu_style`). */
  menuStyle: MenuDensity;
}

export interface MenuDesign extends MenuDesignFields {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: MenuFontFamily;
}

/** Diseño equivalente al que existía antes: menú claro, centrado y con tarjetas suaves. */
export const defaultMenuDesign: MenuDesign = {
  primaryColor: '#187f79',
  secondaryColor: '#f4d5b3',
  fontFamily: 'dm-sans',
  menuStyle: 'cozy',
  layout: 'spotlight',
  logoShape: 'squircle',
  cardStyle: 'soft',
  surface: 'light',
  navStyle: 'pills',
};

export interface MenuTemplate extends MenuDesign {
  id: string;
  label: string;
  description: string;
  group: string;
}

/** Doce plantillas agrupadas por temperatura, como las referencias visuales. */
export const menuTemplates: MenuTemplate[] = [
  {
    id: 'natural',
    label: 'Natural',
    description: 'Verdes frescos, portada centrada y logo circular.',
    group: 'Cálidos',
    primaryColor: '#1b6b4a',
    secondaryColor: '#eaf5ee',
    fontFamily: 'dm-sans',
    menuStyle: 'cozy',
    layout: 'spotlight',
    logoShape: 'circle',
    cardStyle: 'soft',
    surface: 'light',
    navStyle: 'pills',
  },
  {
    id: 'artesanal',
    label: 'Artesanal',
    description: 'Papel crema, titular a la izquierda y logo redondeado.',
    group: 'Cálidos',
    primaryColor: '#9c4f2b',
    secondaryColor: '#fbeade',
    fontFamily: 'lora',
    menuStyle: 'cozy',
    layout: 'poster',
    logoShape: 'squircle',
    cardStyle: 'outlined',
    surface: 'cream',
    navStyle: 'tabs',
  },
  {
    id: 'parrilla',
    label: 'Parrilla',
    description: 'Arena cálida, banner partido y tarjetas con acento.',
    group: 'Cálidos',
    primaryColor: '#7c2d12',
    secondaryColor: '#f3e3d3',
    fontFamily: 'manrope',
    menuStyle: 'cozy',
    layout: 'split',
    logoShape: 'circle',
    cardStyle: 'bold',
    surface: 'sand',
    navStyle: 'cards',
  },
  {
    id: 'dulce',
    label: 'Dulce',
    description: 'Rosa suave, letra amable y logo cuadrado redondeado.',
    group: 'Cálidos',
    primaryColor: '#a8456a',
    secondaryColor: '#fdeef3',
    fontFamily: 'nunito',
    menuStyle: 'cozy',
    layout: 'poster',
    logoShape: 'squircle',
    cardStyle: 'soft',
    surface: 'cream',
    navStyle: 'cards',
  },
  {
    id: 'brasa',
    label: 'Brasa',
    description: 'Fondo oscuro, dorado y aire de steakhouse.',
    group: 'Oscuros',
    primaryColor: '#d9a441',
    secondaryColor: '#2a2118',
    fontFamily: 'lora',
    menuStyle: 'cozy',
    layout: 'split',
    logoShape: 'circle',
    cardStyle: 'bold',
    surface: 'dark',
    navStyle: 'cards',
  },
  {
    id: 'zen',
    label: 'Zen',
    description: 'Negro carbón con acento rojo para sushi y barras.',
    group: 'Oscuros',
    primaryColor: '#e0655a',
    secondaryColor: '#241a1a',
    fontFamily: 'dm-sans',
    menuStyle: 'cozy',
    layout: 'poster',
    logoShape: 'squircle',
    cardStyle: 'flat',
    surface: 'dark',
    navStyle: 'tabs',
  },
  {
    id: 'medianoche',
    label: 'Medianoche',
    description: 'Azul profundo, compacto y con logo cuadrado.',
    group: 'Oscuros',
    primaryColor: '#8fb7e8',
    secondaryColor: '#16202e',
    fontFamily: 'manrope',
    menuStyle: 'compact',
    layout: 'compact',
    logoShape: 'square',
    cardStyle: 'outlined',
    surface: 'dark',
    navStyle: 'pills',
  },
  {
    id: 'oceano',
    label: 'Océano',
    description: 'Petróleo y aqua, fondo tenue del color de marca.',
    group: 'Frescos',
    primaryColor: '#0f6b74',
    secondaryColor: '#e6f6f6',
    fontFamily: 'dm-sans',
    menuStyle: 'compact',
    layout: 'split',
    logoShape: 'squircle',
    cardStyle: 'soft',
    surface: 'tinted',
    navStyle: 'pills',
  },
  {
    id: 'huerto',
    label: 'Huerto',
    description: 'Verde hoja, portada ligera y tarjetas delineadas.',
    group: 'Frescos',
    primaryColor: '#356b2f',
    secondaryColor: '#ecf5e8',
    fontFamily: 'outfit',
    menuStyle: 'compact',
    layout: 'compact',
    logoShape: 'square',
    cardStyle: 'outlined',
    surface: 'light',
    navStyle: 'tabs',
  },
  {
    id: 'citrico',
    label: 'Cítrico',
    description: 'Naranja cálido, tarjetas con acento y logo circular.',
    group: 'Frescos',
    primaryColor: '#b45413',
    secondaryColor: '#fff1e0',
    fontFamily: 'outfit',
    menuStyle: 'cozy',
    layout: 'spotlight',
    logoShape: 'circle',
    cardStyle: 'bold',
    surface: 'cream',
    navStyle: 'cards',
  },
  {
    id: 'minimalista',
    label: 'Minimalista',
    description: 'Grises neutros, sin sombras y logo cuadrado.',
    group: 'Minimalistas',
    primaryColor: '#2f3542',
    secondaryColor: '#f1f2f4',
    fontFamily: 'outfit',
    menuStyle: 'compact',
    layout: 'compact',
    logoShape: 'square',
    cardStyle: 'flat',
    surface: 'light',
    navStyle: 'tabs',
  },
  {
    id: 'editorial',
    label: 'Editorial',
    description: 'Vino y tipografía clásica con portada a la izquierda.',
    group: 'Minimalistas',
    primaryColor: '#7a1f38',
    secondaryColor: '#f7ecef',
    fontFamily: 'serif',
    menuStyle: 'cozy',
    layout: 'poster',
    logoShape: 'circle',
    cardStyle: 'outlined',
    surface: 'cream',
    navStyle: 'tabs',
  },
];

/** Grupos en el orden en que se muestran las plantillas. */
export const menuTemplateGroups = ['Cálidos', 'Oscuros', 'Frescos', 'Minimalistas'] as const;

export function menuTemplateById(id: string): MenuTemplate | undefined {
  return menuTemplates.find((template) => template.id === id);
}

/** Ajustes de diseño de una plantilla, listos para escribir en el borrador. */
export function menuTemplateValues(template: MenuTemplate): MenuDesign {
  const {
    primaryColor,
    secondaryColor,
    fontFamily,
    menuStyle,
    layout,
    logoShape,
    cardStyle,
    surface,
    navStyle,
  } = template;
  return {
    primaryColor,
    secondaryColor,
    fontFamily,
    menuStyle,
    layout,
    logoShape,
    cardStyle,
    surface,
    navStyle,
  };
}

const sameColor = (a: string, b: string) => a.trim().toLowerCase() === b.toLowerCase();

/** Plantilla que representa el diseño actual, o `undefined` si ya es propio. */
export function menuTemplateFor(design: Partial<MenuDesign>): MenuTemplate | undefined {
  return menuTemplates.find((template) => {
    const values = menuTemplateValues(template);
    return (
      sameColor(values.primaryColor, design.primaryColor ?? '') &&
      sameColor(values.secondaryColor, design.secondaryColor ?? '') &&
      values.fontFamily === design.fontFamily &&
      values.menuStyle === design.menuStyle &&
      values.layout === design.layout &&
      values.logoShape === design.logoShape &&
      values.cardStyle === design.cardStyle &&
      values.surface === design.surface &&
      values.navStyle === design.navStyle
    );
  });
}

/** Completa un diseño parcial (por ejemplo, uno guardado antes) con los valores por defecto. */
export function resolveMenuDesign(input: Partial<MenuDesign> = {}): MenuDesign {
  return {
    primaryColor: input.primaryColor || defaultMenuDesign.primaryColor,
    secondaryColor: input.secondaryColor || defaultMenuDesign.secondaryColor,
    fontFamily: input.fontFamily ?? defaultMenuDesign.fontFamily,
    menuStyle: input.menuStyle ?? defaultMenuDesign.menuStyle,
    layout: input.layout ?? defaultMenuDesign.layout,
    logoShape: input.logoShape ?? defaultMenuDesign.logoShape,
    cardStyle: input.cardStyle ?? defaultMenuDesign.cardStyle,
    surface: input.surface ?? defaultMenuDesign.surface,
    navStyle: input.navStyle ?? defaultMenuDesign.navStyle,
  };
}

/**
 * Colores con los que se pinta el menú.
 *
 * Los fondos claros usan tarjetas blancas con tinta oscura; los oscuros,
 * tarjetas grafito con tinta clara y texto oscuro sobre el color de marca
 * (`onPrimary`), que es lo que evita combinaciones ilegibles cuando el acento
 * es un dorado o un rojo brillante.
 */
export interface MenuTheme {
  surface: string;
  surfaceSoft: string;
  card: string;
  ink: string;
  muted: string;
  border: string;
  onPrimary: string;
  /** Fondo de los degradados de la portada cuando el negocio no subió banner. */
  hero: string;
  /** Fondo casi opaco para las barras fijas que se desplazan sobre el contenido. */
  surfaceVeil: string;
  /** Acento legible sobre blanco (diálogos), aunque el menú sea oscuro. */
  accentOnLight: string;
}

/** Luminancia relativa WCAG de un `#rrggbb`. */
function luminance(hex: string) {
  const channels = [1, 3, 5]
    .map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/** Contraste WCAG entre dos colores; `1` si alguno no es un hex válido. */
export function menuContrast(a: string, b: string) {
  if (!/^#[\da-f]{6}$/i.test(a) || !/^#[\da-f]{6}$/i.test(b)) return 1;
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

const lightTheme = (surface: string, surfaceSoft: string): MenuTheme => ({
  surface,
  surfaceSoft,
  card: '#ffffff',
  ink: '#232a33',
  muted: '#63707f',
  border: '#e4e7ea',
  onPrimary: '#ffffff',
  hero: 'radial-gradient(ellipse at 15% 22%, #d7a36b66, transparent 34%), radial-gradient(ellipse at 88% 72%, #479e9077, transparent 36%), linear-gradient(125deg, #172f3e, #3f594a 52%, #8b6143)',
  surfaceVeil: `${surface}e6`,
  accentOnLight: '#232a33',
});

const darkTheme: MenuTheme = {
  surface: '#0f1319',
  surfaceSoft: '#151a22',
  card: '#1b1f26',
  ink: '#f4f6f9',
  muted: '#a6b1c0',
  border: '#2b333f',
  onPrimary: '#14181f',
  hero: 'radial-gradient(ellipse at 20% 20%, #d9a44133, transparent 40%), linear-gradient(135deg, #0b0e12, #1d2129 60%, #2a2118)',
  surfaceVeil: '#0f1319e6',
  accentOnLight: '#232a33',
};

export function menuTheme(design: MenuDesign): MenuTheme {
  const base = ((): MenuTheme => {
    switch (design.surface) {
      case 'dark':
        return darkTheme;
      case 'cream':
        return lightTheme('#faf6ef', '#f3ede2');
      case 'sand':
        return lightTheme('#f3ece1', '#e9dfcf');
      case 'tinted':
        return {
          ...lightTheme('#fbfbfa', '#ffffff'),
          surface: `color-mix(in srgb, ${design.primaryColor} 7%, #fbfbfa)`,
          surfaceSoft: `color-mix(in srgb, ${design.primaryColor} 4%, #ffffff)`,
          surfaceVeil: `color-mix(in srgb, ${design.primaryColor} 8%, #fbfbfae6)`,
        };
      default:
        return lightTheme('#fafaf9', '#f4f4f3');
    }
  })();
  // Los diálogos siempre son blancos: si el acento es claro (menús oscuros) se
  // sustituye por la tinta para que el texto siga siendo legible.
  return {
    ...base,
    accentOnLight:
      menuContrast(design.primaryColor, '#ffffff') >= 4.5 ? design.primaryColor : '#232a33',
  };
}

export interface MenuOption<T extends string> {
  value: T;
  label: string;
  description: string;
}

/** Opciones de la portada, en el orden en que se muestran. */
export const menuLayoutOptions: MenuOption<MenuLayout>[] = [
  {
    value: 'spotlight',
    label: 'Centrada',
    description: 'Logo y nombre al centro sobre la portada.',
  },
  { value: 'poster', label: 'Editorial', description: 'Texto a la izquierda, estilo revista.' },
  { value: 'split', label: 'Partida', description: 'Mitad foto, mitad color de marca.' },
  { value: 'compact', label: 'Compacta', description: 'Portada baja para llegar antes al menú.' },
];

export const menuLogoShapeOptions: MenuOption<MenuLogoShape>[] = [
  { value: 'circle', label: 'Circular', description: 'Como un sello redondo.' },
  { value: 'squircle', label: 'Cuadrado redondeado', description: 'El clásico de las apps.' },
  { value: 'square', label: 'Cuadrado', description: 'Marco recto tipo monograma.' },
];

export const menuCardStyleOptions: MenuOption<MenuCardStyle>[] = [
  { value: 'soft', label: 'Suave', description: 'Sombra ligera y esquinas redondeadas.' },
  { value: 'outlined', label: 'Delineada', description: 'Solo borde, sin sombra.' },
  { value: 'flat', label: 'Plana', description: 'Sin borde ni sombra, muy limpio.' },
  { value: 'bold', label: 'Con acento', description: 'Barra de color de marca en la tarjeta.' },
];

export const menuSurfaceOptions: MenuOption<MenuSurface>[] = [
  { value: 'light', label: 'Blanco', description: 'Fondo claro neutro.' },
  { value: 'cream', label: 'Crema', description: 'Papel cálido, estilo panadería.' },
  { value: 'sand', label: 'Arena', description: 'Beige tostado, estilo parrilla.' },
  { value: 'tinted', label: 'Tinte de marca', description: 'Fondo con un toque de tu color.' },
  { value: 'dark', label: 'Oscuro', description: 'Menú nocturno con texto claro.' },
];

export const menuNavStyleOptions: MenuOption<MenuNavStyle>[] = [
  { value: 'pills', label: 'Pastillas', description: 'Botones redondeados en una fila.' },
  { value: 'tabs', label: 'Pestañas', description: 'Subrayado en la categoría activa.' },
  { value: 'cards', label: 'Tarjetas', description: 'Bloques con icono, tipo marketplace.' },
];

/** Radio del logo según su forma. */
export const logoShapeClass: Record<MenuLogoShape, string> = {
  circle: 'rounded-full',
  squircle: 'rounded-[26%]',
  square: 'rounded-md',
};

/** Radio y borde de las tarjetas de platillo. */
export const cardStyleClass: Record<MenuCardStyle, string> = {
  soft: 'rounded-2xl border shadow-sm',
  outlined: 'rounded-xl border',
  flat: 'rounded-lg border border-transparent',
  bold: 'rounded-2xl border shadow-sm',
};
