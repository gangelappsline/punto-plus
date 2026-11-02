import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { BusinessMenuWizard } from '../features/BusinessMenuWizard';
import { MenuPage } from '../features/MenuPage';
import { fontOptions } from '../components/LoyaltyCard';
import {
  cardStyleClass,
  logoShapeClass,
  menuCardStyleOptions,
  menuLayoutOptions,
  menuLogoShapeOptions,
  menuNavStyleOptions,
  menuSurfaceOptions,
  menuTemplateFor,
  menuTemplateGroups,
  menuTemplates,
  menuTemplateValues,
  menuTheme,
  resolveMenuDesign,
} from '../lib/menuStyles';
import {
  menuCardStyles,
  menuDensities,
  menuFontFamilies,
  menuLayouts,
  menuLogoShapes,
  menuNavStyles,
  menuSurfaces,
} from '../lib/types';
import { readDB, updateDB } from '../services/demo';

/** Contraste WCAG entre dos colores `#rrggbb`. */
function contrast(a: string, b: string) {
  const luminance = (hex: string) => {
    const channels = [1, 3, 5]
      .map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255)
      .map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

function setupWizard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={queryClient}>
      <BusinessMenuWizard />
    </QueryClientProvider>,
  );
  return user;
}

/** Abre el paso «Diseño» del configurador. */
async function openDesign(user: ReturnType<typeof setupWizard>) {
  await screen.findByRole('heading', { name: 'Mi menú' });
  await user.click(screen.getByRole('button', { name: /Diseño/ }));
  return screen.findByRole('group', { name: 'Estilos de menú' });
}

