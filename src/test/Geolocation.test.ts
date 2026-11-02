import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  readLocationPermission,
  readStoredLocation,
  rememberLocationDenied,
  storeLocation,
  wasLocationDenied,
} from '../lib/geolocation';

const stubPermission = (state: PermissionState | null) => {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition: vi.fn() },
  });
  Object.defineProperty(navigator, 'permissions', {
    configurable: true,
    value: state === null ? undefined : { query: vi.fn().mockResolvedValue({ state }) },
  });
};

describe('Permiso de ubicación del cliente', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(navigator, 'permissions', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined });
  });

  it('guarda las coordenadas y olvida una negativa anterior', () => {
    rememberLocationDenied();
    expect(wasLocationDenied()).toBe(true);

    storeLocation({ latitude: 19.4326, longitude: -99.1332 });

    expect(wasLocationDenied()).toBe(false);
    expect(readStoredLocation()).toEqual({ latitude: 19.4326, longitude: -99.1332 });
  });

  it('ignora coordenadas guardadas con formato inválido', () => {
    localStorage.setItem('punto-plus:location', '{"latitude":"norte","longitude":null}');
    expect(readStoredLocation()).toBeNull();
    localStorage.setItem('punto-plus:location', 'sin-json');
    expect(readStoredLocation()).toBeNull();
  });

  it('recuerda la negativa cuando el navegador también la reporta', async () => {
    stubPermission('denied');
    expect(await readLocationPermission()).toBe('denied');
    expect(wasLocationDenied()).toBe(true);
  });

  it('mantiene el permiso concedido aunque no haya coordenadas en caché', async () => {
    stubPermission('granted');
    expect(await readLocationPermission()).toBe('granted');
    expect(wasLocationDenied()).toBe(false);
  });

  it('usa la negativa guardada cuando el navegador no expone la Permissions API', async () => {
    stubPermission(null);
    rememberLocationDenied();
    expect(await readLocationPermission()).toBe('denied');

    storeLocation({ latitude: 19.4326, longitude: -99.1332 });
    expect(await readLocationPermission()).toBe('unknown');
  });
});
