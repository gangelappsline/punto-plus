import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, type PromotionInput } from '../services/api';
import type {
  AdminBusinessInput,
  AdminCategoryInput,
  BusinessConfig,
  BusinessQRConfiguration,
} from './types';
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
  publicCategories: ['public-categories'] as const,
  adminCategories: ['admin-categories'] as const,
  adminBusinesses: ['admin-businesses'] as const,
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

export function useAdminCategories() {
  return useQuery({ queryKey: queryKeys.adminCategories, queryFn: api.adminCategories });
}

export function useAdminBusinesses() {
  return useQuery({ queryKey: queryKeys.adminBusinesses, queryFn: api.adminBusinesses });
}

export function useBusiness() {
  return useQuery({ queryKey: queryKeys.business, queryFn: api.business });
}

export function usePublicCategories() {
  return useQuery({ queryKey: queryKeys.publicCategories, queryFn: api.publicCategories });
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
  return useAction(api.saveBusiness, 'La configuración de tu negocio se guardó', onSuccess);
}

/** Persiste solo la configuración QR, sin volver a enviar el perfil completo del negocio. */
export function useSaveBusinessQRConfiguration() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: api.saveBusinessQRConfiguration,
    onSuccess: (_result, settings: BusinessQRConfiguration) => {
      client.setQueryData<BusinessConfig>(queryKeys.business, (current) =>
        current
          ? {
              ...current,
              qrContent: settings.content,
              qrForeground: settings.foreground,
              qrBackground: settings.background,
              qrEyeColor: settings.eyeColor,
              qrLogo: settings.logo,
              qrBodyStyle: settings.bodyStyle,
              qrEyeFrameStyle: settings.eyeFrameStyle,
              qrEyeStyle: settings.eyeStyle,
              qrSize: settings.size,
            }
          : current,
      );
      toast.success('La configuración del QR se guardó.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

/** Guarda el borrador de Mi menú sin invalidar el resto del panel ni interrumpir el asistente. */
export function useSaveBusinessDraft() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: api.saveBusinessStep,
    onSuccess: (_result, input) => {
      client.setQueryData(queryKeys.business, input.config);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useAddPromotion(onSuccess?: () => void) {
  return useAction(api.addPromotion, 'Promoción publicada', onSuccess);
}

export function useCreateAdminCategory(onSuccess?: () => void) {
  return useAction(api.createAdminCategory, 'Categoría creada', onSuccess);
}

export function useUpdateAdminCategory(onSuccess?: () => void) {
  return useAction(
    ({ id, ...input }: { id: string } & AdminCategoryInput) => api.updateAdminCategory(id, input),
    'Categoría actualizada',
    onSuccess,
  );
}

export function useDeleteAdminCategory(onSuccess?: () => void) {
  return useAction(api.deleteAdminCategory, 'Categoría eliminada', onSuccess);
}

export function useCreateAdminBusiness(onSuccess?: () => void) {
  return useAction<AdminBusinessInput>(api.createAdminBusiness, 'Negocio creado', onSuccess);
}

export function useUpdateAdminBusiness(onSuccess?: () => void) {
  return useAction(
    ({ id, ...input }: { id: string } & AdminBusinessInput) => api.updateAdminBusiness(id, input),
    'Negocio actualizado',
    onSuccess,
  );
}

export function useDeleteAdminBusiness(onSuccess?: () => void) {
  return useAction(api.deleteAdminBusiness, 'Negocio eliminado', onSuccess);
}

export function useStamp(onSuccess?: () => void) {
  return useAction(api.stamp, '¡Compra registrada! Tu cliente tiene un sello más.', onSuccess);
}

/**
 * Publica el perfil completo del negocio desde el asistente de alta: guarda la
 * configuración (logo, banner, categorías, menú y colores) y crea la promoción
 * de bienvenida en una sola operación. Al invalidar la caché, la guarda de
 * `/business/negocio` deja de mostrar el asistente sin necesidad de recargar.
 */
export function usePublishBusiness(onSuccess?: () => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({
      config,
      promotion,
    }: {
      config: BusinessConfig;
      promotion?: PromotionInput;
    }) => {
      await api.saveBusiness(config);
      if (promotion) await api.addPromotion(promotion);
      return config;
    },
    onSuccess: async () => {
      await client.invalidateQueries();
      toast.success('¡Tu negocio está listo! Menú, QR y promoción publicados.');
      onSuccess?.();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}
