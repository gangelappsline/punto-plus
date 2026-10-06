import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../services/api';
import { errorMessage } from './utils';
export function useLoyalty() {
  const cards = useQuery({ queryKey: ['cards'], queryFn: api.cards });
  const promotions = useQuery({ queryKey: ['promotions'], queryFn: api.promotions });
  const activity = useQuery({ queryKey: ['activity'], queryFn: api.activity });
  const favorites = useQuery({ queryKey: ['favorites'], queryFn: api.favorites });
  return { cards, promotions, activity, favorites };
}
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
