import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AppSplash } from '../components/AppSplash';
import { useSessionStatus } from '../lib/session';
import { isDemo, panelAllows, panelForPath, panelPathFor, type Panel } from '../lib/utils';
import { useAuth } from '../stores/auth';

/**
 * Protección de los paneles.
 *
 * Cada panel (cliente en `/app`, negocio en `/admin`) es un layout
 * independiente y se monta detrás de `PanelGate`. Con la API real la entrada
 * exige el token guardado al iniciar sesión:
 *
 * - sin token → `/login`, recordando la ruta pedida en `state.from`;
 * - token vigente pero sin perfil → `/login` (no sabríamos a qué panel enviar);
 * - token de un rol que no corresponde → su propio panel.
 *
 * La validez se resuelve en local (token presente y no vencido); cuando el
 * token venció, `useSession` intenta renovarlo con el refresh token antes de
 * decidir, y el interceptor de Axios cierra la sesión ante un 401 definitivo.
 * En modo demo los paneles siguen abiertos: los datos son locales y no hay
 * sesión real que proteger.
 */
export function PanelGate({ panel, children }: { panel: Panel; children: ReactNode }) {
  const status = useSessionStatus();
  const user = useAuth((s) => s.user);
  const location = useLocation();
  const from = `${location.pathname}${location.search}`;

  if (isDemo) return <>{children}</>;
  if (status === 'restoring') return <AppSplash message="Recuperando tu sesión…" />;
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from }} />;
  if (!user) return <Navigate to="/login" replace state={{ from, expired: true }} />;
  if (!panelAllows(panel, user.role)) return <Navigate to={panelPathFor(user.role)} replace />;
  return <>{children}</>;
}

/** Rutas públicas de acceso: con la sesión iniciada ya no tienen sentido. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const status = useSessionStatus();
  const user = useAuth((s) => s.user);
  const location = useLocation();

  if (isDemo || status !== 'ready' || !user) return <>{children}</>;
  const from = (location.state as { from?: string } | null)?.from ?? '';
  const panel = panelForPath(from);
  const target = panel && panelAllows(panel, user.role) ? from : panelPathFor(user.role);
  return <Navigate to={target} replace />;
}
