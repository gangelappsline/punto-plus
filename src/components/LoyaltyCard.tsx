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
  Star,
  UtensilsCrossed,
  Wheat,
  type LucideIcon,
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { CSSProperties } from 'react';
import {
  loyaltyCardThemeColors,
  loyaltyCardThemeGroups,
  loyaltyCardThemeLabels,
} from '../lib/types';
import type { FoodBrandIcon, LoyaltyCard as Card, MenuFontFamily } from '../lib/types';
import { cn } from '../lib/utils';

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
  star: Star,
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
  { id: 'star', label: 'Estrella' },
];

/** Opciones de la paleta agrupadas por familia (marca, azules, verdes…). */
export const brandThemeOptions = loyaltyCardThemeGroups.map((group) => ({
  ...group,
  options: group.themes.map((id) => ({
    id,
    label: loyaltyCardThemeLabels[id],
    ...loyaltyCardThemeColors[id],
    swatch: loyaltyCardThemeColors[id].primaryColor,
  })),
}));

/** Lista plana de temas, útil para búsquedas y pruebas. */
export const brandThemeList = brandThemeOptions.flatMap((group) => group.options);

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

/**
 * Dónde se dibuja la tarjeta: en la cuadrícula del panel, dentro de un diálogo
 * (más grande y legible) o como vista previa del editor del negocio.
 */
export type LoyaltyCardVariant = 'grid' | 'dialog' | 'preview';

/**
 * Los colores del tema viven en el propio elemento como variables CSS: así los
 * tonos derivados (texto atenuado, borde de los sellos) se calculan con
 * `color-mix` y cualquier fondo personalizado mantiene el contraste.
 */
function cardThemeStyle(card: Card): CSSProperties {
  const base = loyaltyCardThemeColors[card.theme] ?? loyaltyCardThemeColors.forest;
  const background = card.primaryColor ?? base.primaryColor;
  const ink = card.textColor ?? base.textColor;
  const fill = card.secondaryColor ?? base.secondaryColor;
  return {
    '--card-bg': background,
    '--card-ink': ink,
    '--card-muted': card.textColor ?? `color-mix(in srgb, ${ink} 72%, ${background})`,
    '--stamp-fill': fill,
    '--stamp-border': 'color-mix(in srgb, var(--stamp-fill) 60%, transparent)',
    '--stamp-color': card.stampIconColor ?? base.stampIconColor ?? base.primaryColor,
  } as CSSProperties;
}

const frameClasses =
  'relative block w-full min-w-0 overflow-hidden rounded-[13px] border border-[#e2e9ef] bg-white text-left shadow-[0_3px_5px_#022f5302] transition-shadow hover:shadow-[0_8px_23px_#022f5310]';

const coloredClasses =
  'relative isolate overflow-hidden px-[22px] pt-[21px] pb-[13px] min-[1600px]:px-[26px] min-[1600px]:pt-6 min-[1600px]:pb-4 max-[1200px]:px-[15px] max-[1200px]:pt-[18px] max-[1200px]:pb-3 min-[769px]:max-[1000px]:p-[18px] max-[768px]:px-3 max-[768px]:pt-[17px] max-[768px]:pb-3 max-[540px]:px-6 max-[540px]:pt-[22px] max-[540px]:pb-[15px]';

const watermarkClasses =
  'absolute top-0 -right-7 -z-10 -rotate-[25deg] text-[color:var(--card-ink)] opacity-[0.035] [&_svg]:size-40 [&_svg]:[stroke-width:0.7]';

const brandRowClasses = 'flex items-center gap-[10px] max-[1200px]:gap-[6px] max-[540px]:gap-3';

const emblemClasses =
  'flex h-[39px] w-9 shrink-0 items-center justify-center rounded-full max-[1200px]:w-7 max-[768px]:hidden max-[540px]:flex max-[540px]:h-[38px] max-[540px]:w-[34px] [&_svg]:size-[25px] max-[1200px]:[&_svg]:size-[23px] max-[540px]:[&_svg]:size-[26px]';

