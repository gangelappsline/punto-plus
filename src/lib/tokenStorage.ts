import type { User } from './types';

/**
 * Almacenamiento de la sesión devuelta por la API (Laravel Passport).
 *
 * Passport responde en `POST /oauth/token` con:
 *   { "token_type": "Bearer", "expires_in": 31536000,
 *     "access_token": "eyJ0...", "refresh_token": "def502..." }
 *
 * Muchos backends envuelven esa respuesta (por ejemplo `{ user, authorization: {...} }`)
 * o la devuelven en camelCase. `normalizeTokenResponse` acepta las tres formas y
 * `saveAuthTokens` deja todo guardado y listo para el header `Authorization: Bearer …`.
 */

export const AUTH_STORAGE_KEY = 'punto-plus.auth.v1';
/** Margen para considerar el token vencido antes de tiempo y evitar 401 en vuelo. */
export const EXPIRY_SKEW_MS = 30_000;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string | null;
  tokenType: string;
  /** Momento de expiración en epoch ms; `null` si la API no informó duración. */
  expiresAt: number | null;
  scope: string | null;
}

export interface StoredSession extends AuthTokens {
  user: User | null;
  storedAt: number;
}

type Raw = Record<string, unknown>;

const NESTED_KEYS = [
  'data',
  'authorization',
  'auth',
  'tokens',
  'token',
  'result',
  'payload',
] as const;

function isRecord(value: unknown): value is Raw {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(source: Raw, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function hasAccessToken(source: Raw) {
  return readString(source, ['access_token', 'accessToken', 'token', 'jwt']) !== null;
}

/** Busca el objeto que contiene los tokens, tolerando envoltorios habituales de Laravel. */
export function findTokenSource(payload: unknown, depth = 0): Raw | null {
  if (!isRecord(payload) || depth > 3) return null;
  if (hasAccessToken(payload)) return payload;
  for (const key of NESTED_KEYS) {
    const found = findTokenSource(payload[key], depth + 1);
    if (found) return found;
  }
  return null;
}

function toEpochMs(value: unknown, now: number): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    // Segundos (epoch Unix) vs milisegundos.
    return value < 1e11 ? value * 1000 : value;
  }
  if (typeof value === 'string') {
    const numeric = Number(value);
    if (value.trim() && Number.isFinite(numeric)) return toEpochMs(numeric, now);
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return now;
}

/**
 * Convierte la respuesta cruda de login/refresh en tokens normalizados.
 * Lanza un error legible si la API no devolvió un access token.
 */
export function normalizeTokenResponse(payload: unknown, now = Date.now()): AuthTokens {
  const source = findTokenSource(payload);
  if (!source)
    throw new Error('La respuesta de la API no incluye un access token. Revisa el endpoint.');

  const accessToken = readString(source, ['access_token', 'accessToken', 'token', 'jwt'])!;
  const refreshToken = readString(source, ['refresh_token', 'refreshToken']);
  const tokenType = readString(source, ['token_type', 'tokenType']) ?? 'Bearer';
  const rawScope = source.scope ?? source.scopes;
  const scope = Array.isArray(rawScope)
    ? rawScope.filter((s): s is string => typeof s === 'string').join(' ') || null
    : readString(source, ['scope', 'scopes']);

  const expiresIn = source.expires_in ?? source.expiresIn;
  const expiresAtRaw = source.expires_at ?? source.expiresAt;
  let expiresAt: number | null = null;
  if (typeof expiresIn === 'number' && Number.isFinite(expiresIn))
    expiresAt = now + Math.max(0, expiresIn) * 1000;
  else if (typeof expiresIn === 'string' && expiresIn.trim() && Number.isFinite(Number(expiresIn)))
    expiresAt = now + Math.max(0, Number(expiresIn)) * 1000;
  else if (expiresAtRaw !== undefined && expiresAtRaw !== null)
    expiresAt = toEpochMs(expiresAtRaw, now);

  return { accessToken, refreshToken, tokenType, expiresAt, scope };
}

/**
 * Extrae el usuario si la API lo incluye en la respuesta de login.
 * Devuelve `null` cuando el token llega solo (Passport puro) y hay que pedir `GET /me`.
 */
export function extractUser(payload: unknown, depth = 0): User | null {
  if (!isRecord(payload) || depth > 3) return null;
  const candidate = isRecord(payload.user) ? payload.user : null;
  const user = candidate ? toUser(candidate) : null;
  if (user) return user;
  for (const key of ['data', 'result', 'payload']) {
    const found = extractUser(payload[key], depth + 1);
    if (found) return found;
  }
  return null;
}

/** Convierte un objeto de usuario del backend al `User` de la app. */
export function toUser(source: unknown): User | null {
  if (!isRecord(source)) return null;
  const id = source.id ?? source.user_id ?? source.userId;
  const email = source.email;
  if (id === undefined || email === undefined) return null;
  const name = source.name ?? source.username ?? source.full_name;
  return {
    id: String(id),
    name: typeof name === 'string' && name.trim() ? name : String(email),
    email: String(email),
    role: normalizeRole(source.role ?? source.type ?? source.rol),
  };
}

/** Interpreta la respuesta de `GET /me`, que puede venir envuelta en `data`. */
export function parseUser(payload: unknown): User | null {
  if (!isRecord(payload)) return null;
  return toUser(payload) ?? extractUser(payload);
}

/** Traduce el rol del backend al vocabulario de la app. */
export function normalizeRole(role: unknown): User['role'] {
  const value = typeof role === 'string' ? role.trim().toLowerCase() : '';
  if (['business', 'negocio', 'merchant', 'owner', 'empresa'].includes(value)) return 'business';
  if (['admin', 'administrator', 'administrador', 'superadmin', 'super-admin'].includes(value))
    return 'admin';
  return 'customer'; // incluye "cliente"
}

/* ---------------------------------- storage --------------------------------- */

const memoryFallback = new Map<string, string>();

function getStorage(): Storage | null {
  try {
    const probe = '__punto-plus-probe__';
    globalThis.localStorage.setItem(probe, '1');
    globalThis.localStorage.removeItem(probe);
    return globalThis.localStorage;
  } catch {
    return null; // Navegación privada, cookies bloqueadas o SSR.
  }
}

export function readRaw(): string | null {
  return getStorage()?.getItem(AUTH_STORAGE_KEY) ?? memoryFallback.get(AUTH_STORAGE_KEY) ?? null;
}

/** Lee la sesión guardada. Descarta entradas corruptas o sin access token. */
export function readStoredSession(): StoredSession | null {
  const raw = readRaw();
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || typeof parsed.accessToken !== 'string' || !parsed.accessToken) {
      clearStoredSession();
      return null;
    }
    return {
      accessToken: parsed.accessToken,
      refreshToken: typeof parsed.refreshToken === 'string' ? parsed.refreshToken : null,
      tokenType:
        typeof parsed.tokenType === 'string' && parsed.tokenType ? parsed.tokenType : 'Bearer',
      expiresAt: typeof parsed.expiresAt === 'number' ? parsed.expiresAt : null,
      scope: typeof parsed.scope === 'string' ? parsed.scope : null,
      user: isRecord(parsed.user) ? (parsed.user as User) : null,
      storedAt: typeof parsed.storedAt === 'number' ? parsed.storedAt : Date.now(),
    };
  } catch {
    clearStoredSession();
    return null;
  }
}