function setupMenu() {
  const slug = readDB()
    .business.name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/${slug}`]}>
        <Routes>
          <Route path="/:businessSlug" element={<MenuPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe('Plantillas de menú', () => {
  it('ofrece al menos doce diseños distintos con todas sus piezas', () => {
    expect(menuTemplates.length).toBeGreaterThanOrEqual(12);

    const ids = new Set(menuTemplates.map((template) => template.id));
    expect(ids.size).toBe(menuTemplates.length);
    expect(new Set(menuTemplates.map((template) => template.primaryColor)).size).toBe(
      menuTemplates.length,
    );
    // Cada plantilla declara un grupo que la interfaz sabe mostrar.
    for (const template of menuTemplates) {
      expect(menuTemplateGroups).toContain(template.group);
    }
    // Los cuatro grupos tienen al menos una plantilla.
    for (const group of menuTemplateGroups) {
      expect(menuTemplates.some((template) => template.group === group)).toBe(true);
    }
  });

  it('usa valores que la API y el menú público aceptan', () => {
    for (const template of menuTemplates) {
      expect(template.primaryColor).toMatch(/^#[0-9a-f]{6}$/);
      expect(template.secondaryColor).toMatch(/^#[0-9a-f]{6}$/);
      expect(menuFontFamilies).toContain(template.fontFamily);
      expect(fontOptions.map((font) => font.id)).toContain(template.fontFamily);
      expect(menuDensities).toContain(template.menuStyle);
      expect(menuLayouts).toContain(template.layout);
      expect(menuLogoShapes).toContain(template.logoShape);
      expect(menuCardStyles).toContain(template.cardStyle);
      expect(menuSurfaces).toContain(template.surface);
      expect(menuNavStyles).toContain(template.navStyle);
    }
    // Los menús oscuros usan tinta clara y el resto tinta oscura.
    expect(logoShapeClass.circle).toContain('rounded-full');
    expect(logoShapeClass.square).not.toBe(logoShapeClass.circle);
    expect(cardStyleClass.flat).not.toBe(cardStyleClass.soft);
  });

  it('mantiene los acentos legibles sobre el fondo que les toca', () => {
    for (const template of menuTemplates) {
      const theme = menuTheme(template);
      // El texto principal se lee sobre el fondo del menú y sobre las tarjetas.
      expect(contrast(theme.ink, theme.card)).toBeGreaterThanOrEqual(4.5);
      if (template.surface === 'tinted') continue;
      expect(contrast(theme.ink, theme.surface)).toBeGreaterThanOrEqual(4.5);
      // El acento se usa como texto y como botón con `onPrimary` encima.
      expect(contrast(template.primaryColor, theme.onPrimary)).toBeGreaterThanOrEqual(4.5);
      // Y como etiqueta sobre la tarjeta del platillo.
      expect(contrast(template.primaryColor, theme.card)).toBeGreaterThanOrEqual(4.5);
      // Los diálogos son blancos: su acento nunca queda por debajo del mínimo.
      expect(contrast(theme.accentOnLight, '#ffffff')).toBeGreaterThanOrEqual(4.5);
      expect(theme.surfaceVeil.length).toBeGreaterThan(3);
    }
  });

  it('expone listas de ajustes con una opción por cada valor posible', () => {
    expect(menuLayoutOptions.map((option) => option.value)).toEqual([...menuLayouts]);
    expect(menuLogoShapeOptions.map((option) => option.value)).toEqual([...menuLogoShapes]);
    expect(menuCardStyleOptions.map((option) => option.value)).toEqual([...menuCardStyles]);
    expect(menuSurfaceOptions.map((option) => option.value)).toEqual([...menuSurfaces]);
    expect(menuNavStyleOptions.map((option) => option.value)).toEqual([...menuNavStyles]);
    for (const option of [
      ...menuLayoutOptions,
      ...menuLogoShapeOptions,
      ...menuCardStyleOptions,
      ...menuSurfaceOptions,
      ...menuNavStyleOptions,
    ]) {
      expect(option.label.length).toBeGreaterThan(2);
      expect(option.description.length).toBeGreaterThan(8);
    }
  });

  it('reconoce la plantilla del diseño actual y tolera diseños incompletos', () => {
    for (const template of menuTemplates) {
      expect(menuTemplateFor(menuTemplateValues(template))).toBe(template);
    }
    const [first] = menuTemplates;
    // Los hex se comparan sin importar mayúsculas.
    expect(
      menuTemplateFor({
        ...menuTemplateValues(first),
        primaryColor: first.primaryColor.toUpperCase(),
      }),
    ).toBe(first);
    // Cambiar cualquier pieza deja de coincidir: pasa a ser un diseño propio.
    expect(menuTemplateFor({ ...menuTemplateValues(first), surface: 'dark' })).toBeUndefined();
    expect(menuTemplateFor({ ...menuTemplateValues(first), logoShape: 'square' })).toBeUndefined();

    // Un menú guardado antes de estos ajustes conserva su paleta y gana el diseño por defecto.
    const legacy = resolveMenuDesign({ primaryColor: '#2399A0', menuStyle: 'compact' });
    expect(legacy.primaryColor).toBe('#2399A0');
    expect(legacy.menuStyle).toBe('compact');
    expect(legacy.layout).toBe('spotlight');
    expect(legacy.surface).toBe('light');
  });
});

describe('Configurador de diseños', () => {
  it('muestra todas las plantillas agrupadas y los ajustes completos', async () => {
    const user = setupWizard();
    const group = await openDesign(user);

    for (const template of menuTemplates) {
      expect(screen.getByRole('button', { name: `Estilo ${template.label}` })).toBeInTheDocument();
    }
    for (const groupName of menuTemplateGroups) {
      expect(screen.getByRole('heading', { name: groupName })).toBeInTheDocument();
    }
    expect(group).toBeInTheDocument();

    const custom = screen.getByRole('button', { name: 'Personalizar el diseño del menú' });
    // El negocio del demo tiene una paleta propia: los controles ya están abiertos.
    expect(custom).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Tipografía')).toBeInTheDocument();
    expect(screen.getByLabelText('Color principal')).toBeInTheDocument();
    expect(screen.getByLabelText('Color secundario')).toBeInTheDocument();
    for (const label of [
      /^Portada/,
      /^Forma del logo/,
      /^Fondo del menú/,
      /^Estilo de tarjetas/,
      /^Estilo de categorías/,
    ]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    expect(screen.getByLabelText(/^Espacioso/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Compacto/)).toBeInTheDocument();
  });

  it('aplica la plantilla completa y la guarda con el contrato del menú', async () => {
    const user = setupWizard();
    await openDesign(user);

    const template = menuTemplates.find((item) => item.surface === 'dark')!;
    await user.click(screen.getByRole('button', { name: `Estilo ${template.label}` }));

    expect(screen.getByRole('button', { name: `Estilo ${template.label}` })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    // Con una plantilla aplicada el paso queda limpio: sin tipografía ni colores.
    expect(screen.queryByLabelText('Tipografía')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Color principal')).not.toBeInTheDocument();
    expect(screen.getByText(template.description)).toBeInTheDocument();

    // La vista previa refleja el diseño sin guardar todavía.
    const preview = screen.getByTestId('menu-design-preview');
    expect(preview).toHaveAttribute('data-surface', template.surface);
    expect(preview).toHaveAttribute('data-layout', template.layout);
    expect(preview).toHaveAttribute('data-logo-shape', template.logoShape);
    expect(preview).toHaveAttribute('data-card-style', template.cardStyle);
    expect(preview).toHaveAttribute('data-nav-style', template.navStyle);
    expect(preview.style.getPropertyValue('--restaurant-primary')).toBe(template.primaryColor);
    expect(preview.style.getPropertyValue('--restaurant-soft')).toBe(template.secondaryColor);

    // Al cambiar de paso se guarda todo el diseño.
    await user.click(screen.getByRole('button', { name: /Servicio/ }));
    await screen.findByText('Días de servicio');
    const saved = readDB().business;
    expect(saved.primaryColor).toBe(template.primaryColor);
    expect(saved.secondaryColor).toBe(template.secondaryColor);
    expect(saved.fontFamily).toBe(template.fontFamily);
    expect(saved.menuStyle).toBe(template.menuStyle);
    expect(saved.menuLayout).toBe(template.layout);
    expect(saved.menuLogoShape).toBe(template.logoShape);
    expect(saved.menuCardStyle).toBe(template.cardStyle);
    expect(saved.menuSurface).toBe(template.surface);
    expect(saved.menuNavStyle).toBe(template.navStyle);
  });

  it('permite ajustar cada pieza por separado desde «Personalizar»', async () => {
    const user = setupWizard();
    await openDesign(user);

    const template = menuTemplates.find((item) => item.menuStyle === 'compact')!;
    await user.click(screen.getByRole('button', { name: `Estilo ${template.label}` }));
    expect(screen.queryByLabelText('Tipografía')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Personalizar el diseño del menú' }));

    const font = screen.getByLabelText('Tipografía');
    expect(font.querySelectorAll('option')).toHaveLength(6);
    expect(screen.getByLabelText(/^Compacto/)).toBeChecked();
    // Partir de una plantilla no borra nada: solo muestra los controles.
    expect((font as HTMLSelectElement).value).toBe(template.fontFamily);

    await user.selectOptions(screen.getByLabelText(/^Forma del logo/), 'square');
    await user.selectOptions(screen.getByLabelText(/^Fondo del menú/), 'dark');
    await user.selectOptions(screen.getByLabelText(/^Portada/), 'poster');
    await user.selectOptions(screen.getByLabelText(/^Estilo de tarjetas/), 'flat');
    await user.selectOptions(screen.getByLabelText(/^Estilo de categorías/), 'cards');

    const preview = screen.getByTestId('menu-design-preview');
    expect(preview).toHaveAttribute('data-logo-shape', 'square');
    expect(preview).toHaveAttribute('data-surface', 'dark');
    expect(preview).toHaveAttribute('data-layout', 'poster');
    expect(preview).toHaveAttribute('data-card-style', 'flat');
    expect(preview).toHaveAttribute('data-nav-style', 'cards');
  });
});

describe('Menú público con diseños', () => {
  it('pinta el menú con los ajustes guardados del negocio', async () => {
    updateDB((db) => {
      db.business = {
        ...db.business,
        menuSurface: 'dark',
        menuLayout: 'poster',
        menuLogoShape: 'square',
        menuCardStyle: 'bold',
        menuNavStyle: 'tabs',
        menuStyle: 'compact',
      };
    });
    setupMenu();

    await screen.findByRole('heading', { name: readDB().business.name });
    const page = document.querySelector('[data-menu-surface]') as HTMLElement;
    expect(page).toHaveAttribute('data-menu-surface', 'dark');
    expect(page).toHaveAttribute('data-menu-layout', 'poster');
    expect(page).toHaveAttribute('data-menu-logo', 'square');
    expect(page).toHaveAttribute('data-menu-cards', 'bold');
    // Las tarjetas y las categorías siguen siendo accesibles.
    expect(screen.getAllByRole('article').length).toBeGreaterThan(0);
    expect(screen.getByRole('navigation', { name: 'Categorías del menú' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cafetería/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
});
