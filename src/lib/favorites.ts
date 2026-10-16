import { keys } from '@/lib/query-keys'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useActionNotice } from '@/components/ActionNotice'
import { api } from '@/lib/axios'
import { useAuth } from '@/lib/auth'
import { isCurrentSession } from '@/lib/session'
import { CanceledError } from 'axios'
import type { NFT } from '@/types/api'

interface FavoriteChange { nft: NFT; remove: boolean; sessionToken: string; userId: string }

export function useFavorites() {
  const { user, token, isAuthenticated, openAuthModal } = useAuth()
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
    mutationKey: [...key, token],
    mutationFn: async ({ nft, remove, sessionToken }: FavoriteChange) => {
      if (!isCurrentSession(sessionToken)) throw new CanceledError('A sessão mudou.')
      if (remove) await api.delete(`/favorites/${nft.id}`)
      else await api.post(`/favorites/${nft.id}`)
    },
    onMutate: async ({ nft, remove, sessionToken, userId }) => {
      const mutationKey = keys.favorites(userId)
      await client.cancelQueries({ queryKey: mutationKey })
      if (!isCurrentSession(sessionToken)) return
      const previous = client.getQueryData<NFT[]>(mutationKey) ?? []
      client.setQueryData<NFT[]>(mutationKey, remove ? previous.filter(item => item.id !== nft.id) : [...previous, nft])
      return { previous, key: mutationKey }
    },
    onError: (_error, variables, context) => {
      if (!isCurrentSession(variables.sessionToken)) return
      if (context) client.setQueryData(context.key, context.previous)
      showNotice({ title: 'Não foi possível atualizar os favoritos', description: 'A alteração foi desfeita. Tente novamente.' })
    },
    onSettled: (_data, _error, variables) => {
      if (isCurrentSession(variables.sessionToken)) return client.invalidateQueries({ queryKey: keys.favorites(variables.userId) })
    },
  })
  function toggleFavorite(nft: NFT) {
    if (!isAuthenticated || !user || !token) { openAuthModal('login'); return }
    if (!mutation.isPending) mutation.mutate({ nft, remove: items.some(item => item.id === nft.id), sessionToken: token, userId: user.id })
  }
  return { ...query, items, favoriteIds: items.map(item => item.id), toggleFavorite, isUpdating: mutation.isPending }
}
