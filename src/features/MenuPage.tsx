import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { readDB } from '../services/demo';
import { api } from '../services/api';
import { isDemo } from '../lib/utils';
import { Button } from '../components/ui/button';

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'negocio'
  );
}

/** Menú digital público: cualquiera con el QR puede verlo, sin iniciar sesión. */
export function MenuPage() {
  const { businessId } = useParams<{ businessId: string }>();
  const business = useQuery({
    queryKey: ['menu', businessId],
    queryFn: async () => {
      if (isDemo) {
        const db = readDB();
        const expected = slugify(db.business.name);
        if (businessId !== expected && businessId !== 'negocio' && businessId !== 'demo')
          throw new Error('Menú no disponible.');
        return db.business;
      }
      return api.business();
    },
    retry: false,
  });

  const data = business.data;
  if (business.isPending)
    return (
      <div className="menu-state" role="status">
        <p>Preparando el menú…</p>
      </div>
    );
  if (business.isError || !data)
    return (
      <div className="menu-state">
        <h1>Este menú no está disponible</h1>
        <p>
          {isDemo
            ? 'El negocio no existe en esta demostración o su menú aún no se publica.'
            : 'El menú público necesita un endpoint sin sesión. Mientras tanto, pide el menú en el negocio.'}
        </p>
        <Button variant="outline" onClick={() => void business.refetch()}>
          Volver a intentar
        </Button>
      </div>
    );
  const primary = data.primaryColor || '#2399A0';
  const secondary = data.secondaryColor || '#F5BE8B';
  const menuUrl = `${window.location.origin}/menu/${slugify(data.name)}`;
  const categories = data.categories?.filter(Boolean) ?? [];
  const items = data.menuItems?.filter((item) => item.name?.trim()) ?? [];

  return (
    <div className="menu-page">
      <header className="menu-header" style={{ backgroundColor: secondary }}>
        {data.banner && <img src={data.banner} alt="Banner" className="menu-banner" />}
        <div className="menu-brand">
          {data.logo && <img src={data.logo} alt="Logo" className="menu-logo" />}
          <h1>{data.name}</h1>
          <div className="menu-categories">
            {categories.map((category) => (
              <span key={category} className="menu-category" style={{ borderColor: primary }}>
                {category}
              </span>
            ))}
          </div>
        </div>
      </header>
      <main className="menu-body">
        <div className="menu-intro">
          <QrCode size={20} />
          <span>Menú digital de {data.name}</span>
        </div>
        {items.length ? (
          <div className="menu-list">
            {items.map((item) => (
              <article key={item.id} className="menu-item">
                <div>
                  <h3>{item.name}</h3>
                  {item.description && <p className="menu-description">{item.description}</p>}
                </div>
                {item.price && (
                  <span className="menu-price" style={{ color: primary }}>
                    ${item.price}
                  </span>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="menu-empty">El menú aún no tiene platos publicados. Vuelve pronto.</p>
        )}
        <div className="menu-qr">
          <QRCodeSVG
            value={menuUrl}
            size={220}
            level="M"
            marginSize={2}
            fgColor={primary}
            bgColor={secondary}
          />
          <p className="menu-qr-label">Escanea para ver el menú</p>
          <p className="menu-qr-url">{menuUrl}</p>
        </div>
      </main>
      <footer className="menu-footer">
        <Button onClick={() => window.print()}>Imprimir menú</Button>
        <span className="menu-footer-note">Menú digital de Punto Plus · {data.name}</span>
      </footer>
    </div>
  );
}
