import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoyaltyCard, brandThemeList, brandThemeOptions } from '../components/LoyaltyCard';
import {
  closestThemeTo,
  loyaltyCardThemeColors,
  loyaltyCardThemeGroups,
  loyaltyCardThemeLabels,
  loyaltyCardThemes,
  readableInkColor,
} from '../lib/types';
import type { LoyaltyCard as Card } from '../lib/types';

const baseCard: Card = {
  id: 'preview',
  businessId: 'b1',
  name: 'Café Aurora',
  category: 'Cafetería',
  tagline: '',
  reward: 'Café gratis',
  stamps: 3,
  goal: 8,
  theme: 'terracotta',
  icon: 'coffee',
  location: 'Ciudad de México',
  distance: '',
  joined: true,
};

describe('Paleta de fondos de la tarjeta', () => {
  it('ofrece una paleta amplia agrupada por familias, sin repetir temas', () => {
    const grouped = loyaltyCardThemeGroups.flatMap((group) => group.themes);

    expect(loyaltyCardThemes.length).toBeGreaterThanOrEqual(30);
    expect(grouped).toEqual([...loyaltyCardThemes]);
    expect(new Set(grouped).size).toBe(grouped.length);
    expect(brandThemeList).toHaveLength(loyaltyCardThemes.length);
    expect(brandThemeOptions.map((group) => group.label)).toEqual(
      loyaltyCardThemeGroups.map((group) => group.label),
    );
  });

  it('cada tema tiene fondo, tinta, sello y color del icono del sello', () => {
    for (const theme of loyaltyCardThemes) {
      const colors = loyaltyCardThemeColors[theme];
      expect(colors.primaryColor).toMatch(/^#[\da-f]{6}$/i);
      expect(colors.secondaryColor).toMatch(/^#[\da-f]{6}$/i);
      expect(colors.textColor).toMatch(/^#[\da-f]{6}$/i);
      expect(colors.stampIconColor).toMatch(/^#[\da-f]{6}$/i);
      expect(loyaltyCardThemeLabels[theme]?.length).toBeGreaterThan(2);
    }
  });

  it('reconoce el tema de un color existente y calcula una tinta legible', () => {
    expect(closestThemeTo('#254865')).toBe('forest');
    expect(closestThemeTo('#0d2a4a')).toBe('navy');
    expect(closestThemeTo('no-es-un-color')).toBeUndefined();

    expect(readableInkColor('#f6f4ef')).toBe('#022f53');
    expect(readableInkColor('#022f53')).toBe('#f1f5f8');
  });
});

describe('Color del icono del sello (stamp_icon_color)', () => {
  it('pinta los sellos completados con el color elegido por el negocio', () => {
    const { container } = render(
      <LoyaltyCard card={{ ...baseCard, stampIconColor: '#ff00aa' }} onClick={() => undefined} />,
    );

    const card = container.querySelector('[data-loyalty-card]') as HTMLElement;
    expect(card.style.getPropertyValue('--stamp-color')).toBe('#ff00aa');
  });

  it('sin color propio conserva el del tema de la paleta', () => {
    const { container } = render(<LoyaltyCard card={baseCard} onClick={() => undefined} />);

    const card = container.querySelector('[data-loyalty-card]') as HTMLElement;
    // Sin `stampIconColor` la variable sale del tema (terracotta), no del CSS.
    expect(card.style.getPropertyValue('--stamp-color')).toBe(
      loyaltyCardThemeColors.terracotta.stampIconColor,
    );
    expect(card.style.getPropertyValue('--card-bg')).toBe(
      loyaltyCardThemeColors.terracotta.primaryColor,
    );
  });

  it('muestra el icono del sello y la recompensa de la tarjeta', () => {
    render(
      <LoyaltyCard card={{ ...baseCard, stampIconColor: '#123456' }} onClick={() => undefined} />,
    );

    expect(screen.getByRole('button', { name: /Ver tarjeta de Café Aurora/ })).toBeInTheDocument();
    expect(screen.getByText('Café gratis')).toBeInTheDocument();
  });
});
