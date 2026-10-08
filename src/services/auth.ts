import { isDemo } from '../lib/utils';
import type { User } from '../lib/types';
import {
  findTokenSource,
  extractUser,
  parseUser,
  isTokenExpired,
  type StoredSession,
} from '../lib/tokenStorage';
import { hydrateAuthOnce, useAuth } from '../stores/auth';
import { http, refreshAccessToken } from './http';
import { authConfig, loginBody, tokenRequestHeaders } from './authConfig';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterBusinessInput {
  businessName: string;
  category: string;
  phone?: string;
  address?: string;
  city?: string;
  rfc?: string;
  description?: string;
}

export interface RegisterInput extends LoginCredentials {
  role: 'customer' | 'business';
  name: string;
  phone?: string;
  business?: RegisterBusinessInput;
}

/**
 * `GET /api/me` (o la ruta configurada) para obtener el usuario del Bearer token.
 * Tolera envoltorios `{ data: … }` y roles del backend en español o sinónimos.
 */
export async function fetchProfile(): Promise<User> {
  const { data } = await http.get(authConfig.profilePath);
  const user = parseUser(data);
  if (!user) throw new Error('La API no devolvió un usuario válido.');
  return user;
}

/**
 * Inicio de sesión contra Laravel Passport.
 * Guarda access_token, refresh_token, token_type y la expiración calculada desde
 * `expires_in`, más el usuario, y devuelve la sesión ya persistida.
 */
export async function login(credentials: LoginCredentials): Promise<StoredSession> {
  if (isDemo) return demoSession(credentials.email);
  // Sin client_id el password grant de Passport fallaría con un 400 poco claro.
  if (authConfig.loginMode === 'passport' && !authConfig.passportClientId)
    throw new Error(
      'Falta VITE_PASSPORT_CLIENT_ID para iniciar sesión con Passport. ' +
        'Defínelo o usa VITE_AUTH_LOGIN_MODE=json con el controlador propio del backend.',
    );

  const body = loginBody(credentials);
  const { data } = await http.post(authConfig.loginPath, body, {
    headers: tokenRequestHeaders(body),
  });

  const user = extractUser(data);
  const session = useAuth.getState().saveSession(data, user);

  // El password grant de Passport no devuelve el usuario: lo pedimos con el Bearer guardado.
  if (!user) {
    const profile = await fetchProfile().catch(() => null);
    if (profile) {
      useAuth.getState().setUser(profile);
      return { ...session, user: profile };
    }
  }
  return session;
}

/**
 * Alta de cuentas. Clientes y negocios usan el mismo endpoint; el backend
 * distingue con el campo `role` y el bloque `business`.
 */
export async function register(input: RegisterInput): Promise<StoredSession> {
  const payload = buildRegisterPayload(input);
  if (isDemo) return demoSession(input.email, input.role, input.name);

  const { data } = await http.post(authConfig.registerPath, payload, {
    headers: tokenRequestHeaders(null),
  });

  // Algunos backends devuelven los tokens al registrar; otros solo la cuenta creada.
  if (findTokenSource(data)) {
    const user = extractUser(data) ?? {
      id: payload.email,
      name: payload.name,
      email: payload.email,
      role: payload.role,
    };
    return useAuth.getState().saveSession(data, user);
  }
  // Sin tokens en la respuesta: iniciamos sesión para dejar al usuario dentro.
  return login({ email: payload.email, password: input.password });
}

/** Payload de registro: plano para clientes, con el bloque `business` para negocios. */
export function buildRegisterPayload(input: RegisterInput) {
  const base = {
    role: input.role,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    password: input.password,
    password_confirmation: input.password,
    phone: input.phone?.trim() || undefined,
  };
  if (input.role !== 'business' || !input.business) return base;
  return {
    ...base,
    business: {
      name: input.business.businessName.trim(),
      category: input.business.category,
      phone: input.business.phone?.trim() || undefined,
      address: input.business.address?.trim() || undefined,
      city: input.business.city?.trim() || undefined,
      rfc: input.business.rfc?.trim().toUpperCase() || undefined,
      description: input.business.description?.trim() || undefined,
    },
  };
}

/** Cierra la sesión en el servidor (si existe la ruta) y borra los tokens locales. */
export async function logout() {
  try {
    await http.post(authConfig.logoutPath, {}, { headers: tokenRequestHeaders(null) });
  } finally {
    useAuth.getState().clear();
  }
}

/** Repone la sesión al recargar: tokens guardados, refresh si expiraron y perfil. */
export async function restore(): Promise<StoredSession> {
  const stored = hydrateAuthOnce();
  if (!stored?.accessToken) {
    useAuth.getState().clear();
    throw new Error('No hay sesión guardada.');
  }
  if (isTokenExpired(stored)) {
    if (!stored.refreshToken) {
      useAuth.getState().clear();
      throw new Error('Tu sesión expiró.');
    }
    await refreshAccessToken();
  }
  if (!stored.user) {
    const profile = await fetchProfile();
    useAuth.getState().setUser(profile);
    const current = hydrateAuthOnce();
    return { ...stored, user: profile, accessToken: current?.accessToken ?? stored.accessToken };
  }
  return stored;
}

/** Sesión local del modo demo: ningún dato sale del navegador. */
export function demoSession(email: string, role?: User['role'], name?: string): StoredSession {
  const inferred: User['role'] =
    role ??
    (/admin/.test(email)
      ? 'admin'
      : /(negocio|business|empresa)/.test(email)
        ? 'business'
        : 'customer');
  const fallbackName = (email.split('@')[0] || 'Invitado').replace(/[._-]+/g, ' ');
  const user: User = {
    id: `demo-${email}`,
    name: name?.trim() || fallbackName,
    email,
    role: inferred,
  };
  return useAuth.getState().saveSession(
    {
      token_type: 'Bearer',
      access_token: 'punto-plus-demo-access-token',
      refresh_token: 'punto-plus-demo-refresh-token',
      expires_in: 3600,
    },
    user,
  );
}
