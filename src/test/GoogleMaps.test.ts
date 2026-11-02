import { afterEach, describe, expect, it, vi } from 'vitest';

describe('Google Maps de "Cerca de mí"', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    delete (window as unknown as { gm_authFailure?: () => void }).gm_authFailure;
  });

  it('sin clave no dibuja ningún proveedor alternativo', async () => {
    vi.resetModules();
    const maps = await import('../lib/googleMaps');

    expect(maps.hasGoogleMapsApiKey).toBe(false);
    expect(maps.googleMapsEmbedUrl({ query: '19.4326,-99.1332' })).toBeNull();
    await expect(maps.loadGoogleMaps()).rejects.toThrow('missing-key');
  });

  it('arma el mapa incrustado de Google con la misma clave', async () => {
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'test-key');
    vi.resetModules();
    const maps = await import('../lib/googleMaps');

    expect(maps.hasGoogleMapsApiKey).toBe(true);
    const url = maps.googleMapsEmbedUrl({ query: '19.4326,-99.1332', zoom: 16 });
    expect(url).toContain('https://www.google.com/maps/embed/v1/search?');
    expect(url).toContain('key=test-key');
    expect(url).toContain('zoom=16');
    expect(url).toContain('language=es');
    expect(new URL(url!).searchParams.get('q')).toBe('19.4326,-99.1332');
    expect(url).not.toContain('openstreetmap');
  });

  it('no intenta cargar la API de Google sin clave', async () => {
    vi.resetModules();
    const maps = await import('../lib/googleMaps');
    const appendSpy = vi.spyOn(document.head, 'appendChild');

    await expect(maps.loadGoogleMaps()).rejects.toThrow('missing-key');
    expect(appendSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ src: expect.stringContaining('maps.googleapis.com') }),
    );
    appendSpy.mockRestore();
  });

  it('avisa cuando Google rechaza la clave para la Maps JavaScript API', async () => {
    vi.resetModules();
    const maps = await import('../lib/googleMaps');
    const notify = vi.fn();
    const unsubscribe = maps.onGoogleMapsAuthFailure(notify);

    (window as unknown as { gm_authFailure: () => void }).gm_authFailure();
    expect(notify).toHaveBeenCalledOnce();

    unsubscribe();
    (window as unknown as { gm_authFailure: () => void }).gm_authFailure();
    expect(notify).toHaveBeenCalledOnce();
  });
});
