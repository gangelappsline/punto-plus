import type { NearbyBusiness } from '../lib/types';

export interface MapCoordinates {
  latitude: number;
  longitude: number;
}

/** Inicial del negocio, usada cuando no hay logo disponible. */
export function businessInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || 'P';
}

/**
 * Marcador de Google Maps: pin redondeado con fondo blanco y el logo del
 * negocio. Se construye con DOM (no con HTML en cadena) para no inyectar
 * contenido del negocio como markup.
 */
export function createBusinessPin(business: NearbyBusiness, onSelect: () => void) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'pp-map-marker';
  button.dataset.businessId = business.id;
  button.title = business.name;
  button.setAttribute('aria-label', `Ver información de ${business.name}`);

  const pin = document.createElement('span');
  pin.className = 'pp-map-pin';

  const bubble = document.createElement('span');
  bubble.className = 'pp-map-pin-bubble';

  const initial = document.createElement('b');
  initial.textContent = businessInitial(business.name);
  initial.setAttribute('aria-hidden', 'true');
  bubble.appendChild(initial);

  if (business.logo) {
    const logo = document.createElement('img');
    logo.src = business.logo;
    logo.alt = '';
    logo.loading = 'lazy';
    logo.decoding = 'async';
    // Si el logo falla se deja ver la inicial del negocio.
    logo.addEventListener('error', () => logo.remove());
    bubble.appendChild(logo);
  }

  const tail = document.createElement('span');
  tail.className = 'pp-map-pin-tail';
  tail.setAttribute('aria-hidden', 'true');

  pin.append(bubble, tail);
  button.appendChild(pin);
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    onSelect();
  });
  return button;
}

/** Punto de la ubicación del cliente sobre el mapa. */
export function createUserDot() {
  const dot = document.createElement('span');
  dot.className = 'pp-map-user';
  dot.setAttribute('aria-hidden', 'true');
  dot.appendChild(document.createElement('span'));
  return dot;
}

export function hasCoordinates(
  business: NearbyBusiness,
): business is NearbyBusiness & { latitude: number; longitude: number } {
  return typeof business.latitude === 'number' && typeof business.longitude === 'number';
}
