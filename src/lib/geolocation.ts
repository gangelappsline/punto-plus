/**
 * Utilidades de ubicación del cliente.
 *
 * El navegador es quien decide si vuelve a pedir permiso; aquí solo evitamos
 * disparar la petición cuando el cliente ya lo negó y guardamos las últimas
 * coordenadas para que "Cerca de mí" pinte el mapa al instante en la siguiente
 * visita, sin volver a preguntar.
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export type LocationPermission = 'granted' | 'denied' | 'prompt' | 'unknown';

export type LocationFailure = 'denied' | 'unavailable';

const LOCATION_STORAGE_KEY = 'punto-plus:location';
const DENIED_STORAGE_KEY = 'punto-plus:location-denied';

const isValidCoordinate = (latitude: unknown, longitude: unknown) =>
  typeof latitude === 'number' &&
  typeof longitude === 'number' &&
  Number.isFinite(latitude) &&
  Number.isFinite(longitude) &&
  Math.abs(latitude) <= 90 &&
  Math.abs(longitude) <= 180;

function readStorage(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* El almacenamiento puede estar bloqueado (modo privado, cuotas): seguimos sin caché. */
  }
}

export function readStoredLocation(): Coordinates | null {
  const raw = readStorage(LOCATION_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { latitude?: unknown; longitude?: unknown };
    return isValidCoordinate(parsed.latitude, parsed.longitude)
      ? { latitude: parsed.latitude as number, longitude: parsed.longitude as number }
      : null;
  } catch {
    return null;
  }
}

export function storeLocation(coordinates: Coordinates) {
  if (!isValidCoordinate(coordinates.latitude, coordinates.longitude)) return;
  writeStorage(
    LOCATION_STORAGE_KEY,
    JSON.stringify({
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      savedAt: Date.now(),
    }),
  );
  writeStorage(DENIED_STORAGE_KEY, 'false');
}

/** El cliente negó el permiso: no volvemos a lanzar la petición automáticamente. */
export function rememberLocationDenied() {
  writeStorage(DENIED_STORAGE_KEY, 'true');
}

export function forgotLocationDenied() {
  writeStorage(DENIED_STORAGE_KEY, 'false');
}

export function wasLocationDenied() {
  return readStorage(DENIED_STORAGE_KEY) === 'true';
}

/**
 * Estado real del permiso. Cuando el navegador no expone la Permissions API
 * (Safari, por ejemplo) se usa el recordatorio local de la última negativa.
 */
export async function readLocationPermission(): Promise<LocationPermission> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return 'unknown';
  if (!navigator.permissions?.query) return wasLocationDenied() ? 'denied' : 'unknown';
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    if (status.state === 'granted') {
      forgotLocationDenied();
      return 'granted';
    }
    if (status.state === 'denied') {
      rememberLocationDenied();
      return 'denied';
    }
    return 'prompt';
  } catch {
    return wasLocationDenied() ? 'denied' : 'unknown';
  }
}

/** Pide las coordenadas actuales. Nunca lanza: devuelve el motivo del fallo. */
export function requestCoordinates(): Promise<
  | { coordinates: Coordinates; failure?: undefined }
  | { coordinates?: undefined; failure: LocationFailure }
> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve({ failure: 'unavailable' });
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({ coordinates: { latitude: coords.latitude, longitude: coords.longitude } }),
      (error) =>
        resolve({ failure: error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable' }),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  });
}
