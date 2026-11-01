import {
  Apple,
  ArrowUpRight,
  Bean,
  Beef,
  CakeSlice,
  Candy,
  Check,
  Cherry,
  Coffee,
  Cookie,
  Croissant,
  CupSoda,
  Fish,
  Gift,
  GlassWater,
  IceCreamCone,
  Leaf,
  Milk,
  Pizza,
  Popcorn,
  Salad,
  Sandwich,
  Soup,
  UtensilsCrossed,
  Wheat,
  type LucideIcon,
} from 'lucide-react';
import { motion } from 'framer-motion';
import type {
  FoodBrandIcon,
  LoyaltyCard as Card,
  LoyaltyCardTheme,
  MenuFontFamily,
} from '../lib/types';

export const brandIcons: Record<FoodBrandIcon, LucideIcon> = {
  coffee: Coffee,
  bread: Wheat,
  leaf: Leaf,
  pizza: Pizza,
  cake: CakeSlice,
  'ice-cream': IceCreamCone,
  soup: Soup,
  fish: Fish,
  salad: Salad,
  burger: Beef,
  milk: Milk,
  soda: CupSoda,
  apple: Apple,
  cookie: Cookie,
  taco: Sandwich,
  croissant: Croissant,
  popcorn: Popcorn,
  cherry: Cherry,
  candy: Candy,
  utensils: UtensilsCrossed,
  glass: GlassWater,
  bean: Bean,
};

export const brandIconOptions: { id: FoodBrandIcon; label: string }[] = [
  { id: 'coffee', label: 'Café' },
  { id: 'bread', label: 'Pan' },
  { id: 'croissant', label: 'Croissant' },
  { id: 'pizza', label: 'Pizza' },
  { id: 'burger', label: 'Hamburguesa' },
  { id: 'taco', label: 'Taco' },
  { id: 'soup', label: 'Sopa' },
  { id: 'fish', label: 'Pescado' },
  { id: 'salad', label: 'Ensalada' },
  { id: 'ice-cream', label: 'Helado' },
  { id: 'cake', label: 'Pastel' },
  { id: 'cookie', label: 'Galleta' },
  { id: 'candy', label: 'Dulce' },
  { id: 'popcorn', label: 'Palomitas' },
  { id: 'soda', label: 'Refresco' },
  { id: 'glass', label: 'Bebida' },
  { id: 'milk', label: 'Leche' },
  { id: 'apple', label: 'Manzana' },
  { id: 'cherry', label: 'Cereza' },
  { id: 'bean', label: 'Grano' },
  { id: 'leaf', label: 'Vegano' },
  { id: 'utensils', label: 'Restaurante' },
];

export const brandThemeOptions: {
  id: LoyaltyCardTheme;
  label: string;
  swatch: string;
}[] = [
  { id: 'forest', label: 'Bosque', swatch: '#254865' },
  { id: 'terracotta', label: 'Terracota', swatch: '#f5be8b' },
  { id: 'lavender', label: 'Lavanda', swatch: '#d9e6f2' },
  { id: 'ocean', label: 'Océano', swatch: '#187f87' },
  { id: 'matcha', label: 'Matcha', swatch: '#67845b' },
  { id: 'citrus', label: 'Cítrico', swatch: '#e9c85d' },
  { id: 'berry', label: 'Frutos rojos', swatch: '#80536f' },
  { id: 'rose', label: 'Rosa', swatch: '#e7a6b3' },
  { id: 'chocolate', label: 'Cacao', swatch: '#76533f' },
  { id: 'sunset', label: 'Atardecer', swatch: '#e78c62' },
  { id: 'sky', label: 'Cielo', swatch: '#82b8d0' },
  { id: 'midnight', label: 'Medianoche', swatch: '#39416c' },
];

export const fontOptions: { id: MenuFontFamily; label: string; sample: string }[] = [
  { id: 'dm-sans', label: 'DM Sans', sample: 'Moderna' },
  { id: 'manrope', label: 'Manrope', sample: 'Geométrica' },
  { id: 'outfit', label: 'Outfit', sample: 'Actual' },
  { id: 'nunito', label: 'Nunito', sample: 'Amigable' },
  { id: 'lora', label: 'Lora', sample: 'Editorial' },
  { id: 'serif', label: 'Serif', sample: 'Clásica' },
];

export function fontStack(font: MenuFontFamily = 'dm-sans') {
  const stacks: Record<MenuFontFamily, string> = {
    'dm-sans': "'DM Sans Variable', 'DM Sans', sans-serif",
    manrope: "'Manrope Variable', 'Manrope', sans-serif",
    outfit: "'Outfit Variable', 'Outfit', sans-serif",
    nunito: "'Nunito Variable', 'Nunito', sans-serif",
    lora: "'Lora Variable', 'Lora', Georgia, serif",
    serif: "Georgia, 'Times New Roman', serif",
  };
  return stacks[font];
}

export function BrandIcon({ icon, size = 22 }: { icon: FoodBrandIcon; size?: number }) {
  const Icon = brandIcons[icon] ?? Coffee;
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
      style={{ fontFamily: fontStack(card.fontFamily) }}
      onClick={onClick}
      aria-label={`Ver tarjeta de ${card.name}, ${card.stamps} de ${card.goal} sellos`}
    >
      <div className="card-colored">
        <div className="card-watermark">
          <BrandIcon icon={card.icon} size={170} />
        </div>
        <div className="card-brand">
          <span className="brand-emblem">
            {card.logo ? (
              <img src={card.logo} alt="" className="card-logo" />
            ) : (
              <BrandIcon icon={card.icon} size={25} />
            )}
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
          <span>{complete ? 'Lo bueno ya llegó' : 'Cada visita cuenta'}</span>
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
