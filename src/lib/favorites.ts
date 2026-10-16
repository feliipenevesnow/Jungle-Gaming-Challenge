import { keys } from '@/lib/query-keys'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useActionNotice } from '@/components/ActionNotice'
import { api } from '@/lib/axios'
import { useAuth } from '@/lib/auth'
import type { NFT } from '@/types/api'

export function useFavorites() {
  const { user, isAuthenticated, openAuthModal } = useAuth()
  const client = useQueryClient()
  const showNotice = useActionNotice()
  const key = keys.favorites(user?.id)
  const query = useQuery({
    queryKey: key,
    queryFn: async ({ signal }) => (await api.get<NFT[]>('/favorites', { signal })).data,
    enabled: isAuthenticated,
  })
  const items = isAuthenticated ? query.data ?? [] : []
  const mutation = useMutation({
    mutationFn: async ({ nft, remove }: { nft: NFT; remove: boolean }) => {
      if (remove) await api.delete(`/favorites/${nft.id}`)
      else await api.post(`/favorites/${nft.id}`)
    },
    onMutate: async ({ nft, remove }) => {
      await client.cancelQueries({ queryKey: key })
      const previous = client.getQueryData<NFT[]>(key) ?? []
      client.setQueryData<NFT[]>(key, remove ? previous.filter(item => item.id !== nft.id) : [...previous, nft])
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context) client.setQueryData(key, context.previous)
      showNotice({ title: 'Não foi possível atualizar os favoritos', description: 'A alteração foi desfeita. Tente novamente.' })
    },
    onSettled: () => client.invalidateQueries({ queryKey: key }),
  })
  function toggleFavorite(nft: NFT) {
    if (!isAuthenticated) { openAuthModal('login'); return }
    if (!mutation.isPending) mutation.mutate({ nft, remove: items.some(item => item.id === nft.id) })
  }
  return { ...query, items, favoriteIds: items.map(item => item.id), toggleFavorite, isUpdating: mutation.isPending }
}