const logoClasses = 'size-[35px] rounded-full bg-white object-contain p-[3px]';

const titleClasses =
  'font-[inherit] text-[15px] leading-[1.4] tracking-[-0.5px] font-[650] min-[1001px]:text-[17px] min-[1600px]:text-[18px] max-[1200px]:text-[13px] min-[769px]:max-[1000px]:text-[15px] max-[768px]:text-[12px] max-[540px]:text-[19px]';

/** Terracotta y Lavender usan un titular más grande y con otro peso. */
const titleVariants: Partial<Record<Card['theme'], string>> = {
  terracotta:
    'text-[19px] font-[400] tracking-[-0.4px] min-[1001px]:text-[21px] max-[1200px]:text-[17px] max-[768px]:text-[16px] max-[540px]:text-[23px]',
  lavender:
    'text-[17px] font-[500] tracking-[-0.75px] max-[1200px]:text-[15px] max-[768px]:text-[14px] max-[540px]:text-[21px]',
};

const categoryClasses =
  'mt-1 block text-[6.5px] tracking-[2px] opacity-70 max-[768px]:text-[5.5px] max-[768px]:tracking-[1.5px] max-[540px]:mt-[5px] max-[540px]:text-[7px] max-[540px]:tracking-[2px]';

const arrowClasses =
  'ml-auto translate-x-1 -translate-y-px self-start opacity-65 max-[1200px]:w-3.5 max-[540px]:size-[19px]';

const gridClasses =
  'mx-auto grid h-[122px] max-w-[259px] content-center justify-items-center gap-x-[13px] gap-y-3 px-2 pt-[15px] pb-2 min-[1600px]:h-[140px] max-[1200px]:gap-3 max-[1200px]:px-[2px] min-[769px]:max-[1000px]:max-w-[220px] max-[768px]:h-[112px] max-[768px]:gap-x-2 max-[768px]:gap-y-[11px] max-[540px]:h-[128px] max-[540px]:max-w-[260px] max-[540px]:gap-x-5 max-[540px]:gap-y-[13px] max-[540px]:px-[10px] max-[540px]:pt-4 max-[540px]:pb-2';

const singleRowClasses =
  'gap-[9px] px-0 max-[1200px]:gap-[7px] max-[768px]:gap-1.5 max-[540px]:gap-3.5';

const progressClasses =
  'mt-[5px] flex items-center justify-between text-[8px] text-[color:var(--card-muted)] min-[1001px]:text-[9px] min-[1600px]:text-[10px] max-[1200px]:text-[7px] max-[768px]:text-[8px] max-[540px]:mt-[10px] max-[540px]:text-[10px]';

const progressHintClasses =
  'text-[7px] opacity-75 min-[1001px]:text-[8px] max-[1200px]:text-[6px] max-[768px]:hidden max-[540px]:block max-[540px]:text-[8px]';

const bottomClasses =
  'border-t border-[#00000003] bg-white px-[17px] pt-[13px] pb-[14px] text-[#46617c] min-[1600px]:px-[22px] min-[1600px]:pt-[17px] min-[1600px]:pb-[17px] max-[1200px]:px-[13px] max-[1200px]:pt-3 max-[1200px]:pb-3 max-[768px]:px-[10px] max-[768px]:pt-3 max-[768px]:pb-3 max-[540px]:px-[22px] max-[540px]:pt-4 max-[540px]:pb-4';

const statusClasses =
  'mb-[7px] flex items-center gap-[5px] text-[8px] text-[#93a5b8] min-[1001px]:text-[9px] min-[1600px]:text-[10px] max-[768px]:text-[7px] max-[540px]:mb-2 max-[540px]:text-[10px] [&>svg]:size-3 [&>svg]:text-[#aeb9c4] max-[540px]:[&>svg]:size-3.5';

const statusCompleteClasses = 'text-[#1b7f86]';

