import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { api } from './axios'
import { keys } from './query-keys'
import type { NFT, NFTListResponse, NFTSearchParams } from '@/types/api'

export function catalogQuery(input: NFTSearchParams) {
  const { search = '', collection = '', network = '', minPrice = '', maxPrice = '', tab = 'all', sort = 'recent', page = 1 } = input
  return queryOptions({
    placeholderData: keepPreviousData,
    queryKey: keys.nfts({ search, collection, network, minPrice, maxPrice, tab, sort, page }),
    queryFn: async ({ signal }) => (await api.get<NFTListResponse>('/nfts', { signal, params: {
      search: search || undefined, collection: collection || undefined, network: network || undefined,
      minPrice: minPrice || undefined, maxPrice: maxPrice || undefined, tab, sort, page, limit: 9,
    } })).data,
  })
}

export function nftQuery(id: string) {
  return queryOptions({ queryKey: keys.nft(id), queryFn: async ({ signal }) => (await api.get<NFT>(`/nfts/${id}`, { signal })).data })
}
