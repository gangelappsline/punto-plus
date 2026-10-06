import { ArrowUpRight, Heart, MapPin } from 'lucide-react';
import type { Promotion } from '../lib/types';
export function PromotionCard({
  promotion: p,
  favorite,
  onFavorite,
  onClick,
  pending,
}: {
  promotion: Promotion;
  favorite: boolean;
  onFavorite: () => void;
  onClick: () => void;
  pending?: boolean;
}) {
  return (
    <article className="promotion-card">
      <div className="promotion-image">
        <button
          className="image-link"
          onClick={onClick}
          aria-label={`Ver promoción de ${p.business}`}
        >
          <img
            src={p.image}
            alt={
              p.category === 'Cafetería'
                ? 'Cappuccinos con arte latte en una mesa de café'
                : p.category === 'Panadería'
                  ? 'Pan artesanal recién horneado'
                  : 'Matcha helado en una cafetería'
            }
            loading="lazy"
          />
        </button>
        <span className="promotion-badge">{p.badge}</span>
        <button
          className={`favorite-button ${favorite ? 'is-favorite' : ''}`}
          onClick={onFavorite}
          aria-label={`${favorite ? 'Quitar de' : 'Guardar en'} favoritos: ${p.business}`}
          aria-pressed={favorite}
          disabled={pending}
        >
          <Heart size={17} fill={favorite ? 'currentColor' : 'none'} />
        </button>
      </div>
      <button className="promotion-info" onClick={onClick}>
        <div className="promotion-business">
          {p.business}
          <ArrowUpRight size={17} />
        </div>
        <h3>{p.title}</h3>
        <span>
          <MapPin size={12} /> Ciudad de México <i /> {p.category}
        </span>
      </button>
    </article>
  );
}
