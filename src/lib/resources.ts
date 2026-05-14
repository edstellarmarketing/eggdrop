export const RESOURCE_CATEGORIES = [
  'cushioning',
  'structural',
  'drag',
  'adhesive',
  'wildcard',
] as const

export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number]

export interface ResourceRow {
  id: string
  event_id: string
  name: string
  category: ResourceCategory | null
  price_credits: number
  stock_total: number
  stock_remaining: number
}

export interface ResourceInput {
  name: string
  category: ResourceCategory | null
  price_credits: number
  stock_total: number
}
