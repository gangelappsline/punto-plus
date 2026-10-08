import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { LoginCredentials, RegisterInput } from '../services/auth';
import { useAuth } from '../stores/auth';
import { isTokenExpired } from './tokenStorage';

/**
 * La sesión también es una consulta de TanStack Query: reponerla tras una
 * recarga (refresh de Passport + `GET /api/me`), iniciar sesión, registrarse y
 * salir viven aquí, con la misma caché que el resto de los datos.
 *
 * El `access_token` en sí se guarda en `tokenStorage` y se refleja en el store
 * de Zustand: es lo que leen los guards para decidir si un panel es accesible.
 */
export const sessionKey = ['session'] as const;

/**
 * Recupera la sesión guardada. Solo se ejecuta cuando hace falta red: falta el
 * perfil del usuario (login de Passport sin `user`) o el access token ya venció
 * y hay que renovarlo con el refresh token.
 */
export function useSession() {
  const accessToken = useAuth((s) => s.accessToken);
  const expiresAt = useAuth((s) => s.expiresAt);
  const hasUser = useAuth((s) => s.user !== null);
  const needsRestore = Boolean(accessToken) && (!hasUser || isTokenExpired({ expiresAt }));
  return useQuery({
    queryKey: sessionKey,
    queryFn: () => api.restore(),
    enabled: needsRestore,
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

/** `anonymous` (sin token) · `restoring` (validando) · `ready` (con token). */
export type SessionStatus = 'anonymous' | 'restoring' | 'ready';

export function useSessionStatus(): SessionStatus {
  const accessToken = useAuth((s) => s.accessToken);
  const { isLoading } = useSession();
  if (!accessToken) return 'anonymous';
  return isLoading ? 'restoring' : 'ready';
}

export function useLogin() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (credentials: LoginCredentials) => api.login(credentials),
    onSuccess: (session) => {
      // Ningún dato de la cuenta anterior debe sobrevivir al cambio de sesión.
      client.clear();
      client.setQueryData(sessionKey, session);
    },
  });
}

export function useRegister() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterInput) => api.register(input),
    onSuccess: (session) => {
      client.clear();
      client.setQueryData(sessionKey, session);
    },
  });
}

export function useLogout() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api.logout(),
    onSettled: () => {
      // `api.logout` ya borra los tokens; aquí se va la caché de datos privados.
      client.clear();
    },
  });
}
