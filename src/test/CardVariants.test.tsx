import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoyaltyCard } from '../components/LoyaltyCard';
import { PromotionCard } from '../components/PromotionCard';
import type { LoyaltyCard as Card, Promotion } from '../lib/types';

const baseCard: Card = {
  id: 'card-1',
  businessId: 'business-1',
  name: 'Café Aurora',
  category: 'Cafetería',
  tagline: 'Café de especialidad del barrio',
  reward: 'Café gratis',
  stamps: 4,
  goal: 8,
  theme: 'forest',
  icon: 'coffee',
  location: 'Roma Norte',
  distance: '1.2 km',
  joined: true,
};

const promotion: Promotion = {
  id: 'promo-1',
  business: 'Café Aurora',
  businessId: 'business-1',
  expires: '2026-12-31',
  title: '2x1 en café de especialidad',
  description: 'Todos los martes',
  image: '/images/coffee.webp',
  badge: 'Martes',
  category: 'Cafetería',
  type: 'simple',
};

describe('Tarjeta de lealtad sin clases CSS propias', () => {
  it('dibuja los sellos completados y los pendientes', () => {
    render(<LoyaltyCard card={baseCard} onClick={() => undefined} />);

    const grid = document.querySelector('[data-stamp-grid]') as HTMLElement;
    expect(grid).toHaveAttribute('aria-label', '4 de 8 sellos');
    expect(grid.children).toHaveLength(8);
    // Los cuatro primeros van rellenos (con el icono del negocio) y el último es el regalo.
    expect(grid.children[0].querySelector('svg')).not.toBeNull();
    expect(grid.children[7].querySelector('svg')).not.toBeNull();
    expect(grid.children[5].textContent).toBe('6');
  });

  it('marca el contexto de uso para ajustar el tamaño de la tarjeta', () => {
    const { container, rerender } = render(
      <LoyaltyCard card={baseCard} onClick={() => undefined} variant="dialog" />,
    );
    const card = container.querySelector('[data-loyalty-card]') as HTMLElement;
    expect(card).toHaveAttribute('data-variant', 'dialog');

    rerender(<LoyaltyCard card={baseCard} onClick={() => undefined} variant="preview" />);
    expect(container.querySelector('[data-loyalty-card]')).toHaveAttribute(
      'data-variant',
      'preview',
    );
  });

  it('aplica los colores del tema como variables en la propia tarjeta', () => {
    const { container } = render(<LoyaltyCard card={baseCard} onClick={() => undefined} />);

    const card = container.querySelector('[data-loyalty-card]') as HTMLElement;
    expect(card.style.getPropertyValue('--card-bg')).toBe('#254865');
    expect(card.style.getPropertyValue('--card-muted')).toContain('color-mix');
    expect(card.style.getPropertyValue('--stamp-border')).toContain('color-mix');
  });
});

describe('Tarjeta de promoción', () => {
  it('muestra negocio, título, categoría y el botón de favoritos', () => {
    render(
      <PromotionCard
        promotion={promotion}
        favorite
        onClick={() => undefined}
        onFavorite={() => {}}
      />,
    );

    expect(screen.getByText('Café Aurora')).toBeInTheDocument();
    expect(screen.getByText('2x1 en café de especialidad')).toBeInTheDocument();
    expect(screen.getByText('Martes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /favoritos: Café Aurora/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      screen.getByRole('button', { name: 'Ver promoción de Café Aurora' }),
    ).toBeInTheDocument();
  });
});
