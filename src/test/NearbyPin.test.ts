import { describe, expect, it, vi } from 'vitest';
import { businessInitial, createBusinessPin, createUserDot } from '../components/nearbyPin';
import type { NearbyBusiness } from '../lib/types';

const business: NearbyBusiness = {
  id: 'b1',
  name: 'Café Avellaneda',
  category: 'Cafetería',
  logo: 'https://example.com/logo.png',
  latitude: 19.4326,
  longitude: -99.1332,
  location: 'Roma Norte, CDMX',
  distanceKm: 0.35,
  hasCard: true,
  activeLoyaltyCardsCount: 1,
  activePromotionsCount: 0,
  isActive: true,
};

describe('Marcador del negocio en Google Maps', () => {
  it('usa un pin redondeado con el logo del negocio', () => {
    const pin = createBusinessPin(business, () => undefined);

    expect(pin).toHaveAttribute('aria-label', 'Ver información de Café Avellaneda');
    expect(pin).toHaveAttribute('title', 'Café Avellaneda');
    expect(pin).toHaveAttribute('data-business-id', 'b1');
    expect(pin.querySelector('.pp-map-pin-bubble img')).toHaveAttribute(
      'src',
      'https://example.com/logo.png',
    );
    expect(pin.querySelector('.pp-map-pin-tail')).not.toBeNull();
  });

  it('muestra la inicial cuando el negocio no tiene logo', () => {
    const pin = createBusinessPin({ ...business, logo: undefined }, () => undefined);

    expect(pin.querySelector('.pp-map-pin-bubble img')).toBeNull();
    expect(pin.querySelector('.pp-map-pin-bubble b')).toHaveTextContent('C');
    expect(businessInitial('   ')).toBe('P');
  });

  it('abre la información del negocio al hacer clic en el marcador', () => {
    const onSelect = vi.fn();
    const pin = createBusinessPin(business, onSelect);

    pin.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('dibuja el punto del cliente con su pulso', () => {
    const dot = createUserDot();
    expect(dot).toHaveClass('pp-map-user');
    expect(dot.firstElementChild).not.toBeNull();
  });
});
