/**
 * Endpoints de autenticación.
 *
 * La API es Laravel + Passport, así que el flujo por defecto es el Password Grant
 * de Passport (`POST /oauth/token`), que responde con
 * `{ token_type, expires_in, access_token, refresh_token }`.
 *
 * Si el backend expone su propio controlador de login/registro (lo recomendable para
 * una SPA, porque así el client_secret nunca llega al navegador), basta con cambiar
 * estas variables de entorno sin tocar el código:
 *
 *   VITE_AUTH_LOGIN_MODE=json
 *   VITE_AUTH_LOGIN_PATH=/api/login
 *   VITE_AUTH_REFRESH_PATH=/api/refresh
 *   VITE_AUTH_REGISTER_PATH=/api/register
 */

const env = import.meta.env;

export type LoginMode = 'passport' | 'json';

function path(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

export const authConfig = {
  /** `passport` → POST al token endpoint de Passport. `json` → controlador propio. */
  loginMode:
    ((env.VITE_AUTH_LOGIN_MODE || 'passport') as LoginMode).toLowerCase() === 'json'
      ? 'json'
      : 'passport',
  /** Passport: `/oauth/token`. Controlador propio: `/api/login`, `/auth/login`… */
  loginPath: path(env.VITE_AUTH_LOGIN_PATH, '/oauth/token'),
  refreshPath: path(env.VITE_AUTH_REFRESH_PATH, '/oauth/token'),
  registerPath: path(env.VITE_AUTH_REGISTER_PATH, '/api/register'),
  logoutPath: path(env.VITE_AUTH_LOGOUT_PATH, '/api/logout'),
  profilePath: path(env.VITE_AUTH_PROFILE_PATH, '/api/me'),
  /** Solo para password grant: el client_id de Passport. */
  passportClientId: env.VITE_PASSPORT_CLIENT_ID || '',
  passportClientSecret: env.VITE_PASSPORT_CLIENT_SECRET || '',
  passportScope: env.VITE_PASSPORT_SCOPE || '',
} as const;

/** Rutas de autenticación: nunca se les aplica el reintento con refresh. */
const AUTH_PATH_PREFIXES = ['/oauth/', '/auth/', '/login', '/logout', '/register', '/password'];

export function isAuthPath(url?: string) {
  if (!url) return false;
  const clean = url.replace(/^https?:\/\/[^/]+/, '');
  return AUTH_PATH_PREFIXES.some(
    (prefix) => clean === prefix.slice(0, -1) || clean.startsWith(prefix),
  );
}

/** Cuerpo de login según el modo configurado. */
export function loginBody(credentials: { email: string; password: string }) {
  if (authConfig.loginMode === 'json') return { ...credentials };
  const params = new URLSearchParams({
    grant_type: 'password',
    client_id: authConfig.passportClientId,
    username: credentials.email,
    password: credentials.password,
    scope: authConfig.passportScope,
  });
  if (authConfig.passportClientSecret) params.set('client_secret', authConfig.passportClientSecret);
  return params;
}

/** Cuerpo del refresh token grant de Passport (o `{ refresh_token }` en modo json). */
export function refreshBody(refreshToken: string) {
  if (authConfig.loginMode === 'json') return { refresh_token: refreshToken };
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: authConfig.passportClientId,
    scope: authConfig.passportScope,
  });
  if (authConfig.passportClientSecret) params.set('client_secret', authConfig.passportClientSecret);
  return params;
}

/** Passport espera form-urlencoded en `/oauth/token`. */
export function tokenRequestHeaders(body: unknown) {
  return body instanceof URLSearchParams
    ? { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }
    : { Accept: 'application/json' };
}
