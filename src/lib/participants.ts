export interface ParticipantRow {
  id: string
  team_id: string
  full_name: string
  designation: string | null
  email: string | null
  avatar_url: string | null
  role: string | null
  created_at: string
}

export interface ParticipantInput {
  full_name: string
  designation?: string | null
  email?: string | null
  avatar_url?: string | null
  role?: 'captain' | 'member' | null
}
