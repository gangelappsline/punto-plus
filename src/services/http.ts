import axios, { type InternalAxiosRequestConfig } from 'axios';
import { z } from 'zod';
import { useAuth } from '../stores/auth';
export const baseURL = import.meta.env.VITE_API_BASE_URL || 'https://api.punto-plus.com.mx';
export const http = axios.create({ baseURL, timeout: 15000, withCredentials: true });
const refreshClient = axios.create({ baseURL, timeout: 15000, withCredentials: true });
let refreshPromise: Promise<string> | null = null;
export function refreshAccessToken() {
  if (!refreshPromise)
    refreshPromise = refreshClient
      .post('/auth/refresh')
      .then(({ data }) => {
        const { accessToken } = z.object({ accessToken: z.string().min(1) }).parse(data);
        useAuth.getState().setToken(accessToken);
        return accessToken;
      })
      .catch((error: unknown) => {
        useAuth.getState().clear();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  return refreshPromise;
}
http.interceptors.request.use((config) => {
  const token = useAuth.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
http.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error);
    const config = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (
      error.response?.status === 401 &&
      config &&
      !config._retry &&
      !config.url?.startsWith('/auth/')
    ) {
      config._retry = true;
      try {
        const token = await refreshAccessToken();
        config.headers.Authorization = `Bearer ${token}`;
        return http(config);
      } catch {
        return Promise.reject(new Error('Tu sesión expiró. Inicia sesión de nuevo.'));
      }
    }
    if (error.response?.status === 401 && config?._retry) useAuth.getState().clear();
    const message =
      error.response?.status === 403
        ? 'No tienes permiso para realizar esta acción.'
        : error.response?.status === 429
          ? 'Demasiados intentos. Espera un momento.'
          : !error.response
            ? 'No pudimos conectar con Punto Plus. Revisa tu conexión.'
            : 'No se pudo completar la operación. Inténtalo de nuevo.';
    return Promise.reject(new Error(message));
  },
);
