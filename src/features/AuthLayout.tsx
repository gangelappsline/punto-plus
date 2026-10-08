import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/images/logo_2.webp';

interface AuthLayoutProps {
  /** Imagen del panel lateral (public/images). */
  photo: string;
  photoAlt: string;
  headline: ReactNode;
  tagline: string;
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  /** Más ancho para formularios largos, como el registro. */
  wide?: boolean;
  children: ReactNode;
}

/** Columna de marca + formulario. Compartido por login y registro. */
export function AuthLayout({
  photo,
  photoAlt,
  headline,
  tagline,
  eyebrow,
  title,
  description,
  wide = false,
  children,
}: AuthLayoutProps) {
  return (
    <main className="login-page">
      <div className="login-photo">
        <img src={photo} alt={photoAlt} />
        <div>
          <img src={logo} alt="Punto Plus" />
          <h1>{headline}</h1>
          <p>{tagline}</p>
        </div>
      </div>
      <div className={`login-content ${wide ? 'wide' : ''}`}>
        <Link to="/" className="brand" aria-label="Punto Plus · Inicio">
          <img src={logo} alt="Punto Plus" />
        </Link>
        <div className="eyebrow">{eyebrow}</div>
        <h2>{title}</h2>
        <p className="muted">{description}</p>
        {children}
      </div>
    </main>
  );
}
