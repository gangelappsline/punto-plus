import { create } from 'zustand';
import type { User } from '../lib/types';
import {
  clearStoredSession,
  normalizeTokenResponse,
  readStoredSession,
  saveStoredSession,
  type StoredSession,
} from '../lib/tokenStorage';

export interface TokenMeta {
  refreshToken?: string | null;
  tokenType?: string;
  expiresAt?: number | null;
  scope?: string | null;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  tokenType: string;
  expiresAt: number | null;
  /** Sesión completa (login real): normaliza la respuesta de la API y la persiste. */
  saveSession: (payload: unknown, user?: User | null, now?: number) => StoredSession;
  /** Repone la sesión desde el almacenamiento al recargar la app. */
  hydrate: () => StoredSession | null;
  /** Compatibilidad con usos internos/tests: fija usuario y access token. */
  setSession: (user: User, accessToken: string, meta?: TokenMeta) => void;
  /** Tras un refresh de Passport: guarda access token y refresh token rotado. */
  setTokens: (payload: unknown, now?: number) => StoredSession | null;
  setUser: (user: User | null) => void;
  clear: () => void;
}

const anonymous: Pick<AuthState, 'user' | 'accessToken' | 'refreshToken' | 'expiresAt'> = {
  user: null,
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
};

export const useAuth = create<AuthState>((set, get) => ({
  ...anonymous,
  tokenType: 'Bearer',
  saveSession: (payload, user = null, now = Date.now()) => {
    const tokens = normalizeTokenResponse(payload, now);
    const session = saveStoredSession({ ...tokens, user, storedAt: now });
    set({
      user: session.user,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      tokenType: session.tokenType,
      expiresAt: session.expiresAt,
    });
    return session;
  },
  hydrate: () => {
    const session = readStoredSession();
    if (!session) return null;
    set({
      user: session.user,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      tokenType: session.tokenType,
      expiresAt: session.expiresAt,
    });
    return session;
  },
  setSession: (user, accessToken, meta) => {
    const expiresAt = meta?.expiresAt ?? null;
    const refreshToken = meta?.refreshToken ?? null;
    const tokenType = meta?.tokenType ?? 'Bearer';
    const scope = meta?.scope ?? null;
    saveStoredSession({
      accessToken,
      refreshToken,
      tokenType,
      expiresAt,
      scope,
      user,
      storedAt: Date.now(),
    });
    set({ user, accessToken, refreshToken, tokenType, expiresAt });
  },
  setTokens: (payload, now = Date.now()) => {
    const current = get();
    const tokens = normalizeTokenResponse(payload, now);
    const session = saveStoredSession({
      ...tokens,
      // Passport rota ambos tokens; si solo llega el de acceso, conservamos el refresh vigente.
      refreshToken: tokens.refreshToken ?? current.refreshToken,
      user: current.user,
      storedAt: now,
    });
    set({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      tokenType: session.tokenType,
      expiresAt: session.expiresAt,
    });
    return session;
  },
  setUser: (user) => {
    const current = readStoredSession();
    if (current) saveStoredSession({ ...current, user });
    set({ user });
  },
  clear: () => {
    clearStoredSession();
    set({ ...anonymous, tokenType: 'Bearer' });
  },
}));

/** Restaura la sesión guardada una sola vez al arrancar la app. */
let hydrated = false;
export function hydrateAuthOnce(): StoredSession | null {
  if (hydrated) return readStoredSession();
  hydrated = true;
  return useAuth.getState().hydrate();
}

export const demoUser: User = {
  id: 'demo-sofia',
  name: 'Sofía García',
  email: 'sofia@example.com',
  role: 'customer',
};
