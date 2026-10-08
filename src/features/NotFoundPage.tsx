import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import logo from '../assets/images/logo_2.webp';

/** Ruta inexistente: devuelve al inicio o al panel de cliente. */
export function NotFoundPage() {
  return (
    <div className="not-found">
      <img src={logo} alt="Punto Plus" className="not-found-logo" />
      <h1>Nos salimos del barrio.</h1>
      <p>Esta página no existe, pero tus favoritos siguen aquí.</p>
      <div className="not-found-actions">
        <Button asChild>
          <Link to="/">Ir al inicio</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/app">Mis tarjetas</Link>
        </Button>
      </div>
    </div>
  );
}
