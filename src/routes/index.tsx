import { createFileRoute } from '@tanstack/react-router'
import { HomePage } from '@/components/HomePage'
import { catalogQuery } from '@/lib/catalog-query'

export interface HomeSearchParams {
  search?: string
  collection?: string
  network?: string
  minPrice?: string
  maxPrice?: string
  tab?: 'all' | 'new' | 'trending'
  sort?: 'recent' | 'price_asc' | 'price_desc'
  page?: number
}

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): HomeSearchParams => {
    return {
      search: typeof search.search === 'string' && search.search ? search.search : undefined,
      collection: typeof search.collection === 'string' && search.collection ? search.collection : undefined,
      network: typeof search.network === 'string' && search.network ? search.network : undefined,
      minPrice: typeof search.minPrice === 'string' && search.minPrice ? search.minPrice : undefined,
      maxPrice: typeof search.maxPrice === 'string' && search.maxPrice ? search.maxPrice : undefined,
      tab: (search.tab as 'all' | 'new' | 'trending') || 'all',
      sort: (search.sort as 'recent' | 'price_asc' | 'price_desc') || 'recent',
      page: Number(search.page) > 0 ? Number(search.page) : 1,
    }
  },
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => { void context.queryClient.prefetchQuery(catalogQuery(deps)) },
  component: HomePage,
})

