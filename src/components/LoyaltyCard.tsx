import { ArrowUpRight, Check, Coffee, Gift, Leaf, Wheat } from 'lucide-react';
import { motion } from 'framer-motion';
import type { LoyaltyCard as Card } from '../lib/types';
export const brandIcons = { coffee: Coffee, bread: Wheat, leaf: Leaf };
export function BrandIcon({ icon, size = 22 }: { icon: Card['icon']; size?: number }) {
  const Icon = brandIcons[icon];
  return <Icon size={size} strokeWidth={1.6} />;
}
export function StampGrid({ card }: { card: Card }) {
  return (
    <div
      className={`stamp-grid ${card.goal <= 5 ? 'single-row' : ''}`}
      style={{
        gridTemplateColumns: `repeat(${card.goal <= 5 ? card.goal : card.goal <= 6 ? 3 : 4}, 1fr)`,
      }}
      aria-label={`${card.stamps} de ${card.goal} sellos`}
    >
      {Array.from({ length: card.goal }, (_, i) => (
        <div
          key={i}
          className={`stamp ${i < card.stamps ? 'filled' : ''} ${i === card.goal - 1 ? 'gift-stamp' : ''}`}
        >
          {i === card.goal - 1 ? (
            <Gift size={21} strokeWidth={1.5} />
          ) : i < card.stamps ? (
            <BrandIcon icon={card.icon} size={22} />
          ) : (
            <span>{i + 1}</span>
          )}
        </div>
      ))}
    </div>
  );
}
export function LoyaltyCard({
  card,
  onClick,
  index = 0,
}: {
  card: Card;
  onClick: () => void;
  index?: number;
}) {
  const complete = card.stamps >= card.goal;
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.35 }}
      whileHover={{ y: -4 }}
      className={`loyalty-card ${card.theme}`}
      onClick={onClick}
      aria-label={`Ver tarjeta de ${card.name}, ${card.stamps} de ${card.goal} sellos`}
    >
      <div className="card-colored">
        <div className="card-watermark">
          <BrandIcon icon={card.icon} size={170} />
        </div>
        <div className="card-brand">
          <span className="brand-emblem">
            <>
              {card.logo ? (
                <img src={card.logo} alt="" className="card-logo" />
              ) : (
                <BrandIcon icon={card.icon} size={25} />
              )}
            </>
          </span>
          <div>
            <h3>{card.name}</h3>
            <span>{card.category.toUpperCase()}</span>
          </div>
          <ArrowUpRight size={19} className="card-arrow" />
        </div>
        <StampGrid card={card} />
        <div className="card-progress">
          <span>
            {complete ? (
              <>
                <Check size={13} /> ¡Tarjeta completa!
              </>
            ) : (
              <>
                <strong>{card.stamps}</strong> de {card.goal} sellos
              </>
            )}
          </span>
          <span>{complete ? 'Lo bueno ya llegó' : `Cada visita cuenta`}</span>
        </div>
      </div>
      <div className="card-bottom">
        <div className={`card-status ${complete ? 'complete' : ''}`}>
          {complete ? (
            <>
              <span className="status-dot" /> Recompensa disponible
            </>
          ) : (
            <>
              <Gift size={14} /> Te faltan {card.goal - card.stamps} sellos
            </>
          )}
        </div>
        <div className="card-reward">
          <span>{card.reward}</span>
          <ArrowUpRight size={17} />
        </div>
      </div>
    </motion.button>
  );
}
