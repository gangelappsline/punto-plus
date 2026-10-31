import { ArrowUpRight, Building2, ShieldCheck, Tags, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { isDemo } from '../lib/utils';
import { useAuth } from '../stores/auth';

/** Inicio del panel de administración de plataforma, independiente del panel de negocio. */
export function AdminDashboard() {
  const user = useAuth((state) => state.user);
  return (
    <>
      <div className="page-intro">
        <div>
          <div className="eyebrow">
            <ShieldCheck size={14} /> ADMINISTRACIÓN DE PLATAFORMA
          </div>
          <h1>
            Hola, <span>{user?.name.split(' ')[0] ?? 'administrador'}.</span>
          </h1>
          <p>Este espacio está reservado para las tareas de administración de Punto Plus.</p>
        </div>
      </div>
      <div className="admin-dashboard-grid">
        <section className="section" style={{ marginBottom: 0 }}>
          <div className="section-title">
            <h2>Tu acceso</h2>
          </div>
          <div className="activity-list">
            <div className="activity-item">
              <span className="stat-icon blue">
                <ShieldCheck size={20} />
              </span>
              <div>
                <h3>Rol de administrador</h3>
                <p>La sesión está identificada con permisos de administración.</p>
              </div>
            </div>
            <div className="activity-item">
              <span className="stat-icon green">
                <Users size={20} />
              </span>
              <div>
                <h3>Panel independiente</h3>
                <p>Tu navegación y tus funciones están separadas de clientes y negocios.</p>
              </div>
            </div>
          </div>
        </section>
        <section className="section" style={{ marginBottom: 0 }}>
          <div className="section-title">
            <h2>Áreas de plataforma</h2>
          </div>
          <div className="admin-action-card">
            <div className="flex items-center gap-3">
              <span className="stat-icon orange">
                <Building2 size={20} />
              </span>
              <h3>Negocios</h3>
            </div>
            <p>
              La gestión del perfil comercial corresponde al panel independiente de cada negocio.
            </p>
            <Link to="/" className="text-link subtle-link">
              Volver al sitio <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="admin-action-card">
            <div className="flex items-center gap-3">
              <span className="stat-icon purple">
                <Tags size={20} />
              </span>
              <h3>Categorías del menú</h3>
            </div>
            <p>Administra el nombre y el icono que identifican cada categoría.</p>
            <Link to="/admin/categorias" className="text-link subtle-link">
              Administrar categorías <ArrowUpRight size={14} />
            </Link>
          </div>
        </section>
      </div>
      {isDemo && (
        <div className="notice" style={{ marginTop: 20 }}>
          <strong>Modo demostración.</strong>
          <p>
            La información de administración se limita a esta vista; no se han conectado operaciones
            de plataforma a la API.
          </p>
        </div>
      )}
    </>
  );
}