const rewardClasses =
  'flex items-center justify-between gap-[3px] text-[9.5px] font-[550] min-[1001px]:text-[11px] min-[1600px]:text-[11px] max-[1200px]:text-[8.5px] max-[768px]:min-h-6 max-[768px]:text-[8px] max-[768px]:leading-[1.6] max-[540px]:min-h-0 max-[540px]:text-[12px] [&>svg]:w-3.5 [&>svg]:text-[#aeb9c4] max-[768px]:[&>svg]:w-3 max-[540px]:[&>svg]:size-4';

const stampBaseClasses =
  'flex size-[35px] items-center justify-center rounded-full border-[1.5px] border-dashed border-[color:var(--stamp-border)] text-[10px] text-[color:var(--card-muted)] max-[1200px]:size-[30px] max-[768px]:size-[27px] max-[540px]:size-[36px] max-[540px]:text-[11px]';

const stampFilledClasses =
  'border border-solid border-[color:var(--stamp-fill)] bg-[var(--stamp-fill)] text-[color:var(--stamp-color)] outline-1 outline-dashed outline-[color:var(--stamp-fill)] outline-offset-2 shadow-[inset_0_0_0_3px_var(--card-bg),inset_0_0_0_4px_var(--stamp-fill)] [&>svg]:size-[19px] max-[1200px]:[&>svg]:size-[17px] max-[768px]:[&>svg]:size-[15px] max-[540px]:[&>svg]:size-[21px]';

/** En Lavender el sello del regalo se rellena con el color de marca. */
const lavenderGiftClasses =
  'border border-solid border-[#2399a0] bg-[#2399a0] text-white outline-1 outline-dashed outline-[color:var(--stamp-fill)] outline-offset-2 shadow-[inset_0_0_0_3px_var(--card-bg),inset_0_0_0_4px_var(--stamp-fill)]';

const giftClasses =
  'border-solid border-[color:var(--stamp-fill)] bg-transparent text-[color:var(--stamp-fill)] shadow-none outline-0';

const singleRowStampClasses =
  'max-[1200px]:size-[27px] max-[768px]:size-[24px] max-[540px]:size-[34px]';

const dialogOverrides: Record<string, string> = {
  frame: 'mx-auto max-w-[360px]',
  colored: 'px-[25px] pt-[23px] pb-4 max-[540px]:p-5',
  brandRow: 'max-[540px]:gap-2',
  emblem: 'max-[768px]:flex max-[540px]:w-[31px]',
  title: 'text-[18px] max-[540px]:text-[18px]',
  category: 'text-[8px]',
  grid: 'h-[141px] max-[540px]:h-[125px]',
  singleRow: 'max-[540px]:gap-3',
  bottom:
    'px-[22px] pt-[17px] pb-[17px] max-[540px]:px-[17px] max-[540px]:pt-[14px] max-[540px]:pb-[14px]',
  status: 'text-[10px]',
  reward: 'text-[12px] max-[540px]:text-[11px]',
  progress: 'text-[10px] max-[540px]:text-[9px]',
  progressHint: 'block text-[9px] max-[540px]:text-[7px]',
  stamp: 'size-[35px] max-[768px]:size-[35px] max-[540px]:size-[35px]',
};

const previewOverrides: Record<string, string> = {
  frame: 'mx-auto max-w-[360px]',
  emblem: 'max-[768px]:flex',
  title: 'max-[768px]:text-[14px] max-[540px]:text-[19px]',
  grid: 'max-[768px]:max-w-[190px] max-[540px]:max-w-[250px]',
};

function overridesFor(variant: LoyaltyCardVariant) {
  if (variant === 'dialog') return dialogOverrides;
  if (variant === 'preview') return previewOverrides;
  return {};
}

