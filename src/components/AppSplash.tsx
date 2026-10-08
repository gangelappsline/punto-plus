/** Pantalla de espera compartida: arranque, rutas diferidas y recuperación de sesión. */
export function AppSplash({ message = 'Un momento…' }: { message?: string }) {
  return (
    <div className="app-loading" role="status" aria-live="polite">
      <img src="/icon.svg" alt="Punto Plus" />
      <p>{message}</p>
    </div>
  );
}
