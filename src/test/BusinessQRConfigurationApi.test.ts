import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import AxiosMockAdapter from 'axios-mock-adapter';

vi.stubEnv('VITE_DATA_MODE', 'api');
vi.resetModules();

const { http } = await import('../services/http');
const { api } = await import('../services/api');
const apiMock = new AxiosMockAdapter(http);

afterAll(() => vi.unstubAllEnvs());
beforeEach(() => apiMock.reset());

describe('Configuración del QR del negocio', () => {
  it('guarda solo las opciones del QR en el endpoint dedicado', async () => {
    apiMock.onPut('/business/configurations/qr-code').reply(200, { ok: true });

    await api.saveBusinessQRConfiguration({
      content: 'https://ejemplo.test/menu',
      foreground: '#000000',
      background: '#FFFFFF',
      eyeColor: '#000000',
      bodyStyle: 'dots',
      eyeFrameStyle: 'rounded',
      eyeStyle: 'dot',
      size: 1024,
    });

    expect(apiMock.history.put).toHaveLength(1);
    expect(apiMock.history.put[0].url).toBe('/business/configurations/qr-code');
    expect(JSON.parse(apiMock.history.put[0].data)).toEqual({
      qr_content: 'https://ejemplo.test/menu',
      qr_foreground: '#000000',
      qr_background: '#FFFFFF',
      qr_eye_color: '#000000',
      qr_logo: null,
      qr_body_style: 'dots',
      qr_eye_frame_style: 'rounded',
      qr_eye_style: 'dot',
      qr_size: 1024,
    });
  });
});