/** Escribe la sesión completa (tokens + usuario) en el almacenamiento local. */
export function saveStoredSession(session: StoredSession): StoredSession {
  const payload = JSON.stringify(session);
  getStorage()?.setItem(AUTH_STORAGE_KEY, payload);
  memoryFallback.set(AUTH_STORAGE_KEY, payload);
  return session;
}

/**
 * Punto de entrada principal: recibe tal cual la respuesta de la API al hacer login
 * y deja los tokens normalizados y persistidos.
 */
export function saveAuthTokens(
  payload: unknown,
  user: User | null = null,
  now = Date.now(),
): StoredSession {
  const tokens = normalizeTokenResponse(payload, now);
  const previous = readStoredSession();
  return saveStoredSession({
    ...tokens,
    // Si la API rota solo el access token, conservamos el refresh token vigente.
    refreshToken: tokens.refreshToken ?? previous?.refreshToken ?? null,
    user: user ?? previous?.user ?? null,
    storedAt: now,
  });
}

/** Actualiza parte de la sesión guardada (por ejemplo, tras un refresh). */
export function patchStoredSession(
  patch: Partial<StoredSession>,
  now = Date.now(),
): StoredSession | null {
  const current = readStoredSession();
  if (!current) return null;
  return saveStoredSession({ ...current, ...patch, storedAt: now });
}

export function clearStoredSession() {
  getStorage()?.removeItem(AUTH_STORAGE_KEY);
  memoryFallback.delete(AUTH_STORAGE_KEY);
}

export function getAccessToken(): string | null {
  return readStoredSession()?.accessToken ?? null;
}

export function getRefreshToken(): string | null {
  return readStoredSession()?.refreshToken ?? null;
}

/** `true` cuando el access token ya expiró (o expira dentro del margen de tolerancia). */
export function isTokenExpired(
  session: { expiresAt: number | null } | null | undefined,
  now = Date.now(),
): boolean {
  if (!session?.expiresAt) return false; // Duración desconocida: confiamos en el 401 del servidor.
  return session.expiresAt - EXPIRY_SKEW_MS <= now;
}

/** Header listo para axios/fetch: `Bearer eyJ0…`. */
export function authorizationHeader(token: string | null | undefined): string | undefined {
  return token ? `Bearer ${token}` : undefined;
}
