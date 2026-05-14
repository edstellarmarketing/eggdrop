import { GamePhase } from '@/lib/constants'

export interface Event {
  id: string
  name: string
  venue: string | null
  date: string | null
  drop_height_meters: number
  current_phase: GamePhase
  timer_duration_minutes: number
  timer_started_at: string | null
  timer_ends_at: string | null
  created_at: string
  updated_at: string
}

export interface Team {
  id: string
  event_id: string
  name: string
  color: string | null
  join_code: string | null
  budget_accepted_at: string | null
  status: 'active' | 'disqualified' | 'winner'
  created_at: string
  updated_at: string
}

export interface Resource {
  id: string
  event_id: string
  name: string
  category: 'cushioning' | 'structural' | 'drag' | 'adhesive' | 'wildcard' | null
  price_credits: number
  stock_total: number
  stock_remaining: number
  image_url: string | null
  created_at: string
  updated_at: string
}

export interface Wallet {
  team_id: string
  total_budget: number
  spent_amount: number
  remaining_balance: number
  updated_at: string
}

export interface Score {
  id: string
  event_id: string
  team_id: string
  egg_integrity_score: number
  shield_integrity_score: number
  innovation_score: number
  budget_efficiency_score: number
  bonus_points: number
  penalty_points: number
  total_score: number
  created_at: string
  updated_at: string
}
