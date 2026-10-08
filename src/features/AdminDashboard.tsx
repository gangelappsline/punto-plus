import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Gift,
  Heart,
  LayoutDashboard,
  Megaphone,
  Palette,
  ScanLine,
  Stamp,
  Store,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useLoyalty, usePromotions } from '../lib/queries';
import { isDemo } from '../lib/utils';
import { Button } from '../components/ui/button';

/** Resumen del panel de negocio: indicadores, actividad reciente y accesos. */
export function AdminDashboard() {
  const { cards, activity } = useLoyalty();
  const promotions = usePromotions();
  const cardsList = cards.data || [];
  const totalStamps = cardsList.reduce((sum, c) => sum + c.stamps, 0);
  const kpis = [
    {
      icon: Store,
      tone: 'blue',
      value: cards.isSuccess ? cardsList.length : '—',
      label: 'Negocios en la comunidad',
    },
    {
      icon: Stamp,
      tone: 'green',
      value: cards.isSuccess ? totalStamps : '—',
      label: 'Sellos acumulados',
    },
    {
      icon: Megaphone,
      tone: 'orange',
      value: promotions.isSuccess ? promotions.data.length : '—',
      label: 'Promociones activas',
    },
    {
      icon: Heart,
      tone: 'purple',
      value: activity.isSuccess ? activity.data.length : '—',
      label: 'Movimientos recientes',
    },
  ];
  const actions = [
    {
      icon: ScanLine,
      title: 'Registrar una compra',
      text: 'Escanea el QR de un cliente y agrégale un sello en segundos.',
    },
    {
      icon: Megaphone,
      title: 'Publicar una promoción',
      text: 'Comparte algo bueno con tu comunidad, con condiciones y vigencia.',
    },
    {
      icon: Palette,
      title: 'Dale tu personalidad',
      text: 'Ajusta el nombre, la recompensa y el estilo de la tarjeta de tu negocio.',
    },
  ];
  return (
    <>
      <div className="page-intro">
        <div>
          <div className="eyebrow">
            <LayoutDashboard size={14} /> PANEL DE ADMINISTRACIÓN
          </div>
          <h1>
            Tu comunidad, <span>bajo control.</span>
          </h1>
          <p>Sigue de cerca las tarjetas, los sellos y las promociones de tu negocio.</p>
        </div>
      </div>
      <div className="admin-kpi-strip" aria-label="Indicadores del negocio">
        {kpis.map(({ icon: Icon, tone, value, label }) => (
          <div className="admin-kpi" key={label}>
            <div className="kpi-top">
              <span className={`stat-icon ${tone}`}>
                <Icon size={20} />
              </span>
            </div>
            <strong>{value}</strong>
            <small>{label}</small>
          </div>
        ))}
      </div>
      <div className="admin-dashboard-grid">
        <section className="section" style={{ marginBottom: 0 }}>
          <div className="section-title">
            <h2>Actividad reciente</h2>
            <span className="text-link subtle-link">Movimientos de los últimos días</span>
          </div>
          {activity.isPending ? (
            <p className="muted">Cargando movimientos…</p>
          ) : (
            <div className="activity-list">
              {activity.data?.slice(0, 6).map((a) => (
                <div className="activity-item" key={a.id}>
                  <span
                    className={`stat-icon ${
                      a.type === 'reward' ? 'purple' : a.type === 'stamp' ? 'green' : 'orange'
                    }`}
                  >
                    {a.type === 'reward' ? (
                      <Gift size={20} />
                    ) : a.type === 'stamp' ? (
                      <Stamp size={20} />
                    ) : (
                      <Heart size={20} />
                    )}
                  </span>
                  <div>
                    <h3>{a.title}</h3>
                    <p>
                      {a.business}{' '}
                      <span>· {format(new Date(a.date), 'd MMM, HH:mm', { locale: es })}</span>
                    </p>
                  </div>
                </div>
              ))}
              {activity.isSuccess && !activity.data.length && (
                <p className="muted" style={{ padding: 18 }}>
                  Aún no hay movimientos. Registra la primera compra de tu comunidad.
                </p>
              )}
            </div>
          )}
        </section>
        <div>
          {actions.map(({ icon: Icon, title, text }) => (
            <div className="admin-action-card" key={title}>
              <div className="flex items-center gap-3" style={{ marginBottom: 4 }}>
                <span className="stat-icon orange">
                  <Icon size={20} />
                </span>
                <h3>{title}</h3>
              </div>
              <p>{text}</p>
              <Button size="sm" asChild>
                <Link to="/admin/negocio">
                  Abrir mi negocio <ArrowUpRight size={14} />
                </Link>
              </Button>
            </div>
          ))}
          {isDemo && (
            <div className="notice" style={{ marginTop: 14 }}>
              <strong>Estás en modo demostración.</strong>
              <p>
                Estos datos son ficticios y se guardan solo en este navegador. Se activa con
                VITE_DATA_MODE=demo; sin él, el panel consume la API real.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
