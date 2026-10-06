import { afterEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';
import { useAuth } from '../stores/auth';
const createSpy = vi.spyOn(axios, 'create');
const { http } = await import('../services/http');
const refresh = createSpy.mock.results[1].value;
const apiMock = new AxiosMockAdapter(http);
const refreshMock = new AxiosMockAdapter(refresh, { delayResponse: 10 });
const user = { id: 'u1', name: 'Sofía', email: 'sofia@example.com', role: 'customer' as const };
afterEach(() => {
  apiMock.reset();
  refreshMock.reset();
  useAuth.getState().clear();
});
describe('Cliente HTTP', () => {
  it('adjunta el token a las peticiones', async () => {
    useAuth.getState().setSession(user, 'access-token');
    apiMock.onGet('/cards').reply(200, []);
    await http.get('/cards');
    expect(apiMock.history.get[0].headers?.Authorization).toBe('Bearer access-token');
  });
  it('comparte un único refresh entre peticiones concurrentes', async () => {
    useAuth.getState().setSession(user, 'old');
    apiMock.onGet('/cards').replyOnce(401).onGet('/cards').reply(200, []);
    apiMock.onGet('/promotions').replyOnce(401).onGet('/promotions').reply(200, []);
    refreshMock.onPost('/auth/refresh').reply(200, { accessToken: 'new-token' });
    await Promise.all([http.get('/cards'), http.get('/promotions')]);
    expect(refreshMock.history.post).toHaveLength(1);
    expect(useAuth.getState().accessToken).toBe('new-token');
    expect(
      apiMock.history.get.slice(2).every((r) => r.headers?.Authorization === 'Bearer new-token'),
    ).toBe(true);
  });
  it('limpia la sesión si el refresh falla', async () => {
    useAuth.getState().setSession(user, 'expired');
    apiMock.onGet('/cards').reply(401);
    refreshMock.onPost('/auth/refresh').reply(401);
    await expect(http.get('/cards')).rejects.toThrow('Tu sesión expiró');
    expect(useAuth.getState().user).toBeNull();
  });
  it('no refresca un fallo de credenciales ni entra en un bucle', async () => {
    apiMock.onPost('/auth/login').reply(401);
    await expect(http.post('/auth/login')).rejects.toThrow();
    expect(refreshMock.history.post).toHaveLength(0);
  });
  it('limita el reintento a uno aunque vuelva a responder 401', async () => {
    apiMock.onGet('/cards').reply(401);
    refreshMock.onPost('/auth/refresh').reply(200, { accessToken: 'invalid' });
    await expect(http.get('/cards')).rejects.toThrow();
    expect(apiMock.history.get).toHaveLength(2);
    expect(refreshMock.history.post).toHaveLength(1);
  });
});