export function StampGrid({
  card,
  variant = 'grid',
}: {
  card: Card;
  variant?: LoyaltyCardVariant;
}) {
  const overrides = overridesFor(variant);
  const singleRow = card.goal <= 5;
  return (
    <div
      className={cn(
        gridClasses,
        overrides.grid,
        singleRow && singleRowClasses,
        overrides.singleRow,
      )}
      style={{
        gridTemplateColumns: `repeat(${singleRow ? card.goal : card.goal <= 6 ? 3 : 4}, 1fr)`,
      }}
      aria-label={`${card.stamps} de ${card.goal} sellos`}
      data-stamp-grid
    >
      {Array.from({ length: card.goal }, (_, i) => {
        const filled = i < card.stamps;
        const gift = i === card.goal - 1;
        return (
          <div
            key={i}
            className={cn(
              stampBaseClasses,
              filled && stampFilledClasses,
              filled && gift && giftClasses,
              filled && gift && card.theme === 'lavender' && lavenderGiftClasses,
              singleRow && singleRowStampClasses,
              overrides.stamp,
            )}
          >
            {gift ? (
              <Gift size={21} strokeWidth={1.5} />
            ) : filled ? (
              <BrandIcon icon={card.icon} size={22} />
            ) : (
              <span>{i + 1}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function LoyaltyCard({
  card,
  onClick,
  index = 0,
  variant = 'grid',
}: {
  card: Card;
  onClick: () => void;
  index?: number;
  variant?: LoyaltyCardVariant;
}) {
  const complete = card.stamps >= card.goal;
  const overrides = overridesFor(variant);
  const cardStyle = {
    ...cardThemeStyle(card),
    fontFamily: fontStack(card.fontFamily),
    ...(card.cardShape
      ? { borderRadius: { rounded: '13px', square: '4px', circle: '24px' }[card.cardShape] }
      : {}),
  } as CSSProperties;
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.35 }}
      whileHover={{ y: -4 }}
      className={cn(frameClasses, overrides.frame)}
      style={cardStyle}
      onClick={onClick}
      data-loyalty-card
      data-variant={variant}
      aria-label={`Ver tarjeta de ${card.name}, ${card.stamps} de ${card.goal} sellos`}
    >
      <div
        className={cn(
          coloredClasses,
          overrides.colored,
          'bg-[var(--card-bg)] text-[color:var(--card-ink)]',
        )}
      >
        <div className={watermarkClasses}>
          <BrandIcon icon={card.icon} size={170} />
        </div>
        <div className={cn(brandRowClasses, overrides.brandRow)}>
          <span className={cn(emblemClasses, overrides.emblem)}>
            {card.logo ? (
              <img src={card.logo} alt="" className={logoClasses} />
            ) : (
              <BrandIcon icon={card.icon} size={25} />
            )}
          </span>
          <div>
            <h3
              className={cn(titleClasses, titleVariants[card.theme], overrides.title)}
              data-card-title
            >
              {card.name}
            </h3>
            <span className={cn(categoryClasses, overrides.category)}>
              {card.category.toUpperCase()}
            </span>
          </div>
          <ArrowUpRight size={19} className={arrowClasses} />
        </div>
        <StampGrid card={card} variant={variant} />
        <div className={cn(progressClasses, overrides.progress)}>
          <span className="flex items-center gap-[3px]">
            {complete ? (
              <>
                <Check size={13} /> ¡Tarjeta completa!
              </>
            ) : (
              <>
                <strong className="font-[650] text-[color:var(--card-ink)]">{card.stamps}</strong>{' '}
                de {card.goal} sellos
              </>
            )}
          </span>
          <span className={cn(progressHintClasses, overrides.progressHint)}>
            {complete ? 'Lo bueno ya llegó' : 'Cada visita cuenta'}
          </span>
        </div>
      </div>
      <div className={cn(bottomClasses, overrides.bottom)}>
        <div className={cn(statusClasses, complete && statusCompleteClasses, overrides.status)}>
          {complete ? (
            <>
              <span className="size-[5px] rounded-full bg-brand" /> Recompensa disponible
            </>
          ) : (
            <>
              <Gift size={14} /> Te faltan {card.goal - card.stamps} sellos
            </>
          )}
        </div>
        <div className={cn(rewardClasses, overrides.reward)}>
          <span>{card.reward}</span>
          <ArrowUpRight size={17} />
        </div>
      </div>
    </motion.button>
  );
}
