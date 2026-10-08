import axios, { type InternalAxiosRequestConfig } from 'axios';
import { useAuth } from '../stores/auth';
import { isTokenExpired } from '../lib/tokenStorage';
import { authConfig, isAuthPath, refreshBody, tokenRequestHeaders } from './authConfig';

export const baseURL = import.meta.env.VITE_API_BASE_URL || 'https://api.punto-plus.com.mx';
export const http = axios.create({ baseURL, timeout: 15000, withCredentials: true });
const refreshClient = axios.create({ baseURL, timeout: 15000, withCredentials: true });

/** Error de la API con el detalle que necesitan los formularios (422 de Laravel). */
export class ApiError extends Error {
  status: number;
  /** Errores por campo devueltos por Laravel: `{ email: ['El correo ya está registrado.'] }`. */
  fieldErrors: Record<string, string[]>;
  payload: unknown;
  constructor(
    message: string,
    status: number,
    payload?: unknown,
    fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
    this.fieldErrors = fieldErrors ?? {};
  }
}

function readFieldErrors(payload: unknown): Record<string, string[]> {
  if (typeof payload !== 'object' || payload === null) return {};
  const errors = (payload as { errors?: unknown }).errors;
  if (typeof errors !== 'object' || errors === null) return {};
  const result: Record<string, string[]> = {};
  for (const [field, value] of Object.entries(errors as Record<string, unknown>)) {
    if (Array.isArray(value))
      result[field] = value.filter((v): v is string => typeof v === 'string');
    else if (typeof value === 'string') result[field] = [value];
  }
  return result;
}

function describe(error: {
  response?: { status: number; data?: unknown };
  config?: { url?: string };
}) {
  const status = error.response?.status ?? 0;
  const data = error.response?.data as { message?: string; error?: string } | undefined;
  const fieldErrors = readFieldErrors(error.response?.data);
  if (status === 400 && data?.error?.startsWith('invalid'))
    return new ApiError('Correo o contraseña incorrectos.', status, data, fieldErrors);
  if (status === 401)
    return new ApiError(
      isAuthPath(error.config?.url)
        ? data?.message || 'Correo o contraseña incorrectos.'
        : 'Tu sesión expiró. Inicia sesión de nuevo.',
      status,
      data,
      fieldErrors,
    );
  if (status === 403)
    return new ApiError('No tienes permiso para realizar esta acción.', status, data, fieldErrors);
  if (status === 404)
    return new ApiError('El recurso no existe en la API.', status, data, fieldErrors);
  if (status === 409)
    return new ApiError(data?.message || 'Esa cuenta ya existe.', status, data, fieldErrors);
  if (status === 422)
    return new ApiError(
      data?.message || 'Revisa los datos del formulario.',
      status,
      data,
      fieldErrors,
    );
  if (status === 429)
    return new ApiError('Demasiados intentos. Espera un momento.', status, data, fieldErrors);
  if (status >= 500)
    return new ApiError(
      'El servidor tuvo un problema. Inténtalo en un momento.',
      status,
      data,
      fieldErrors,
    );
  if (!status)
    return new ApiError('No pudimos conectar con Punto Plus. Revisa tu conexión.', 0, data);
  return new ApiError(
    data?.message || 'No se pudo completar la operación. Inténtalo de nuevo.',
    status,
    data,
    fieldErrors,
  );
}

let refreshPromise: Promise<string> | null = null;

/** Pide un access token nuevo usando el refresh token de Passport. */
export function refreshAccessToken() {
  if (!refreshPromise) {
    const { refreshToken } = useAuth.getState();
    const request = refreshToken
      ? refreshClient.post(authConfig.refreshPath, refreshBody(refreshToken), {
          headers: tokenRequestHeaders(refreshBody(refreshToken)),
        })
      : refreshClient.post('/auth/refresh');
    refreshPromise = request
      .then(({ data }) => {
        const session = useAuth.getState().setTokens(data);
        if (!session) throw new Error('Sesión no disponible.');
        return session.accessToken;
      })
      .catch((error: unknown) => {
        useAuth.getState().clear();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

http.interceptors.request.use(async (config) => {
  const state = useAuth.getState();
  let token = state.accessToken;
  // El access token de Passport caduca: si sabemos que expiró y hay refresh token, renovamos antes.
  if (token && state.refreshToken && !isAuthPath(config.url) && isTokenExpired(state)) {
    try {
      token = await refreshAccessToken();
    } catch {
      token = useAuth.getState().accessToken;
    }
  }
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error);
    const config = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const status = error.response?.status;
    if (status === 401 && config && !config._retry && !isAuthPath(config.url)) {
      config._retry = true;
      try {
        const token = await refreshAccessToken();
        config.headers.Authorization = `Bearer ${token}`;
        return http(config);
      } catch {
        useAuth.getState().clear();
        return Promise.reject(new Error('Tu sesión expiró. Inicia sesión de nuevo.'));
      }
    }
    if (status === 401 && config?._retry) useAuth.getState().clear();
    return Promise.reject(describe(error));
  },
);
