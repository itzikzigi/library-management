import { api } from './client'
import type { CatalogBook } from './books'

export type RecSectionKey =
  | 'because-you-liked'
  | 'similar-readers'
  | 'trending'
  | 'hidden-gems'

/** A book in a recommendation section — extends the catalog shape with score breakdown. */
export type RecBook = CatalogBook & {
  score: number
  contentScore: number
  cfScore: number | null
  why: string | null
}

export type RecSection = {
  key: RecSectionKey
  title: string
  subtitle: string
  items: RecBook[]
}

export type RecommendationsResponse = {
  profile: {
    ratingCount: number
    alpha: number
  }
  sections: RecSection[]
}

export async function getRecommendations(): Promise<RecommendationsResponse> {
  const { data } = await api.get<{ data: RecommendationsResponse }>('/recommendations')
  return data.data
}
