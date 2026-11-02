import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it } from 'vitest';
import { BusinessMenuWizard } from '../features/BusinessMenuWizard';
import { menuStylePresetFor, menuStylePresetValues, menuStylePresets } from '../lib/menuStyles';
import { fontOptions } from '../components/LoyaltyCard';
import { menuFontFamilies } from '../lib/types';
import { readDB } from '../services/demo';

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

function setup() {
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
async function openDesign(user: ReturnType<typeof setup>) {
  await screen.findByRole('heading', { name: 'Mi menú' });
  await user.click(screen.getByRole('button', { name: /Diseño/ }));
  return screen.findByRole('group', { name: 'Estilos de menú' });
}

beforeEach(() => {
  localStorage.clear();
});

describe('Estilos de menú precargados', () => {
  it('ofrece entre cinco y ocho estilos, todos combinables con los ajustes existentes', () => {
    expect(menuStylePresets.length).toBeGreaterThanOrEqual(5);
    expect(menuStylePresets.length).toBeLessThanOrEqual(8);

    const ids = new Set(menuStylePresets.map((preset) => preset.id));
    const designs = new Set(menuStylePresets.map((preset) => preset.primaryColor));
    expect(ids.size).toBe(menuStylePresets.length);
    expect(designs.size).toBe(menuStylePresets.length);

    for (const preset of menuStylePresets) {
      expect(preset.primaryColor).toMatch(/^#[0-9a-f]{6}$/);
      expect(preset.secondaryColor).toMatch(/^#[0-9a-f]{6}$/);
      // Tipografía y presentación deben ser valores que la API ya acepta.
      expect(menuFontFamilies).toContain(preset.fontFamily);
      expect(fontOptions.map((font) => font.id)).toContain(preset.fontFamily);
      expect(['cozy', 'compact']).toContain(preset.menuStyle);
      // El color principal se usa con texto blanco (botones) y sobre fondo claro.
      expect(contrast(preset.primaryColor, '#ffffff')).toBeGreaterThanOrEqual(4.5);
      expect(Math.abs(contrast(preset.primaryColor, preset.secondaryColor))).toBeGreaterThan(3);
    }
  });

  it('reconoce el diseño actual y devuelve sus ajustes', () => {
    const preset = menuStylePresets[1];

    expect(menuStylePresetFor(menuStylePresetValues(preset))).toBe(preset);
    // Los hex se comparan sin importar mayúsculas.
    expect(
      menuStylePresetFor({
        ...menuStylePresetValues(preset),
        primaryColor: preset.primaryColor.toUpperCase(),
      }),
    ).toBe(preset);
    // Cualquier cambio propio deja de coincidir: se trata como personalizado.
    expect(
      menuStylePresetFor({ ...menuStylePresetValues(preset), menuStyle: 'compact' }),
    ).toBeUndefined();
  });

  it('muestra los estilos y abre los ajustes completos al elegir «Personalizar»', async () => {
    const user = setup();
    const group = await openDesign(user);

    for (const preset of menuStylePresets) {
      expect(screen.getByRole('button', { name: `Estilo ${preset.label}` })).toBeInTheDocument();
    }
    expect(group).toBeInTheDocument();
    const custom = screen.getByRole('button', { name: 'Personalizar el diseño del menú' });

    // El negocio del demo tiene una paleta propia: los controles ya están abiertos.
    expect(custom).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Tipografía')).toBeInTheDocument();
    expect(screen.getByLabelText('Color principal')).toBeInTheDocument();
    expect(screen.getByLabelText('Color secundario')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Espacioso/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Compacto/)).toBeInTheDocument();
  });

  it('aplica el estilo elegido y esconde los ajustes para configurar en un toque', async () => {
    const user = setup();
    await openDesign(user);

    const preset = menuStylePresets[0];
    await user.click(screen.getByRole('button', { name: `Estilo ${preset.label}` }));

    expect(screen.getByRole('button', { name: `Estilo ${preset.label}` })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    // Con un estilo aplicado el paso queda limpio: sin tipografía ni colores.
    expect(screen.queryByLabelText('Tipografía')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Color principal')).not.toBeInTheDocument();
    expect(screen.getByText(preset.description)).toBeInTheDocument();

    // La vista previa refleja el estilo sin guardar todavía.
    const preview = document.querySelector('.business-live-device') as HTMLElement;
    expect(preview.style.getPropertyValue('--restaurant-primary')).toBe(preset.primaryColor);
    expect(preview.style.getPropertyValue('--restaurant-soft')).toBe(preset.secondaryColor);

    // Al cambiar de paso se guarda con el contrato de siempre.
    await user.click(screen.getByRole('button', { name: /Servicio/ }));
    await screen.findByText('Días de servicio');
    const saved = readDB().business;
    expect(saved.primaryColor).toBe(preset.primaryColor);
    expect(saved.secondaryColor).toBe(preset.secondaryColor);
    expect(saved.fontFamily).toBe(preset.fontFamily);
    expect(saved.menuStyle).toBe(preset.menuStyle);
  });

  it('vuelve a abrir los ajustes al pedir «Personalizar» después de un estilo', async () => {
    const user = setup();
    await openDesign(user);

    await user.click(screen.getByRole('button', { name: `Estilo ${menuStylePresets[2].label}` }));
    expect(screen.queryByLabelText('Tipografía')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Personalizar el diseño del menú' }));

    const font = screen.getByLabelText('Tipografía');
    expect(font.querySelectorAll('option')).toHaveLength(6);
    expect(screen.getByLabelText(/^Compacto/)).toBeChecked();
    // Partir de un estilo no borra nada: solo muestra los controles.
    expect((font as HTMLSelectElement).value).toBe(menuStylePresets[2].fontFamily);
  });
});
