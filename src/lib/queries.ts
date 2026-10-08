import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../services/api';
import { errorMessage, isDemo } from './utils';

/**
 * Todas las peticiones a la API pasan por TanStack Query. Este módulo es el
 * único lugar donde los componentes obtienen datos remotos: cada hook fija su
 * clave de caché, cuándo se ejecuta y qué se revalida al terminar.
 */
export const queryKeys = {
  cards: ['cards'] as const,
  promotions: ['promotions'] as const,
  activity: ['activity'] as const,
  favorites: ['favorites'] as const,
  qr: ['qr'] as const,
  business: ['business'] as const,
  businessPromotions: ['business-promotions'] as const,
};

/* ---------------------------------- consultas --------------------------------- */

export function useLoyalty() {
  const cards = useQuery({ queryKey: queryKeys.cards, queryFn: api.cards });
  const promotions = useQuery({ queryKey: queryKeys.promotions, queryFn: api.promotions });
  const activity = useQuery({ queryKey: queryKeys.activity, queryFn: api.activity });
  const favorites = useQuery({ queryKey: queryKeys.favorites, queryFn: api.favorites });
  return { cards, promotions, activity, favorites };
}

export function useCards() {
  return useQuery({ queryKey: queryKeys.cards, queryFn: api.cards });
}

export function usePromotions() {
  return useQuery({ queryKey: queryKeys.promotions, queryFn: api.promotions });
}

export function useActivity() {
  return useQuery({ queryKey: queryKeys.activity, queryFn: api.activity });
}

export function useFavorites() {
  return useQuery({ queryKey: queryKeys.favorites, queryFn: api.favorites });
}

/** QR personal del cliente. Solo se pide cuando el diálogo está abierto. */
export function useMyQR(enabled = true) {
  return useQuery({
    queryKey: queryKeys.qr,
    queryFn: api.qr,
    enabled,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
  });
}

export function useBusiness() {
  return useQuery({ queryKey: queryKeys.business, queryFn: api.business });
}

export function useBusinessPromotions() {
  return useQuery({
    queryKey: queryKeys.businessPromotions,
    queryFn: async () =>
      isDemo
        ? (await api.promotions()).filter((p) => p.businessId === 'b1')
        : api.businessPromotions(),
  });
}

/* --------------------------------- mutaciones --------------------------------- */

export function useAction<T>(
  fn: (input: T) => Promise<unknown>,
  success: string,
  onSuccess?: () => void,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      await client.invalidateQueries();
      toast.success(success);
      onSuccess?.();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useJoin(onSuccess?: () => void) {
  return useAction(api.join, '¡Un nuevo favorito! La tarjeta ya está en tu colección.', onSuccess);
}

export function useRedeem(onSuccess?: () => void) {
  return useAction(
    api.redeem,
    isDemo ? '¡Recompensa canjeada en la demostración!' : '¡Disfruta tu recompensa!',
    onSuccess,
  );
}

export function useToggleFavorite(onSuccess?: () => void) {
  return useAction(api.toggleFavorite, 'Tus favoritos se actualizaron', onSuccess);
}

export function useSaveBusiness(onSuccess?: () => void) {
  return useAction(api.saveBusiness, 'La tarjeta de tu negocio se guardó', onSuccess);
}

export function useAddPromotion(onSuccess?: () => void) {
  return useAction(api.addPromotion, 'Promoción publicada', onSuccess);
}

export function useStamp(onSuccess?: () => void) {
  return useAction(api.stamp, '¡Compra registrada! Tu cliente tiene un sello más.', onSuccess);
}
